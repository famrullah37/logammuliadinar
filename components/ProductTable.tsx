"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { LandingPriceItem, PriceTableRow } from "@/lib/types";

const formatRupiah = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

const transformPriceItems = (items: LandingPriceItem[]) => {
  const rowsMap = new Map<string, PriceTableRow>();
  const brandSet = new Set<string>();

  for (const item of items) {
    const variant = item.product_variants;
    if (!variant) continue;

    const productName = variant.products?.name ?? "Produk";
    const typeName = variant.type_name;
    const weight = Number(variant.weight ?? 0);
    const variantId = item.variant_id;
    const rowKey = variantId;
    const brandName = item.brands?.name ?? "Tanpa Brand";

    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, { variantId, productName, typeName, weight, byBrand: {} });
    }

    brandSet.add(brandName);
    const row = rowsMap.get(rowKey)!;
    row.byBrand[brandName] = { harga_beli: item.harga_beli, harga_buyback: item.harga_buyback };
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) => a.weight - b.weight);
  const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b, "id-ID"));
  return { rows, brands };
};

export default function ProductTable() {
  const [rows, setRows] = useState<PriceTableRow[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceTable = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("prices")
          .select(`
            variant_id,
            harga_beli,
            harga_buyback,
            brands(name),
            product_variants(id, type_name, weight, products(name))
          `);

        if (fetchError) throw fetchError;

        const normalizedData = ((data ?? []) as unknown[]).map((item) => {
          const v = item as {
            variant_id: string;
            harga_beli: number;
            harga_buyback: number;
            brands: { name: string } | null;
            product_variants: {
              id: string;
              type_name: string;
              weight: number;
              products: { name: string } | null;
            } | null;
          };
          return {
            variant_id: v.variant_id,
            harga_beli: v.harga_beli,
            harga_buyback: v.harga_buyback,
            brands: v.brands,
            product_variants: v.product_variants,
          } satisfies LandingPriceItem;
        });

        const transformed = transformPriceItems(normalizedData);
        setRows(transformed.rows);
        setBrands(transformed.brands);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat harga");
      } finally {
        setLoading(false);
      }
    };

    fetchPriceTable();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          Pastikan tabel brands, product_variants, dan prices sudah tersedia di Supabase
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#908974]/30 shadow-sm bg-white">
      {loading ? (
        <div className="p-8 text-center bg-[#f7f4ed]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233]" />
          <p className="text-gray-600 mt-4">Memuat data harga...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center bg-[#f7f4ed]">
          <p className="text-gray-600">Belum ada data harga yang tersedia</p>
        </div>
      ) : (
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="px-4 py-4 bg-[#1c424f] text-white text-left font-bold text-sm sm:text-base border border-[#f7f4ed]"
              >
                Pecahan
              </th>
              {brands.map((brandName) => (
                <th
                  key={brandName}
                  colSpan={2}
                  className="px-4 py-3 bg-[#1c424f] text-white text-center font-bold text-sm sm:text-base border border-[#f7f4ed]"
                >
                  {brandName}
                </th>
              ))}
              <th
                rowSpan={2}
                className="px-4 py-4 bg-[#1c424f] text-white text-center font-bold text-sm sm:text-base border border-[#f7f4ed]"
              >
                Aksi
              </th>
            </tr>
            <tr>
              {brands.flatMap((brandName) => [
                <th
                  key={`${brandName}-beli`}
                  className="px-4 py-3 bg-[#ce9233] text-white text-center font-semibold text-sm border border-[#f7f4ed]"
                >
                  Harga Beli
                </th>,
                <th
                  key={`${brandName}-buyback`}
                  className="px-4 py-3 bg-[#ce9233] text-white text-center font-semibold text-sm border border-[#f7f4ed]"
                >
                  Buyback
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.variantId}>
                <td
                  className={`px-4 py-4 text-sm sm:text-base font-semibold text-gray-800 border border-[#f2ece0] ${
                    index % 2 === 0 ? "bg-white" : "bg-[#fcfaf6]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{row.productName}</span>
                    <span className="text-xs font-normal text-[#1c424f]">{row.typeName}</span>
                    <span className="text-xs text-gray-500">{row.weight.toLocaleString("id-ID")} gram</span>
                  </div>
                </td>
                {brands.flatMap((brandName) => {
                  const cell = row.byBrand[brandName];
                  return [
                    <td
                      key={`${row.variantId}-${brandName}-beli`}
                      className={`px-4 py-4 text-sm text-center font-semibold border border-[#f2ece0] ${
                        index % 2 === 0 ? "bg-[#f9f3e7] text-[#704f19]" : "bg-[#f4ead7] text-[#704f19]"
                      }`}
                    >
                      {formatRupiah(cell?.harga_beli)}
                    </td>,
                    <td
                      key={`${row.variantId}-${brandName}-buyback`}
                      className={`px-4 py-4 text-sm text-center font-semibold border border-[#f2ece0] ${
                        index % 2 === 0 ? "bg-[#eaf1f4] text-[#1c424f]" : "bg-[#dfecef] text-[#1c424f]"
                      }`}
                    >
                      {formatRupiah(cell?.harga_buyback)}
                    </td>,
                  ];
                })}
                <td
                  className={`px-4 py-4 text-center border border-[#f2ece0] ${
                    index % 2 === 0 ? "bg-white" : "bg-[#fcfaf6]"
                  }`}
                >
                  <Link
                    href={`/produk/${row.variantId}`}
                    className="inline-block bg-[#ce9233] hover:bg-[#b87f2d] text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Beli
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
