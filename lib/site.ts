// Info kontak toko yang dipakai di beberapa komponen.
export const SITE = {
  name: "Logam Mulia Dinar",
  whatsappNumber: "6281233272733",
  whatsappDisplay: "+62 812-3327-2733",
  email: "Famrullah37@gmail.com",
} as const;

// Rekening tujuan transfer dikelola admin di menu Transaksi Toko (tabel bank_accounts).

export const whatsappLink = (text = "Assalamu'alaikum, saya ingin bertanya tentang dinar emas.") =>
  `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
