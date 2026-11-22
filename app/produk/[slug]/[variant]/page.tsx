import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, MessageCircle, ShieldCheck, Weight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductImage from "@/components/product/ProductImage";
import { isBarProduct } from "@/lib/product-shape";
import PurchasePanel from "@/components/product/PurchasePanel";
import { getBrandProductPageData, type CatalogEntry } from "@/lib/catalog";
import { whatsappLink } from "@/lib/site";

// /produk/[slug]/[variant] → slug = brand (mis. "antam"), variant = pecahan (mis. "dinar-emas-1-4-dinar").
type Props = { params: Promise<{ slug: string; variant: string }> };

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://logammuliadinar.com";
const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const formatGram = (w: number) => `${w.toLocaleString("id-ID", { maximumFractionDigits: 4 })} gram`;
const titleOf = (e: CatalogEntry) => `${e.brand_name} ${e.product_name} ${e.type_name}`;

async function load(params: Props["params"]) {
  const { slug, variant } = await params;
  return getBrandProductPageData(slug, variant);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Produk tidak ditemukan", robots: { index: false } };
  const { entry: e } = data;
  const description =
    e.description?.slice(0, 155) ??
    `Beli ${titleOf(e)} ${formatGram(e.weight)} Au ${e.purity} seharga ${formatRupiah(e.harga_beli)}. Buyback ${formatRupiah(e.harga_buyback)}.`;
  return {
    title: `${titleOf(e)} ${formatGram(e.weight)} — ${formatRupiah(e.harga_beli)}`,
    description,
    alternates: { canonical: e.href },
    openGraph: {
      title: `${titleOf(e)} — ${formatGram(e.weight)}`,
      description,
      url: e.href,
      ...(e.image_url ? { images: [{ url: e.image_url }] } : {}),
    },
  };
}

export default async function BrandProductPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { entry: e, otherBrands, sameBrand } = data;
  const name = titleOf(e);
  const spread = e.harga_beli - e.harga_buyback;
  const spreadPct = e.harga_beli > 0 ? (spread / e.harga_beli) * 100 : 0;
  const bar = isBarProduct(e.product_name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    brand: { "@type": "Brand", name: e.brand_name },
    description: e.description ?? `${e.product_name} ${e.type_name} dari ${e.brand_name}, ${formatGram(e.weight)}, kadar Au ${e.purity}.`,
    ...(e.image_url ? { image: e.image_url.startsWith("/") ? `${BASE_URL}${e.image_url}` : e.image_url } : {}),
    weight: { "@type": "QuantitativeValue", value: e.weight, unitCode: "GRM" },
    offers: {
      "@type": "Offer",
      price: e.harga_beli,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}${e.href}`,
    },
  };

  const specs: [string, string][] = [
    ["Brand", e.brand_name],
    ["Produk", e.product_name],
    ["Pecahan", e.type_name],
    ["Berat", formatGram(e.weight)],
    ["Kadar emas", `Au ${e.purity}`],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Navbar solid />

      <main className="grow pt-24 sm:pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-deep">Beranda</Link>
            <ChevronRight size={14} />
            <Link href="/#produk" className="hover:text-brand-deep">Harga</Link>
            <ChevronRight size={14} />
            <span>{e.product_name} {e.type_name}</span>
            <ChevronRight size={14} />
            <span className="font-medium text-gray-800" aria-current="page">{e.brand_name}</span>
          </nav>

          {/* ── Ringkasan ─────────────────────────────────────────── */}
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="relative flex items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-ink via-brand-deep to-brand-ink p-10 sm:p-16 lg:min-h-[520px]">
              <div className="absolute inset-0 m-auto h-2/3 w-2/3 rounded-full bg-brand-gold/25 blur-3xl" aria-hidden="true" />
              <ProductImage
                src={e.image_url}
                alt={name}
                weight={e.weight}
                bar={bar}
                sizes="(min-width: 1024px) 400px, 70vw"
                className="relative w-full max-w-[220px] sm:max-w-[260px]"
              />
              <span className="absolute left-5 top-5 rounded-full bg-brand-gold px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                {e.brand_name}
              </span>
              <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <ShieldCheck size={14} className="text-brand-gold" /> Au {e.purity}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  <Weight size={14} className="text-brand-gold" /> {formatGram(e.weight)}
                </span>
              </div>
            </div>

            <div id="beli" className="scroll-mt-28 rounded-[2rem] border border-brand-olive/15 bg-white p-6 sm:p-8 shadow-xl shadow-brand-deep/5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{e.brand_name}</p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-ink">
                {e.product_name} {e.type_name}
              </h1>
              <p className="mt-3 text-gray-600">
                {formatGram(e.weight)} · Au {e.purity}
              </p>
              <div className="mt-6 border-t border-brand-olive/10 pt-6">
                <PurchasePanel
                  variantId={e.variant_id}
                  stock={e.stock}
                  prices={[
                    {
                      id: e.price_id,
                      brand_id: e.brand_id,
                      harga_beli: e.harga_beli,
                      harga_buyback: e.harga_buyback,
                      brands: { id: e.brand_id, name: e.brand_name },
                    },
                  ]}
                />
                <Link
                  href={`/buyback?brand=${e.brandSlug}&pecahan=${e.variantSlug}#ajukan`}
                  className="mt-4 flex items-center justify-center gap-2 rounded-full border border-brand-deep/20 py-3 text-sm font-semibold text-brand-deep transition hover:border-brand-deep hover:bg-brand-cream"
                >
                  Punya {e.brand_name} {e.type_name}? Jual kembali <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Detail ─────────────────────────────────────────────── */}
          <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="min-w-0 space-y-8">
              <section className="rounded-[2rem] border border-brand-olive/15 bg-white p-6 sm:p-8">
                <h2 className="font-display text-2xl font-bold text-brand-ink">Deskripsi</h2>
                <div className="mt-4 whitespace-pre-line leading-relaxed text-gray-600">
                  {e.description ??
                    `${name} adalah dinar emas dari ${e.brand_name} dengan berat ${formatGram(e.weight)} dan kadar Au ${e.purity}. ` +
                      "Cocok untuk tabungan, investasi jangka panjang, maupun hadiah."}
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-brand-cream p-4">
                    <dt className="text-gray-500">Selisih beli–buyback</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-gray-900">
                      {formatRupiah(spread)}{" "}
                      <span className="text-xs font-normal text-gray-500">
                        ({spreadPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)
                      </span>
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-brand-cream p-4">
                    <dt className="text-gray-500">Harga per gram</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-gray-900">
                      {formatRupiah(Math.round(e.harga_beli / e.weight))}
                    </dd>
                  </div>
                </dl>
              </section>

              {otherBrands.length > 0 && (
                <section className="rounded-[2rem] border border-brand-olive/15 bg-white p-6 sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-brand-ink">
                    {e.product_name} {e.type_name} tersedia juga dari
                  </h2>
                  <ul className="mt-4 divide-y divide-brand-olive/10">
                    {otherBrands
                      .slice()
                      .sort((a, b) => a.brand_name.localeCompare(b.brand_name, "id-ID"))
                      .map((o) => (
                        <li key={o.price_id}>
                          <Link href={o.href} className="group flex items-center justify-between gap-4 py-4">
                            <span className="font-semibold text-gray-900 group-hover:text-brand-deep">{o.brand_name}</span>
                            <ChevronRight size={18} className="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-deep" />
                          </Link>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="min-w-0 space-y-8">
              <section className="rounded-[2rem] border border-brand-olive/15 bg-white p-6 sm:p-8">
                <h2 className="font-display text-2xl font-bold text-brand-ink">Spesifikasi</h2>
                <dl className="mt-4 divide-y divide-brand-olive/10 text-sm">
                  {specs.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-3">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="text-right font-medium text-gray-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-[2rem] bg-brand-ink p-6 sm:p-8 text-white">
                <h2 className="font-semibold">Ada pertanyaan soal produk ini?</h2>
                <p className="mt-2 text-sm text-white/60">Tanyakan stok, pengiriman, atau buyback langsung ke tim kami.</p>
                <a
                  href={whatsappLink(`Assalamu'alaikum, saya ingin bertanya tentang ${name} (${formatGram(e.weight)}).`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gold py-3 font-semibold transition hover:bg-brand-gold-dark"
                >
                  <MessageCircle size={18} /> Chat WhatsApp
                </a>
              </section>
            </aside>
          </div>

          {/* ── Pecahan lain dari brand yang sama ─────────────────── */}
          {sameBrand.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-2xl font-bold text-brand-ink">Produk lain dari {e.brand_name}</h2>
              <ul className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {sameBrand.map((s) => (
                  <li key={s.price_id}>
                    <Link
                      href={s.href}
                      className="group block h-full rounded-3xl border border-brand-olive/15 bg-white p-5 text-center transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-deep/5"
                    >
                      <ProductImage
                        src={s.image_url}
                        alt={titleOf(s)}
                        weight={s.weight}
                        bar={isBarProduct(s.product_name)}
                        sizes="120px"
                        className="mx-auto w-20 sm:w-24 transition group-hover:scale-105"
                      />
                      <p className="mt-4 font-semibold text-gray-900">{s.type_name}</p>
                      <p className="text-xs text-gray-400">{s.product_name}</p>
                      <p className="text-xs text-gray-500">{formatGram(s.weight)}</p>
                      <p className="mt-2 whitespace-nowrap text-sm font-semibold tabular-nums text-brand-deep">
                        {formatRupiah(s.harga_beli)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
