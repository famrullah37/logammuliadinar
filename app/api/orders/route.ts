import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { BusinessError, PG, pgErrorCode, withTransaction, type Tx } from "@/lib/db";
import { changeStock, lockPriceRow } from "@/lib/ledger";
import { UUID_RE } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, isValidPhone, LIMITS, normalizePhone, tooLong } from "@/lib/validate";
import type { CreateOrderPayload } from "@/lib/types";

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `LMD-${date}-${randomInt(1000, 10000)}`;
}

const MAX_INSERT_ATTEMPTS = 8;
const KODE_UNIK_MIN = 500;
const KODE_UNIK_MAX = 999;

/**
 * Kode unik transfer 500-999 yang belum dipakai pesanan transfer lain yang masih 'pending'.
 * Unique index parsial di DB tetap menjaga bila dua pesanan memilih kode sama bersamaan.
 * Mengembalikan null bila semua kode sedang terpakai.
 */
async function pickKodeUnik(tx: Tx): Promise<number | null> {
  const used = new Set(
    (await tx.query<{ kode_unik: number }>(
      "SELECT kode_unik FROM orders WHERE status = 'pending' AND kode_unik IS NOT NULL",
    )).map((r) => r.kode_unik),
  );
  const free: number[] = [];
  for (let k = KODE_UNIK_MIN; k <= KODE_UNIK_MAX; k++) if (!used.has(k)) free.push(k);
  return free.length ? free[randomInt(0, free.length)] : null;
}

// Publik (guest checkout): buat pesanan baru dengan snapshot harga saat ini.
export async function POST(req: NextRequest) {
  let body: CreateOrderPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { variant_id, brand_id, quantity, buyer_name, buyer_phone, delivery_method, payment_method } = body;
  if (!variant_id || !brand_id || !buyer_name?.trim() || !buyer_phone?.trim() || !delivery_method || !payment_method) {
    return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
  }
  if (!UUID_RE.test(variant_id) || !UUID_RE.test(brand_id)) {
    return NextResponse.json({ error: "Produk tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    return NextResponse.json({ error: "Jumlah harus bilangan bulat 1–1000" }, { status: 400 });
  }
  if (!["pickup", "delivery"].includes(delivery_method)) {
    return NextResponse.json({ error: "Metode pengiriman tidak valid" }, { status: 400 });
  }
  if (payment_method !== "transfer" && payment_method !== "cod") {
    return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 });
  }
  const isDelivery = delivery_method === "delivery";
  if (isDelivery && !body.delivery_address?.trim()) {
    return NextResponse.json({ error: "Alamat pengiriman wajib diisi" }, { status: 400 });
  }
  if (isDelivery && !body.delivery_city?.trim()) {
    return NextResponse.json({ error: "Kota tujuan wajib diisi" }, { status: 400 });
  }
  if (isDelivery && !/^\d{5}$/.test(body.delivery_postal_code?.trim() ?? "")) {
    return NextResponse.json({ error: "Kode pos harus 5 digit" }, { status: 400 });
  }
  if (!isValidPhone(buyer_phone)) {
    return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
  }
  if (body.buyer_email?.trim() && !isValidEmail(body.buyer_email.trim())) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  const lengthError = tooLong([
    ["Nama", buyer_name, LIMITS.name],
    ["Alamat", body.delivery_address, LIMITS.address],
    ["Kota", body.delivery_city, LIMITS.city],
    ["Kode pos", body.delivery_postal_code, LIMITS.postal],
    ["Catatan", body.notes, LIMITS.notes],
  ]);
  if (lengthError) return NextResponse.json({ error: lengthError }, { status: 400 });

  // Dihitung setelah validasi agar salah isi form tidak menghabiskan jatah.
  const limited = await rateLimit("order", req);
  if (limited) return limited;

  try {
    const order = await withTransaction(async (tx) => {
      // Kunci baris harga: snapshot harga + cek & potong stok tanpa balapan.
      const row = await lockPriceRow(tx, variant_id, brand_id);
      if (!row) throw new BusinessError("Harga tidak ditemukan untuk kombinasi produk dan brand ini", 404);
      if (row.stock !== null && row.stock < quantity) {
        throw new BusinessError(row.stock === 0 ? "Stok produk ini sedang habis" : `Stok tidak cukup (tersisa ${row.stock})`);
      }

      const totalHarga = row.harga_beli * quantity;
      const values = [
        variant_id,
        brand_id,
        quantity,
        row.harga_beli,
        totalHarga,
        buyer_name.trim(),
        normalizePhone(buyer_phone),
        body.buyer_email?.trim() || null,
        delivery_method,
        isDelivery ? body.delivery_address?.trim() || null : null,
        isDelivery ? body.delivery_city?.trim() || null : null,
        isDelivery ? body.delivery_postal_code?.trim() || null : null,
        payment_method,
        body.notes?.trim() || null,
      ];

      for (let attempt = 1; ; attempt++) {
        let kodeUnik: number | null = null;
        if (payment_method === "transfer") {
          kodeUnik = await pickKodeUnik(tx);
          if (kodeUnik === null) {
            throw new BusinessError("Antrean transfer sedang penuh. Silakan coba beberapa saat lagi atau pilih COD.", 503);
          }
        }
        await tx.query("SAVEPOINT insert_order");
        try {
          const created = await tx.queryOne<{ order_number: string }>(
            `INSERT INTO orders (
               order_number, variant_id, brand_id, quantity, harga_beli, total_harga,
               buyer_name, buyer_phone, buyer_email, delivery_method,
               delivery_address, delivery_city, delivery_postal_code, payment_method, notes,
               kode_unik, total_transfer
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             RETURNING id, order_number, total_harga, kode_unik, total_transfer, ongkir, total_bayar, payment_method, delivery_method, status`,
            [generateOrderNumber(), ...values, kodeUnik, kodeUnik === null ? null : totalHarga + kodeUnik],
          );
          await tx.query("RELEASE SAVEPOINT insert_order");
          await changeStock(tx, row, -quantity, "order", created!.order_number);
          return created;
        } catch (err) {
          await tx.query("ROLLBACK TO SAVEPOINT insert_order");
          // Nomor pesanan atau kode unik bentrok → pilih ulang keduanya.
          if (pgErrorCode(err) === PG.UNIQUE_VIOLATION && attempt < MAX_INSERT_ATTEMPTS) continue;
          throw err;
        }
      }
    });
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/orders", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
