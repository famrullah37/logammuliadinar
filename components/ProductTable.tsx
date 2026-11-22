"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { isBarProduct } from "@/lib/product-shape";
import { effectiveSince, formatWib, PRICE_UPDATE_HOUR_WIB } from "@/lib/price-schedule";
import type { LandingPriceItem, PriceTableRow } from "@/lib/types";

const formatRupiah = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

/** Label ringkas berat untuk ikon, mis. 4.25 → "4,25g". */
const formatWeight = (w: number) => `${w.toLocaleString("id-ID", { maximumFractionDigits: 2 })}g`;

interface ProductGroup {
  productName: string;
  rows: PriceTableRow[];
  brands: string[];
}

/** Kelompokkan per produk (mis. "Dinar Emas", "Emas Batangan"); tiap grup punya daftar brand sendiri. */
const groupByProduct = (items: LandingPriceItem[]): ProductGroup[] => {
  const groups = new Map<string, { rows: Map<string, PriceTableRow>; brands: Set<string> }>();

  for (const item of items) {
    const variant = item.product_variants;
    if (!variant) continue;
    const productName = variant.products?.name ?? "Produk";
    const brandName = item.brands?.name ?? "Tanpa Brand";

    let g = groups.get(productName);
    if (!g) {
      g = { rows: new Map(), brands: new Set() };
      groups.set(productName, g);
    }
    let row = g.rows.get(item.variant_id);
    if (!row) {
      row = { variantId: item.variant_id, productName, typeName: variant.type_name, weight: Number(variant.weight ?? 0), byBrand: {} };
      g.rows.set(item.variant_id, row);
    }
    g.brands.add(brandName);
    row.byBrand[brandName] = { harga_beli: item.harga_beli, harga_buyback: item.harga_buyback, href: item.href, stock: item.stock };
  }

  return [...groups.entries()]
    .map(([productName, g]) => ({
      productName,
      rows: [...g.rows.values()].sort((a, b) => a.weight - b.weight),
      brands: [...g.brands].sort((a, b) => a.localeCompare(b, "id-ID")),
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, "id-ID"));
};

function WeightBadge({ weight, bar, size = "md" }: { weight: number; bar: boolean; size?: "md" | "lg" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-gold-light to-brand-gold font-bold text-brand-ink shadow-inner ${
        bar ? "rounded-md" : "rounded-full"
      } ${size === "lg" ? (bar ? "h-10 w-14 text-xs" : "h-12 w-12 text-xs") : bar ? "h-9 w-12 text-[11px]" : "h-11 w-11 text-[11px]"}`}
    >
      {formatWeight(weight)}
    </div>
  );
}

/** "Habis" bila stok 0, "Sisa N" bila ≤ 5; tidak tampil bila stok tidak dilacak/masih banyak. */
function StockLabel({ stock }: { stock?: number | null }) {
  if (stock === null || stock === undefined || stock > 5) return null;
  return stock === 0 ? (
    <span className="block text-[11px] font-semibold text-red-600">Habis</span>
  ) : (
    <span className="block text-[11px] font-semibold text-amber-600">Sisa {stock}</span>
  );
}

export default function ProductTable() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    api<LandingPriceItem[]>("/api/prices")
      .then((data) => {
        setGroups(groupByProduct(data));
        setUpdatedAt(data.reduce<string | null>((m, i) => (i.updated_at && (!m || i.updated_at > m) ? i.updated_at : m), null));
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat harga"))
      .finally(() => setLoading(false));
  }, []);

  const current = useMemo(() => groups.find((g) => g.productName === active) ?? groups[0], [groups, active]);

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-semibold text-red-700">Harga belum bisa dimuat</p>
        <p className="mt-1 text-sm text-red-600">{error}. Silakan muat ulang halaman beberapa saat lagi.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-brand-olive/20 bg-white p-6 shadow-sm" aria-busy="true">
        <span className="sr-only">Memuat data harga...</span>
        <div className="space-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-11 w-11 shrink-0 rounded-full bg-brand-cream animate-pulse" />
              <div className="h-4 flex-1 rounded-full bg-brand-cream animate-pulse" />
              <div className="hidden sm:block h-4 w-32 rounded-full bg-brand-cream animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-brand-olive/20 bg-white p-10 text-center shadow-sm">
        <p className="text-gray-600">Belum ada data harga yang tersedia.</p>
      </div>
    );
  }

  const bar = isBarProduct(current.productName);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      {groups.length > 1 ? (
        <div role="tablist" aria-label="Kategori produk" className="inline-flex flex-wrap gap-1 rounded-full bg-brand-cream p-1">
          {groups.map((g) => {
            const selected = g.productName === current.productName;
            return (
              <button
                key={g.productName}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(g.productName)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  selected ? "bg-brand-deep text-white shadow" : "text-brand-deep hover:bg-white"
                }`}
              >
                {g.productName}
              </button>
            );
          })}
        </div>
      ) : <span />}
      <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-brand-cream px-4 py-2 text-xs font-medium text-brand-deep">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Harga berlaku sejak {formatWib(effectiveSince(updatedAt))}
        <span className="text-brand-deep/60">· diperbarui setiap hari pukul {PRICE_UPDATE_HOUR_WIB}.00 WIB</span>
      </p>
      </div>

      {/* ── Desktop / tablet: harga beli, satu kolom per brand ── */}
      <div role="tabpanel" className="hidden md:block overflow-hidden rounded-3xl border border-brand-olive/20 bg-white shadow-xl shadow-brand-deep/5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-brand-deep text-white">
                <th scope="col" className="sticky left-0 z-10 bg-brand-deep px-6 py-4 text-left font-semibold">
                  {current.productName}
                </th>
                {current.brands.map((brandName) => (
                  <th key={brandName} scope="col" className="border-l border-white/10 px-4 py-4 text-center font-semibold whitespace-nowrap">
                    {brandName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-olive/10">
              {current.rows.map((row) => (
                <tr key={row.variantId} className="group transition-colors hover:bg-brand-cream/60">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white px-6 py-4 text-left font-normal transition-colors group-hover:bg-brand-cream"
                  >
                    <div className="flex items-center gap-4">
                      <WeightBadge weight={row.weight} bar={bar} />
                      <div>
                        <p className="whitespace-nowrap font-semibold text-gray-900">{row.typeName}</p>
                        <p className="text-xs text-gray-500">{row.weight.toLocaleString("id-ID")} gram</p>
                      </div>
                    </div>
                  </th>
                  {current.brands.map((brandName) => {
                    const cell = row.byBrand[brandName];
                    return (
                      <td key={brandName} className="border-l border-brand-olive/10 px-4 py-4 text-center whitespace-nowrap">
                        {cell?.href ? (
                          <>
                          <Link
                            href={cell.href}
                            title={`Detail & beli ${brandName} ${row.productName} ${row.typeName}`}
                            className="group/cell inline-flex rounded-xl px-3 py-1.5 transition hover:bg-brand-gold/10"
                          >
                            <span className={`font-semibold tabular-nums underline decoration-2 underline-offset-4 group-hover/cell:text-brand-deep group-hover/cell:decoration-brand-gold ${
                              cell.stock === 0 ? "text-gray-400 decoration-gray-300" : "text-gray-900 decoration-brand-gold/40"
                            }`}>
                              {formatRupiah(cell.harga_beli)}
                            </span>
                          </Link>
                          <StockLabel stock={cell.stock} />
                          </>
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

      {/* ── Mobile: kartu per pecahan, tiap brand bisa diketuk ── */}
      <ul className="md:hidden space-y-4">
        {current.rows.map((row) => (
          <li key={row.variantId} className="rounded-3xl border border-brand-olive/20 bg-white p-5 shadow-lg shadow-brand-deep/5">
            <div className="flex items-center gap-4">
              <WeightBadge weight={row.weight} bar={bar} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{row.productName} {row.typeName}</p>
                <p className="text-sm text-gray-500">{row.weight.toLocaleString("id-ID")} gram</p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-brand-olive/10 rounded-2xl bg-brand-cream/70">
              {current.brands
                .filter((b) => row.byBrand[b])
                .map((brandName) => {
                  const cell = row.byBrand[brandName];
                  const content = (
                    <>
                      <span className="text-sm font-medium text-gray-700">{brandName}</span>
                      <span className="flex items-center gap-2">
                        <StockLabel stock={cell.stock} />
                        <span className={`text-sm font-semibold tabular-nums ${cell.stock === 0 ? "text-gray-400" : "text-gray-900"}`}>{formatRupiah(cell.harga_beli)}</span>
                        <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
                      </span>
                    </>
                  );
                  return (
                    <li key={brandName}>
                      {cell.href ? (
                        <Link href={cell.href} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-brand-cream">
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between gap-3 px-4 py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
        <span>Klik harga untuk melihat detail produk dan membeli.</span>
        <Link href="/buyback" className="inline-flex items-center gap-1.5 font-semibold text-brand-deep hover:underline">
          Harga buyback &amp; jual kembali <ArrowRight size={14} />
        </Link>
      </p>
    </>
  );
}
