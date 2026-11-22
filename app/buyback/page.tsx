import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BuybackForm, { type BuybackOption } from "@/components/buyback/BuybackForm";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Harga Buyback Dinar Emas & Ajukan Jual Kembali",
  description:
    "Cek harga buyback dinar emas terkini dari berbagai brand dan ajukan jual kembali secara online. Harga dikunci saat pengajuan.",
  alternates: { canonical: "/buyback" },
};

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

type Props = { searchParams: Promise<{ brand?: string; pecahan?: string }> };

export default async function BuybackPage({ searchParams }: Props) {
  const { brand, pecahan } = await searchParams;

  let catalog: Awaited<ReturnType<typeof getCatalog>> = [];
  try {
    catalog = await getCatalog();
  } catch (err) {
    console.error("buyback: gagal memuat katalog", err);
  }

  // Satu tabel per produk (mis. Dinar Emas, Emas Batangan), masing-masing dengan brand-nya sendiri.
  const price = new Map(catalog.map((e) => [`${e.variant_id}:${e.brand_id}`, e]));
  const groups = [...new Set(catalog.map((e) => e.product_name))]
    .sort((a, b) => a.localeCompare(b, "id-ID"))
    .map((productName) => {
      const items = catalog.filter((e) => e.product_name === productName);
      return {
        productName,
        brands: [...new Map(items.map((e) => [e.brand_id, e])).values()].sort((a, b) =>
          a.brand_name.localeCompare(b.brand_name, "id-ID"),
        ),
        variants: [...new Map(items.map((e) => [e.variant_id, e])).values()].sort((a, b) => a.weight - b.weight),
      };
    });

  const options: BuybackOption[] = catalog.map((e) => ({
    brand_id: e.brand_id,
    brand_name: e.brand_name,
    variant_id: e.variant_id,
    variant_label: `${e.product_name} ${e.type_name}`,
    weight: e.weight,
    harga_buyback: e.harga_buyback,
  }));
  // Prefill dari link halaman produk: /buyback?brand=antam&pecahan=dinar-emas-1-dinar
  const pre = catalog.find((e) => e.brandSlug === brand && (!pecahan || e.variantSlug === pecahan));

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navbar solid />
      <main className="grow pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Buyback</p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-ink">
              Jual kembali dinar &amp; emas batangan Anda
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Cek harga buyback hari ini, lalu ajukan secara online. Admin kami menghubungi Anda untuk pengecekan barang,
              dan nota buyback diterbitkan saat transaksi selesai.
            </p>
          </div>

          {/* ── Tabel harga buyback, satu per produk ─────────────── */}
          <section className="mt-10 space-y-8" aria-label="Harga buyback per brand">
            {groups.length === 0 && (
              <p className="rounded-3xl bg-white p-8 text-center text-gray-600">Harga buyback belum tersedia.</p>
            )}
            {groups.map((g) => (
              <div key={g.productName}>
                <h2 className="mb-3 font-display text-xl font-bold text-brand-ink">{g.productName}</h2>
                <div className="overflow-hidden rounded-3xl border border-brand-olive/20 bg-white shadow-xl shadow-brand-deep/5">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-brand-deep text-white">
                          <th scope="col" className="sticky left-0 z-10 bg-brand-deep px-5 py-4 text-left font-semibold">Pecahan</th>
                          {g.brands.map((b) => (
                            <th key={b.brand_id} scope="col" className="border-l border-white/10 px-4 py-4 text-center font-semibold whitespace-nowrap">
                              {b.brand_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-olive/10">
                        {g.variants.map((v) => (
                          <tr key={v.variant_id} className="hover:bg-brand-cream/60">
                            <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-4 text-left font-normal">
                              <p className="whitespace-nowrap font-semibold text-gray-900">{v.type_name}</p>
                              <p className="text-xs text-gray-500">{v.weight.toLocaleString("id-ID")} gram</p>
                            </th>
                            {g.brands.map((b) => {
                              const e = price.get(`${v.variant_id}:${b.brand_id}`);
                              return (
                                <td key={b.brand_id} className="border-l border-brand-olive/10 px-4 py-4 text-center tabular-nums whitespace-nowrap">
                                  {e ? (
                                    <Link
                                      href={`/buyback?brand=${e.brandSlug}&pecahan=${e.variantSlug}#ajukan`}
                                      scroll={false}
                                      className="font-semibold text-brand-deep underline decoration-brand-deep/20 decoration-2 underline-offset-4 hover:decoration-brand-deep"
                                      title={`Ajukan buyback ${b.brand_name} ${v.product_name} ${v.type_name}`}
                                    >
                                      {formatRupiah(e.harga_buyback)}
                                    </Link>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">Klik harga untuk mengisi formulir di bawah secara otomatis.</p>
          </section>

          {/* ── Formulir ───────────────────────────────────────── */}
          <section id="ajukan" className="scroll-mt-28 mt-14 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-ink">Ajukan buyback</h2>
              <ol className="mt-6 space-y-5 text-sm text-gray-600">
                {[
                  ["Isi formulir", "Pilih brand, pecahan, jumlah, dan kelengkapan barang."],
                  ["Dihubungi admin", "Kami konfirmasi via WhatsApp dan atur jadwal pengecekan."],
                  ["Barang dicek", "Datang ke toko atau kirim barang. Nilai final ditetapkan setelah pengecekan."],
                  ["Dibayar + nota", "Dana dibayarkan dan nota buyback diterbitkan otomatis."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold text-brand-gold-light">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-semibold text-gray-900">{t}</span>
                      {d}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            {/* key: reset form saat prefill dari link berubah */}
            <BuybackForm
              key={`${pre?.brand_id ?? ""}:${pre?.variant_id ?? ""}`}
              options={options}
              initialBrandId={pre?.brand_id}
              initialVariantId={pecahan ? pre?.variant_id : undefined}
            />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
