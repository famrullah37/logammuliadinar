import "server-only";
import { cache } from "react";
import { query, queryOne } from "./db";
import { UUID_RE } from "./queries";

// ── Slug ────────────────────────────────────────────────────────────
/** "Dinar Emas 1/4 Dinar" → "dinar-emas-1-4-dinar", "Koin Nusantara" → "koin-nusantara". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "produk";
}

/** Link halaman detail satu produk dari satu brand. */
export const brandProductHref = (brandSlug: string, variantSlug: string) => `/produk/${brandSlug}/${variantSlug}`;

// ── Indeks katalog: semua kombinasi brand × varian yang punya harga ──
export interface CatalogEntry {
  price_id: string;
  brand_id: string;
  brand_name: string;
  variant_id: string;
  product_name: string;
  type_name: string;
  weight: number;
  purity: string;
  harga_beli: number;
  harga_buyback: number;
  /** null = stok tidak dilacak (tidak dibatasi) */
  stock: number | null;
  /** gambar/deskripsi khusus brand, jatuh ke milik varian bila kosong */
  image_url: string | null;
  description: string | null;
  variant_image_url: string | null;
  brandSlug: string;
  variantSlug: string;
  href: string;
}

/** Beri slug unik; bila bentrok, tambahkan akhiran pembeda (stabil karena urutan data tetap). */
function uniqueSlugs<T extends { id: string; base: string; suffix: string }>(items: T[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.base, (counts.get(it.base) ?? 0) + 1);
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const it of items) {
    let slug = counts.get(it.base)! > 1 ? `${it.base}-${it.suffix}` : it.base;
    while (used.has(slug)) slug = `${slug}-${it.id.slice(0, 4)}`;
    used.add(slug);
    out.set(it.id, slug);
  }
  return out;
}

/** Satu query untuk seluruh katalog (kecil). cache() → sekali per request. */
export const getCatalog = cache(async (): Promise<CatalogEntry[]> => {
  const rows = await query<Omit<CatalogEntry, "brandSlug" | "variantSlug" | "href">>(
    `SELECT pr.id AS price_id, b.id AS brand_id, b.name AS brand_name,
            v.id AS variant_id, p.name AS product_name, v.type_name, v.weight, v.purity,
            pr.harga_beli, pr.harga_buyback, pr.stock,
            COALESCE(pr.image_url, v.image_url) AS image_url,
            COALESCE(pr.description, v.description) AS description,
            v.image_url AS variant_image_url
       FROM prices pr
       JOIN brands b ON b.id = pr.brand_id
       JOIN product_variants v ON v.id = pr.variant_id
       JOIN products p ON p.id = v.product_id
      ORDER BY b.name, b.id, v.weight, v.id`,
  );

  const brands = [...new Map(rows.map((r) => [r.brand_id, r])).values()];
  const brandSlugs = uniqueSlugs(brands.map((r) => ({ id: r.brand_id, base: slugify(r.brand_name), suffix: r.brand_id.slice(0, 4) })));
  const variants = [...new Map(rows.map((r) => [r.variant_id, r])).values()];
  const variantSlugs = uniqueSlugs(
    variants.map((r) => ({
      id: r.variant_id,
      base: slugify(`${r.product_name} ${r.type_name}`),
      suffix: `${String(r.weight).replace(".", "-")}g`,
    })),
  );

  return rows.map((r) => {
    const brandSlug = brandSlugs.get(r.brand_id)!;
    const variantSlug = variantSlugs.get(r.variant_id)!;
    return { ...r, brandSlug, variantSlug, href: brandProductHref(brandSlug, variantSlug) };
  });
});

// ── Halaman brand × varian ─────────────────────────────────────────
export interface BrandProductPageData {
  entry: CatalogEntry;
  /** brand lain untuk pecahan yang sama */
  otherBrands: CatalogEntry[];
  /** pecahan lain dari brand yang sama (urut berat) */
  sameBrand: CatalogEntry[];
}

export const getBrandProductPageData = cache(
  async (brandSlug: string, variantSlug: string): Promise<BrandProductPageData | null> => {
    const catalog = await getCatalog();
    const entry = catalog.find((e) => e.brandSlug === brandSlug && e.variantSlug === variantSlug);
    if (!entry) return null;
    return {
      entry,
      otherBrands: catalog
        .filter((e) => e.variant_id === entry.variant_id && e.brand_id !== entry.brand_id),
      sameBrand: catalog.filter((e) => e.brand_id === entry.brand_id && e.variant_id !== entry.variant_id),
    };
  },
);

// ── Halaman perbandingan per varian (/produk/[variantId]) ──────────
export interface VariantDetail {
  id: string;
  product_id: string;
  type_name: string;
  weight: number;
  purity: string;
  image_url: string | null;
  description: string | null;
  products: { name: string };
}

export interface VariantPrice {
  id: string;
  brand_id: string;
  harga_beli: number;
  harga_buyback: number;
  brands: { id: string; name: string };
  /** link ke halaman detail brand ini */
  href?: string;
}

export interface SiblingVariant {
  id: string;
  type_name: string;
  weight: number;
  image_url: string | null;
  min_harga_beli: number | null;
}

export interface VariantPageData {
  variant: VariantDetail;
  prices: VariantPrice[];
  siblings: SiblingVariant[];
}

/**
 * Detail varian + harga per brand + pecahan lain dari produk yang sama.
 * Dibungkus cache() agar generateMetadata dan page berbagi satu query per request.
 */
export const getVariantPageData = cache(async (id: string): Promise<VariantPageData | null> => {
  if (!UUID_RE.test(id)) return null;

  const variant = await queryOne<VariantDetail>(
    `SELECT v.id, v.product_id, v.type_name, v.weight, v.purity, v.image_url, v.description,
            json_build_object('name', p.name) AS products
       FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE v.id = $1`,
    [id],
  );
  if (!variant) return null;

  const [prices, siblings, catalog] = await Promise.all([
    query<VariantPrice>(
      `SELECT pr.id, pr.brand_id, pr.harga_beli, pr.harga_buyback,
              json_build_object('id', b.id, 'name', b.name) AS brands
         FROM prices pr JOIN brands b ON b.id = pr.brand_id
        WHERE pr.variant_id = $1
        ORDER BY pr.harga_beli, b.name`,
      [id],
    ),
    query<SiblingVariant>(
      `SELECT v.id, v.type_name, v.weight, v.image_url, MIN(pr.harga_beli) AS min_harga_beli
         FROM product_variants v LEFT JOIN prices pr ON pr.variant_id = v.id
        WHERE v.product_id = $1 AND v.id <> $2
        GROUP BY v.id
        ORDER BY v.weight`,
      [variant.product_id, id],
    ),
    getCatalog(),
  ]);

  const hrefByPrice = new Map(catalog.map((e) => [e.price_id, e.href]));
  return { variant, prices: prices.map((p) => ({ ...p, href: hrefByPrice.get(p.id) })), siblings };
});
