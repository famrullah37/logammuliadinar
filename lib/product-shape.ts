/** Produk berbentuk batangan (mis. "Emas Batangan", "Logam Mulia Batang") → ikon persegi, bukan koin. */
export const isBarProduct = (productName: string) => /batang|bar\b/i.test(productName);
