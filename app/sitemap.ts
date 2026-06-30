import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://logammuliadinar.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, updated_at");

  const variantUrls: MetadataRoute.Sitemap = (variants ?? []).map(
    (v: { id: string; updated_at?: string }) => ({
      url: `${BASE_URL}/produk/${v.id}`,
      lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }),
  );

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...variantUrls,
  ];
}
