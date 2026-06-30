"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Brand } from "@/lib/types";

interface VariantDetail {
  id: string;
  type_name: string;
  weight: number;
  products: { name: string } | null;
}

interface PriceOption {
  id: string;
  brand_id: string;
  harga_beli: number;
  harga_buyback: number;
  brands: Brand | null;
}

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

export default function ProdukDetailPage() {
  const params = useParams();
  const router = useRouter();
  const variantId = params.variantId as string;

  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [variantRes, pricesRes] = await Promise.all([
          supabase
            .from("product_variants")
            .select("id,type_name,weight,products(name)")
            .eq("id", variantId)
            .single(),
          supabase
            .from("prices")
            .select("id,brand_id,harga_beli,harga_buyback,brands(id,name)")
            .eq("variant_id", variantId),
        ]);

        if (variantRes.error) throw variantRes.error;
        if (pricesRes.error) throw pricesRes.error;

        setVariant(variantRes.data as VariantDetail);
        const opts = (pricesRes.data ?? []) as PriceOption[];
        setPriceOptions(opts);
        if (opts.length === 1) setSelectedBrandId(opts[0].brand_id);
      } catch {
        setError("Produk tidak ditemukan");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [variantId]);

  const selectedPrice = priceOptions.find((p) => p.brand_id === selectedBrandId);
  const totalHarga = selectedPrice ? selectedPrice.harga_beli * quantity : 0;

  const handleLanjutCheckout = () => {
    if (!selectedBrandId) return;
    const params = new URLSearchParams({
      variantId,
      brandId: selectedBrandId,
      qty: String(quantity),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#ce9233]" />
      </div>
    );
  }

  if (error || !variant) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-700 font-medium">{error ?? "Produk tidak ditemukan"}</p>
          <Link href="/" className="text-[#1c424f] hover:underline">← Kembali ke beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      {/* Nav */}
      <nav className="bg-white border-b border-[#908974]/30 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-[#1c424f] transition">Beranda</Link>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-800 font-medium">{variant.products?.name} — {variant.type_name}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-6 sm:p-8 space-y-6">

          {/* Judul produk */}
          <div>
            <p className="text-sm text-[#1c424f] font-semibold uppercase tracking-wide">{variant.products?.name}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              {variant.type_name}
            </h1>
            <p className="text-gray-500 mt-1">{variant.weight.toLocaleString("id-ID")} gram</p>
          </div>

          {/* Pilih Brand */}
          {priceOptions.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Brand</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {priceOptions.map((opt) => (
                  <button
                    key={opt.brand_id}
                    type="button"
                    onClick={() => setSelectedBrandId(opt.brand_id)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                      selectedBrandId === opt.brand_id
                        ? "border-[#1c424f] bg-[#1c424f] text-white"
                        : "border-[#908974]/40 text-gray-700 hover:border-[#1c424f]"
                    }`}
                  >
                    {opt.brands?.name ?? "—"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Harga */}
          {selectedPrice && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#f9f3e7] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Harga Beli</p>
                <p className="text-lg font-bold text-[#704f19]">{formatRupiah(selectedPrice.harga_beli)}</p>
              </div>
              <div className="bg-[#eaf1f4] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Harga Buyback</p>
                <p className="text-lg font-bold text-[#1c424f]">{formatRupiah(selectedPrice.harga_buyback)}</p>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl border border-[#908974]/40 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-[#f7f4ed] transition"
              >−</button>
              <span className="w-12 text-center text-lg font-bold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-xl border border-[#908974]/40 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-[#f7f4ed] transition"
              >+</button>
            </div>
          </div>

          {/* Total */}
          {selectedPrice && (
            <div className="bg-[#f7f4ed] rounded-xl px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Total Harga</span>
              <span className="text-xl font-bold text-[#1c424f]">{formatRupiah(totalHarga)}</span>
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleLanjutCheckout}
            disabled={!selectedBrandId}
            className="w-full bg-[#ce9233] hover:bg-[#b87f2d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition shadow-lg"
          >
            {!selectedBrandId ? "Pilih brand terlebih dahulu" : "Lanjut ke Checkout →"}
          </button>

          <p className="text-xs text-center text-gray-400">
            Tidak perlu daftar akun — langsung isi data dan konfirmasi pesanan
          </p>
        </div>
      </main>
    </div>
  );
}
