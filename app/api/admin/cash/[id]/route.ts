import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { UUID_RE } from "@/lib/queries";

// Admin: hapus entri kas MANUAL. Entri otomatis (penjualan/buyback/koreksi) tidak bisa dihapus.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  try {
    const row = await queryOne<{ source: string }>("SELECT source FROM cash_entries WHERE id = $1", [id]);
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    if (row.source !== "manual") {
      return NextResponse.json(
        { error: "Entri otomatis tidak bisa dihapus. Ubah status transaksinya untuk membuat koreksi." },
        { status: 409 },
      );
    }
    await queryOne("DELETE FROM cash_entries WHERE id = $1 AND source = 'manual'", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/cash/[id]", err);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
