import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BusinessError } from "@/lib/db";
import { UUID_RE } from "@/lib/queries";
import { setBuybackStatus, TX_STATUSES, type TxStatus } from "@/lib/receipts";

// Admin: ubah status pengajuan buyback. Status 'completed' otomatis menerbitkan nota buyback.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { status, total_final } = (await req.json().catch(() => ({}))) as { status?: string; total_final?: unknown };
  let finalAmount: number | undefined;
  if (total_final !== undefined && total_final !== null && total_final !== "") {
    finalAmount = Number(total_final);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0 || finalAmount > 1e12) {
      return NextResponse.json({ error: "Nilai final tidak valid" }, { status: 400 });
    }
  }
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (!status || !TX_STATUSES.includes(status as TxStatus)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  try {
    const row = await setBuybackStatus(id, status as TxStatus, finalAmount);
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/admin/buyback/[id]", err);
    return NextResponse.json({ error: "Gagal update status" }, { status: 500 });
  }
}
