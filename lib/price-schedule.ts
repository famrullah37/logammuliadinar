// Jadwal harga harian: harga diperbarui setiap hari pukul 10.00 WIB.
// Bila tidak ada perubahan, harga sebelumnya tetap berlaku untuk siklus berikutnya.

export const PRICE_UPDATE_HOUR_WIB = 10;
const WIB_OFFSET_HOURS = 7; // WIB = UTC+7, tanpa daylight saving

/** Awal siklus harga yang sedang berjalan: 10.00 WIB hari ini, atau kemarin bila sekarang belum pukul 10.00. */
export function currentCycleStart(now: Date = new Date()): Date {
  const wib = new Date(now.getTime() + WIB_OFFSET_HOURS * 3600_000);
  const start = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), PRICE_UPDATE_HOUR_WIB - WIB_OFFSET_HOURS);
  return new Date(start > now.getTime() ? start - 86_400_000 : start);
}

/** Sejak kapan harga saat ini berlaku: awal siklus berjalan, atau waktu perubahan terakhir bila lebih baru. */
export function effectiveSince(lastUpdate: string | null, now: Date = new Date()): Date {
  const cycle = currentCycleStart(now);
  if (!lastUpdate) return cycle;
  const updated = new Date(lastUpdate);
  return updated > cycle ? updated : cycle;
}

/** Apakah ada perubahan harga pada siklus berjalan (sejak 10.00 WIB terakhir). */
export function updatedThisCycle(lastUpdate: string | null, now: Date = new Date()): boolean {
  return !!lastUpdate && new Date(lastUpdate) >= currentCycleStart(now);
}

export const formatWib = (d: Date, withYear = true) =>
  `${d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`;
