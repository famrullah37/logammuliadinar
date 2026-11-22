import "server-only";
import type { Tx } from "./db";

export const ZAKAT_NISAB_GRAM = 85;
export const ZAKAT_HAUL_RATE = 0.025; // tahun hijriah

export interface HaulInputs {
  harga_emas: number; // per gram, untuk nisab
  include_pending: boolean;
  kas_lain: number;
  piutang: number;
  utang: number;
}

/**
 * Kewajiban zakat perdagangan saat haul (rumus NU Online / Wahbah az-Zuhaili):
 * (persediaan dinilai harga jual + kas + piutang lancar − utang usaha) × 2,5%, bila ≥ nisab 85 g emas.
 * Dihitung di server dari data stok & kas yang sama dengan halaman kalkulator.
 */
export async function computeHaul(tx: Tx, input: HaulInputs) {
  const stok = await tx.queryOne<{ nilai: number }>(
    "SELECT COALESCE(SUM(stock * harga_beli), 0) AS nilai FROM prices WHERE stock > 0",
  );
  const pending = await tx.queryOne<{ nilai: number }>(
    `SELECT COALESCE(SUM(o.quantity * pr.harga_beli), 0) AS nilai
       FROM orders o JOIN prices pr ON pr.variant_id = o.variant_id AND pr.brand_id = o.brand_id
      WHERE o.status IN ('pending', 'confirmed') AND pr.stock IS NOT NULL`,
  );
  const kas = await tx.queryOne<{ saldo: number }>(
    "SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS saldo FROM cash_entries",
  );
  const hartaBersih =
    (stok?.nilai ?? 0) + (input.include_pending ? pending?.nilai ?? 0 : 0) + (kas?.saldo ?? 0)
    + input.kas_lain + input.piutang - input.utang;
  const nisab = input.harga_emas * ZAKAT_NISAB_GRAM;
  const wajib = input.harga_emas > 0 && hartaBersih >= nisab;
  return {
    harta_bersih: hartaBersih,
    nisab,
    wajib,
    kewajiban: wajib ? Math.round(hartaBersih * ZAKAT_HAUL_RATE) : 0,
  };
}

/** Total yang sudah dikeluarkan lebih awal (ta'jil) untuk periode haul tertentu. */
export async function paidEarly(tx: Tx, haulYear: number): Promise<number> {
  const r = await tx.queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM zakat_payouts WHERE kind = 'penyisihan' AND haul_year = $1",
    [haulYear],
  );
  return r?.total ?? 0;
}
