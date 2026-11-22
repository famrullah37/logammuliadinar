import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://logammuliadinar.com";

// Dibuat saat request (bukan saat build) agar selalu mengikuti isi database
// dan build tidak membutuhkan koneksi DB.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  ];
  try {
    urls.push({ url: `${BASE_URL}/buyback`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 });
    const catalog = await getCatalog();
    // Halaman detail per brand × pecahan
    for (const e of catalog) {
      urls.push({ url: `${BASE_URL}${e.href}`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 });
    }
  } catch (err) {
    console.error("sitemap: gagal memuat katalog", err);
  }
  return urls;
}
