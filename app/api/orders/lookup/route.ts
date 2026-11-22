import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ORDER_SELECT } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/validate";

// Publik: cek status pesanan. Hanya mengembalikan data bila nomor pesanan
// DAN nomor telepon cocok. Telepon/email pembeli tidak ikut dikembalikan.
export async function POST(req: NextRequest) {
  const limited = await rateLimit("lookup", req);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { order_number?: string; phone?: string };
  const orderNumber = body.order_number?.trim().toUpperCase();
  const phone = normalizePhone(body.phone ?? "");
  if (!orderNumber || !phone) {
    return NextResponse.json({ error: "Nomor pesanan dan nomor telepon wajib diisi" }, { status: 400 });
  }

  try {
    const order = await queryOne<Record<string, unknown>>(
      `${ORDER_SELECT} WHERE o.order_number = $1 AND regexp_replace(o.buyer_phone, '\\D', '', 'g') = $2`,
      [orderNumber, phone],
    );
    if (!order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan. Pastikan nomor pesanan dan nomor telepon sudah benar." },
        { status: 404 },
      );
    }
    delete order.buyer_phone;
    delete order.buyer_email;
    // Token nota hanya dikirim bila nota sudah terbit (pemilik sudah terverifikasi via telepon).
    if (!order.invoice_number) delete order.receipt_token;
    return NextResponse.json(order);
  } catch (err) {
    console.error("POST /api/orders/lookup", err);
    return NextResponse.json({ error: "Terjadi kesalahan, coba lagi." }, { status: 500 });
  }
}
