// Info kontak toko yang dipakai di beberapa komponen.
export const SITE = {
  name: "Logam Mulia Dinar",
  whatsappNumber: "6281233272733",
  whatsappDisplay: "+62 812-3327-2733",
  email: "Famrullah37@gmail.com",
} as const;

/**
 * Rekening tujuan transfer yang ditampilkan ke pembeli setelah checkout.
 * ISI SESUAI REKENING TOKO. Selama kosong, pembeli diberi tahu bahwa
 * nomor rekening dikirim admin via WhatsApp.
 */
export const BANK_ACCOUNTS: { bank: string; number: string; holder: string }[] = [
  // { bank: "BSI", number: "1234567890", holder: "Logam Mulia Dinar" },
];

export const whatsappLink = (text = "Assalamu'alaikum, saya ingin bertanya tentang dinar emas.") =>
  `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
