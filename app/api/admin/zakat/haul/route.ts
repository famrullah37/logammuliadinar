import { NextRequest, NextResponse } from "next/server";
import { BusinessError, PG, pgErrorCode, withTransaction } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addAutoCash } from "@/lib/ledger";
import { zakatPeriodYear } from "@/lib/hijri";
import { computeHaul, paidEarly } from "@/lib/zakat";

const amount = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 && n <= 1e13 ? n : NaN;
};

/**
 * Admin: bayar zakat haul (1 Ramadhan).
 * Kewajiban dihitung ulang di server; dibayar sebesar sisa kewajiban (kewajiban − cicilan ta'jil).
 * Semua tabungan yang belum dikeluarkan ditandai dikeluarkan; bila tabungan > sisa kewajiban,
 * kelebihannya dibawa ke haul berikutnya sebagai "sisa tabungan tahun lalu".
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = {
    harga_emas: amount(body.harga_emas),
    include_pending: body.include_pending !== false,
    kas_lain: amount(body.kas_lain),
    piutang: amount(body.piutang),
    utang: amount(body.utang),
  };
  if ([input.harga_emas, input.kas_lain, input.piutang, input.utang].some(Number.isNaN) || !(input.harga_emas > 0)) {
    return NextResponse.json({ error: "Data perhitungan tidak valid (harga emas wajib diisi)" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  const haulYear = zakatPeriodYear();

  try {
    const result = await withTransaction(async (tx) => {
      const exists = await tx.queryOne("SELECT id FROM zakat_payouts WHERE kind = 'haul' AND haul_year = $1", [haulYear]);
      if (exists) throw new BusinessError(`Zakat haul 1 Ramadhan ${haulYear} H sudah dibayar`);

      const calc = await computeHaul(tx, input);
      if (!calc.wajib) throw new BusinessError("Harta bersih belum mencapai nisab — tidak wajib zakat perdagangan. Tabungan tetap disimpan.", 400);

      const dibayar = await paidEarly(tx, haulYear);
      const sisaKewajiban = Math.max(0, calc.kewajiban - dibayar);
      const rows = await tx.query<{ id: string; amount: number }>(
        "SELECT id, amount FROM zakat_reserves WHERE payout_id IS NULL FOR UPDATE",
      );
      const tabungan = rows.reduce((s, r) => s + r.amount, 0);
      const sisaTabungan = Math.max(0, tabungan - sisaKewajiban);

      const payout = await tx.queryOne<{ id: string }>(
        `INSERT INTO zakat_payouts (kind, haul_year, amount, note, harta_bersih, nisab, kewajiban, dibayar_sebelumnya, tabungan, sisa_tabungan)
         VALUES ('haul', $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        // amount bisa 0 bila kewajiban sudah lunas lewat cicilan ta'jil (haul tetap tercatat selesai)
        [haulYear, sisaKewajiban, note, calc.harta_bersih, calc.nisab, calc.kewajiban, dibayar, tabungan, sisaTabungan],
      );

      if (rows.length) {
        await tx.query("UPDATE zakat_reserves SET payout_id = $1 WHERE id = ANY($2::uuid[])", [payout!.id, rows.map((r) => r.id)]);
      }
      if (sisaTabungan > 0) {
        await tx.query(
          `INSERT INTO zakat_reserves (kind, base_amount, amount) VALUES ('carryover', 0, $1)`,
          [sisaTabungan],
        );
      }
      await addAutoCash(
        tx, "out", sisaKewajiban, "zakat",
        `Zakat haul 1 Ramadhan ${haulYear} H (kewajiban ${calc.kewajiban.toLocaleString("id-ID")}${dibayar ? `, dicicil ${dibayar.toLocaleString("id-ID")}` : ""})${note ? ` — ${note}` : ""}`,
        `ZKT-HAUL-${haulYear}`,
      );
      return { haul_year: haulYear, ...calc, dibayar_sebelumnya: dibayar, dibayar_sekarang: sisaKewajiban, tabungan, sisa_tabungan: sisaTabungan };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (pgErrorCode(err) === PG.UNIQUE_VIOLATION) {
      return NextResponse.json({ error: `Zakat haul 1 Ramadhan ${haulYear} H sudah dibayar` }, { status: 409 });
    }
    console.error("POST /api/admin/zakat/haul", err);
    return NextResponse.json({ error: "Gagal membayar zakat haul" }, { status: 500 });
  }
}
