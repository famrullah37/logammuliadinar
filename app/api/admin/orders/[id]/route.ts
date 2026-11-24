import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { BusinessError, PG, pgErrorCode } from "@/lib/db";
import { UUID_RE } from "@/lib/queries";
import { setOrderStatus, TX_STATUSES, type TxStatus } from "@/lib/receipts";

// Admin: ubah status pesanan. Status 'completed' otomatis menerbitkan nota.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStaff();
  if (denied) return denied;

  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (!status || !TX_STATUSES.includes(status as TxStatus)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  try {
    const row = await setOrderStatus(id, status as TxStatus);
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (pgErrorCode(err) === PG.UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "Kode unik transfer pesanan ini sedang dipakai pesanan lain yang menunggu pembayaran" },
        { status: 409 },
      );
    }
    console.error("PATCH /api/admin/orders/[id]", err);
    return NextResponse.json({ error: "Gagal update status" }, { status: 500 });
  }
}
