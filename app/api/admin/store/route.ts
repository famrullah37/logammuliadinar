import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BusinessError } from "@/lib/db";
import { UUID_RE } from "@/lib/queries";
import { createStoreBuyback, createStoreSale } from "@/lib/store";
import { isValidEmail, isValidPhone, LIMITS, normalizePhone, tooLong } from "@/lib/validate";

interface StorePayload {
  kind?: string;
  price_id?: string;
  quantity?: unknown;
  unit_price?: unknown;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  payment_method?: string;
  bank?: string;
  account_number?: string;
  account_holder?: string;
  has_certificate?: boolean;
  has_packaging?: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

// Admin: transaksi langsung di toko (penjualan / buyback). Langsung selesai dan menerbitkan nota.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as StorePayload | null;
  if (!body) return bad("Body tidak valid");

  const kind = body.kind;
  if (kind !== "sale" && kind !== "buyback") return bad("Jenis transaksi tidak valid");
  if (!body.price_id || !UUID_RE.test(body.price_id)) return bad("Pilih produk");
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) return bad("Jumlah harus bilangan bulat 1–1000");
  const unitPrice = Number(body.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 1e11) return bad("Harga per keping tidak valid");

  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email);
  const notes = str(body.notes);
  if (!name) return bad("Nama pelanggan wajib diisi");
  if (phone && !isValidPhone(phone)) return bad("Nomor HP tidak valid");
  if (email && !isValidEmail(email)) return bad("Email tidak valid");

  const method = body.payment_method;
  if (method !== "cash" && method !== "transfer") return bad("Metode pembayaran tidak valid");

  const bank = str(body.bank);
  const accountNumber = str(body.account_number).replace(/[\s-]/g, "");
  const holder = str(body.account_holder);
  const needsAccount = kind === "buyback" && method === "transfer";
  if (needsAccount) {
    if (!bank || !accountNumber || !holder) return bad("Isi bank, nomor rekening, dan nama pemilik rekening penjual");
    if (!/^\d{5,30}$/.test(accountNumber)) return bad("Nomor rekening hanya angka (5–30 digit)");
  }
  const lengthError = tooLong([
    ["Nama", name, LIMITS.name],
    ["Catatan", notes, LIMITS.notes],
    ["Bank", bank, 50],
    ["Nama pemilik rekening", holder, LIMITS.name],
  ]);
  if (lengthError) return bad(lengthError);

  const customer = { name, phone: phone ? normalizePhone(phone) : null, email: email || null, notes: notes || null };
  try {
    const result =
      kind === "sale"
        ? await createStoreSale({ ...customer, priceId: body.price_id, quantity, unitPrice, paymentMethod: method })
        : await createStoreBuyback({
            ...customer,
            priceId: body.price_id,
            quantity,
            unitPrice,
            payoutMethod: method,
            bank: needsAccount ? { bank, number: accountNumber, holder } : null,
            hasCertificate: body.has_certificate === true,
            hasPackaging: body.has_packaging === true,
          });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/admin/store", err);
    return NextResponse.json({ error: "Gagal menyimpan transaksi" }, { status: 500 });
  }
}
