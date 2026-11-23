// Label tampilan yang dipakai bersama halaman publik, admin, dan nota.

export const PAYMENT_LABEL: Record<string, string> = {
  transfer: "Transfer bank",
  cod: "COD (bayar di tempat)",
  cash: "Tunai",
};

export const paymentLabel = (method: string) => PAYMENT_LABEL[method] ?? method;

/** 1234567890 → ******7890 (untuk nota yang linknya bisa diteruskan). */
export const maskAccount = (n: string) => {
  const d = n.replace(/\s/g, "");
  return d.length <= 4 ? d : `${"*".repeat(d.length - 4)}${d.slice(-4)}`;
};

/** Rekening penjual buyback dalam satu baris, mis. "BSI 1234567890 a.n. Ahmad". */
export const formatAccount = (bank: string, number: string, holder: string, mask = false) =>
  `${bank} ${mask ? maskAccount(number) : number} a.n. ${holder}`;
