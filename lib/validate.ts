// Validasi & normalisasi input publik (server-side).

/** "0812-3456 789" / "+62 812..." → hanya digit. Dipakai saat simpan & saat cek pesanan. */
export const normalizePhone = (raw: string) => raw.replace(/\D/g, "");

/** Nomor HP/WA Indonesia/internasional: 8–15 digit setelah dinormalkan. */
export const isValidPhone = (raw: string) => {
  const d = normalizePhone(raw);
  return d.length >= 8 && d.length <= 15;
};

export const isValidEmail = (raw: string) => raw.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

/** Batas panjang teks bebas. */
export const LIMITS = {
  name: 120,
  address: 500,
  city: 100,
  postal: 10,
  notes: 2000,
} as const;

/** Kembalikan pesan error pertama untuk field teks yang melebihi batas, atau null. */
export function tooLong(fields: [label: string, value: string | undefined | null, max: number][]): string | null {
  for (const [label, value, max] of fields) {
    if (value && value.length > max) return `${label} maksimal ${max} karakter`;
  }
  return null;
}
