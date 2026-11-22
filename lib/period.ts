// Periode laporan dalam zona waktu toko (WIB).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayJakarta(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
}

/** Ambil ?from=&to= (YYYY-MM-DD). Bawaan: awal bulan ini s.d. hari ini. Null bila tidak valid. */
export function parsePeriod(params: URLSearchParams): { from: string; to: string } | null {
  const today = todayJakarta();
  const from = params.get("from") || `${today.slice(0, 8)}01`;
  const to = params.get("to") || today;
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return null;
  if (from > to) return null;
  return { from, to };
}
