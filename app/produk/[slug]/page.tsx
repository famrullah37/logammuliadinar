import { notFound, redirect } from "next/navigation";
import { getCatalog } from "@/lib/catalog";

// Level ini dulu halaman perbandingan antar brand (/produk/<id varian>).
// Perbandingan sudah tidak ditampilkan; link lama diarahkan ke halaman produk per brand
// (/produk/[brandSlug]/[variantSlug]). ?brand=<id brand> memilih brand tujuan (dipakai checkout).
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ brand?: string }>;
};

export default async function LegacyVariantPage({ params, searchParams }: Props) {
  const [{ slug }, { brand }] = await Promise.all([params, searchParams]);
  const entries = (await getCatalog()).filter((e) => e.variant_id === slug);
  if (entries.length === 0) notFound();
  const target = entries.find((e) => e.brand_id === brand) ?? entries[0];
  redirect(target.href);
}
