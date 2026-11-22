// Tanggal hijriah (kalender Umm al-Qura via Intl) untuk haul zakat 1 Ramadhan.
// Catatan: awal Ramadhan di Indonesia ditetapkan Kemenag (sidang isbat) dan bisa
// berbeda ±1 hari dari kalender Umm al-Qura — tanggal di sini adalah perkiraan.

const DAY_MS = 86_400_000;
const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function hijri(date: Date): { year: number; month: number; day: number } {
  const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}

export const formatHijri = (date: Date) =>
  new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

/** Hari ini (WIB) adalah 1 Ramadhan? */
export const isRamadanFirst = (date: Date) => {
  const h = hijri(date);
  return h.month === 9 && h.day === 1;
};

/** Tanggal (Masehi) 1 Ramadhan berikutnya — atau hari ini bila hari ini 1 Ramadhan. */
export function nextHaul(now: Date = new Date()): Date {
  for (let i = 0; i <= 400; i++) {
    const d = new Date(now.getTime() + i * DAY_MS);
    if (isRamadanFirst(d)) return d;
  }
  throw new Error("1 Ramadhan tidak ditemukan dalam 400 hari");
}

/** Jumlah hari (kalender WIB) dari sekarang sampai tanggal haul. */
export function daysUntil(target: Date, now: Date = new Date()): number {
  const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return Math.round((Date.parse(ymd(target)) - Date.parse(ymd(now))) / DAY_MS);
}

/**
 * Tahun haul untuk pencatatan zakat = tahun hijriah berjalan.
 * Bulan 1–8: haul 1 Ramadhan tahun ini akan datang (zakat lebih awal = ta'jil);
 * bulan 9–12: haul 1 Ramadhan tahun ini sudah/baru lewat.
 */
export const haulYear = (now: Date = new Date()) => hijri(now).year;
