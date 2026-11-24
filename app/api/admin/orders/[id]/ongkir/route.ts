import { NextRequest, NextResponse } from "next/server";
import { BusinessError, withTransaction } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { UUID_RE } from "@/lib/queries";

/**
 * Admin: isi/ubah ongkos kirim pesanan 'delivery' (ongkir belum bisa dihitung otomatis).
 * Hanya selama pesanan belum selesai/batal, agar kas & nota tetap konsisten.
 * total_bayar dihitung database; total_transfer ikut disesuaikan untuk pesanan transfer.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStaff();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const { ongkir } = (await req.json().catch(() => ({}))) as { ongkir?: unknown };
  const value = Number(ongkir);
  if (ongkir === null || ongkir === undefined || ongkir === "" || !Number.isFinite(value) || value < 0 || value > 1e9) {
    return NextResponse.json({ error: "Nominal ongkir tidak valid" }, { status: 400 });
  }

  try {
    const row = await withTransaction(async (tx) => {
      const order = await tx.queryOne<{ status: string; delivery_method: string }>(
        "SELECT status, delivery_method FROM orders WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!order) throw new BusinessError("Tidak ditemukan", 404);
      if (order.delivery_method !== "delivery") throw new BusinessError("Pesanan ambil sendiri tidak memakai ongkir", 400);
      if (order.status === "completed" || order.status === "cancelled") {
        throw new BusinessError("Ongkir tidak bisa diubah setelah pesanan selesai atau dibatalkan");
      }
      return tx.queryOne(
        `UPDATE orders SET
           ongkir = $1,
           total_transfer = CASE WHEN kode_unik IS NOT NULL THEN total_harga + $1 + kode_unik ELSE NULL END
         WHERE id = $2
         RETURNING ongkir, total_bayar, total_transfer`,
        [value, id],
      );
    });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/admin/orders/[id]/ongkir", err);
    return NextResponse.json({ error: "Gagal menyimpan ongkir" }, { status: 500 });
  }
}
