"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import type { VariantPrice } from "@/lib/catalog";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const MAX_QTY = 1000; // sama dengan batas di API /api/orders

export default function PurchasePanel({
  variantId,
  prices,
  stock = null,
}: {
  variantId: string;
  prices: VariantPrice[];
  /** null = tidak dilacak; angka = stok tersedia (hanya untuk mode satu brand) */
  stock?: number | null;
}) {
  const maxQty = stock === null ? MAX_QTY : Math.min(MAX_QTY, stock);
  const soldOut = stock === 0;
  const router = useRouter();
  // Satu brand → langsung terpilih. Lebih dari satu → pelanggan memilih sendiri.
  const [brandId, setBrandId] = useState(prices.length === 1 ? prices[0].brand_id : "");
  const [quantity, setQuantity] = useState(1);

  const selected = prices.find((p) => p.brand_id === brandId);

  if (prices.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-olive/20 bg-brand-cream p-6 text-center text-sm text-gray-600">
        Harga untuk pecahan ini belum tersedia. Silakan hubungi kami via WhatsApp.
      </div>
    );
  }

  const checkout = () => {
    if (!selected) return;
    const params = new URLSearchParams({ variantId, brandId: selected.brand_id, qty: String(quantity) });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {prices.length === 1 ? (
        // Satu brand (halaman detail brand): tampilkan ringkasan harga, tanpa pilihan.
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-brand-gold-light/40 p-4">
            <p className="text-xs text-gray-500">Harga beli</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">{formatRupiah(prices[0].harga_beli)}</p>
          </div>
          <div className="rounded-2xl bg-brand-deep/[0.06] p-4">
            <p className="text-xs text-gray-500">Harga buyback</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-brand-deep">{formatRupiah(prices[0].harga_buyback)}</p>
          </div>
        </div>
      ) : (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-gray-700">Pilih brand</legend>
          <div className="grid gap-2" role="radiogroup">
            {prices.map((p) => {
              const active = p.brand_id === brandId;
              return (
                <button
                  key={p.brand_id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBrandId(p.brand_id)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-3 py-3 sm:px-4 text-left transition ${
                    active ? "border-brand-deep bg-brand-deep/[0.04]" : "border-brand-olive/20 hover:border-brand-deep/40"
                  }`}
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        active ? "border-brand-deep bg-brand-deep text-white" : "border-brand-olive/40"
                      }`}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="font-semibold text-gray-900">{p.brands.name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block whitespace-nowrap font-semibold tabular-nums text-gray-900">{formatRupiah(p.harga_beli)}</span>
                    <span className="block whitespace-nowrap text-[11px] sm:text-xs tabular-nums text-gray-500">Buyback {formatRupiah(p.harga_buyback)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-gray-700" id="qty-label">
          Jumlah
        </span>
        <div className="flex items-center rounded-full border border-brand-olive/30 bg-white" aria-labelledby="qty-label">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition hover:bg-brand-cream disabled:opacity-40"
            aria-label="Kurangi jumlah"
          >
            <Minus size={16} />
          </button>
          <span className="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition hover:bg-brand-cream disabled:opacity-40"
            aria-label="Tambah jumlah"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {stock !== null && stock > 0 && stock <= 5 && (
        <p className="text-sm font-semibold text-amber-600">Stok tersisa {stock} keping</p>
      )}

      {soldOut && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="font-semibold text-red-700">Stok sedang habis</p>
          <p className="mt-1 text-sm text-red-600">Hubungi kami via WhatsApp untuk ketersediaan berikutnya.</p>
        </div>
      )}

      {selected && !soldOut && (
        <div className="rounded-2xl bg-brand-ink p-5 text-white">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-white/60">Total ({quantity} keping)</span>
            <span className="font-display text-2xl font-bold tabular-nums text-brand-gold-light">
              {formatRupiah(selected.harga_beli * quantity)}
            </span>
          </div>
          <button
            type="button"
            onClick={checkout}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gold py-4 font-semibold text-white shadow-lg shadow-brand-gold/25 transition hover:bg-brand-gold-dark"
          >
            Lanjut ke Checkout
            <ArrowRight size={18} className="transition group-hover:translate-x-1" />
          </button>
          <p className="mt-3 text-center text-xs text-white/50">Tanpa daftar akun · harga dikunci saat pesanan dibuat</p>
        </div>
      )}
    </div>
  );
}
