import { NextRequest, NextResponse } from "next/server";
import { BusinessError, withTransaction } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addAutoCash } from "@/lib/ledger";
import { UUID_RE } from "@/lib/queries";
import { zakatPeriodYear } from "@/lib/hijri";

/**
 * Admin: keluarkan dana zakat lebih awal (ta'jil) dari tabungan penyisihan penjualan.
 * Dicatat sebagai cicilan kewajiban haul (1 Ramadhan) periode berjalan.
 * Penyisihan yang dipilih (atau semua yang belum dikeluarkan) ditandai sudah dikeluarkan,
 * dan jumlahnya dicatat sebagai kas keluar "Zakat" — semuanya dalam satu transaksi.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { reserve_ids?: unknown; note?: unknown };
  const ids = Array.isArray(body.reserve_ids) ? body.reserve_ids : null;
  if (ids && (ids.length === 0 || ids.length > 5000 || !ids.every((x) => typeof x === "string" && UUID_RE.test(x)))) {
    return NextResponse.json({ error: "Pilihan transaksi tidak valid" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;

  try {
    const result = await withTransaction(async (tx) => {
      const period = zakatPeriodYear();
      const haulPaid = await tx.queryOne("SELECT id FROM zakat_payouts WHERE kind = 'haul' AND haul_year = $1", [period]);
      if (haulPaid) {
        throw new BusinessError(`Zakat haul 1 Ramadhan ${period} H sudah dibayar. Pengeluaran lebih awal untuk haul berikutnya bisa dimulai 1 Syawal.`);
      }
      const rows = await tx.query<{ id: string; amount: number }>(
        ids
          ? "SELECT id, amount FROM zakat_reserves WHERE payout_id IS NULL AND id = ANY($1::uuid[]) FOR UPDATE"
          : "SELECT id, amount FROM zakat_reserves WHERE payout_id IS NULL FOR UPDATE",
        ids ? [ids] : [],
      );
      if (ids && rows.length !== ids.length) {
        throw new BusinessError("Sebagian transaksi sudah dikeluarkan atau tidak ditemukan. Muat ulang halaman.");
      }
      const total = rows.reduce((s, r) => s + r.amount, 0);
      if (rows.length === 0 || total <= 0) throw new BusinessError("Tidak ada dana zakat yang bisa dikeluarkan", 400);

      const payout = await tx.queryOne<{ id: string; paid_date: string }>(
        `INSERT INTO zakat_payouts (kind, haul_year, amount, note) VALUES ('penyisihan', $1, $2, $3)
         RETURNING id, to_char(paid_date, 'YYYY-MM-DD') AS paid_date`,
        [zakatPeriodYear(), total, note],
      );
      await tx.query("UPDATE zakat_reserves SET payout_id = $1 WHERE id = ANY($2::uuid[])", [payout!.id, rows.map((r) => r.id)]);
      await addAutoCash(
        tx, "out", total, "zakat",
        `Zakat lebih awal (ta'jil) untuk haul 1 Ramadhan ${zakatPeriodYear()} H — ${rows.length} transaksi${note ? ` — ${note}` : ""}`,
        `ZKT-${payout!.id.slice(0, 8)}`,
      );
      return { payout_id: payout!.id, paid_date: payout!.paid_date, amount: total, count: rows.length };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/admin/zakat/payout", err);
    return NextResponse.json({ error: "Gagal mengeluarkan zakat" }, { status: 500 });
  }
}
