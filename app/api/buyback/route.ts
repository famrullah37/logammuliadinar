import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { PG, pgErrorCode, queryOne } from "@/lib/db";
import { UUID_RE } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, isValidPhone, LIMITS, normalizePhone, tooLong } from "@/lib/validate";

interface BuybackPayload {
  variant_id?: string;
  brand_id?: string;
  quantity?: number;
  seller_name?: string;
  seller_phone?: string;
  seller_email?: string;
  has_certificate?: boolean;
  has_packaging?: boolean;
  handover_method?: string;
  notes?: string;
  seller_bank?: string;
  seller_account_number?: string;
  seller_account_holder?: string;
}

function generateRequestNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `BB-${date}-${randomInt(1000, 10000)}`;
}

const MAX_ATTEMPTS = 5;

// Publik: pelanggan mengajukan buyback. Harga buyback di-snapshot saat pengajuan;
// nilai final ditentukan admin setelah barang dicek.
export async function POST(req: NextRequest) {
  let body: BuybackPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { variant_id, brand_id, quantity, handover_method } = body;
  const seller_name = body.seller_name?.trim();
  const seller_phone = body.seller_phone?.trim();
  if (!variant_id || !brand_id || !seller_name || !seller_phone || !handover_method) {
    return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
  }
  if (!UUID_RE.test(variant_id) || !UUID_RE.test(brand_id)) {
    return NextResponse.json({ error: "Produk tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > 1000) {
    return NextResponse.json({ error: "Jumlah harus bilangan bulat 1–1000" }, { status: 400 });
  }
  if (!["store", "shipping"].includes(handover_method)) {
    return NextResponse.json({ error: "Cara serah tidak valid" }, { status: 400 });
  }
  if (!isValidPhone(seller_phone)) {
    return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
  }
  if (body.seller_email?.trim() && !isValidEmail(body.seller_email.trim())) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  // Rekening penjual (opsional): diisi lengkap atau dikosongkan semua.
  const bank = body.seller_bank?.trim() ?? "";
  const accountNumber = (body.seller_account_number ?? "").replace(/[\s-]/g, "");
  const holder = body.seller_account_holder?.trim() ?? "";
  const anyAccount = !!(bank || accountNumber || holder);
  if (anyAccount && (!bank || !accountNumber || !holder)) {
    return NextResponse.json({ error: "Lengkapi bank, nomor rekening, dan nama pemilik rekening (atau kosongkan semua)" }, { status: 400 });
  }
  if (anyAccount && !/^\d{5,30}$/.test(accountNumber)) {
    return NextResponse.json({ error: "Nomor rekening hanya angka (5–30 digit)" }, { status: 400 });
  }
  const lengthError = tooLong([
    ["Nama", seller_name, LIMITS.name],
    ["Catatan", body.notes, LIMITS.notes],
    ["Bank", bank, 50],
    ["Nama pemilik rekening", holder, LIMITS.name],
  ]);
  if (lengthError) return NextResponse.json({ error: lengthError }, { status: 400 });

  // Dihitung setelah validasi agar salah isi form tidak menghabiskan jatah.
  const limited = await rateLimit("buyback", req);
  if (limited) return limited;

  try {
    const price = await queryOne<{ harga_buyback: number }>(
      "SELECT harga_buyback FROM prices WHERE variant_id = $1 AND brand_id = $2",
      [variant_id, brand_id],
    );
    if (!price) {
      return NextResponse.json({ error: "Harga buyback untuk brand dan pecahan ini belum tersedia" }, { status: 404 });
    }

    const values = [
      variant_id,
      brand_id,
      quantity,
      price.harga_buyback,
      price.harga_buyback * quantity!,
      seller_name,
      normalizePhone(seller_phone),
      body.seller_email?.trim() || null,
      body.has_certificate === true,
      body.has_packaging === true,
      handover_method,
      body.notes?.trim() || null,
      anyAccount ? "transfer" : null,
      anyAccount ? bank : null,
      anyAccount ? accountNumber : null,
      anyAccount ? holder : null,
    ];

    for (let attempt = 1; ; attempt++) {
      try {
        const request = await queryOne(
          `INSERT INTO buyback_requests (
             request_number, variant_id, brand_id, quantity, harga_buyback, total_estimasi,
             seller_name, seller_phone, seller_email, has_certificate, has_packaging,
             handover_method, notes, payout_method, seller_bank, seller_account_number, seller_account_holder
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           RETURNING request_number, harga_buyback, total_estimasi, quantity, status`,
          [generateRequestNumber(), ...values],
        );
        return NextResponse.json({ success: true, request }, { status: 201 });
      } catch (err) {
        if (pgErrorCode(err) === PG.UNIQUE_VIOLATION && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }
  } catch (err) {
    console.error("POST /api/buyback", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
