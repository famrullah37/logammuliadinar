"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CreateOrderPayload, DeliveryMethod, PaymentMethod } from "@/lib/types";

interface CheckoutSummary {
  productName: string;
  typeName: string;
  weight: number;
  brandName: string;
  harga_beli: number;
  quantity: number;
}

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId") ?? "";
  const brandId = searchParams.get("brandId") ?? "";
  const qty = Number(searchParams.get("qty") ?? "1");

  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    delivery_method: "pickup" as DeliveryMethod,
    delivery_address: "",
    delivery_city: "",
    delivery_postal_code: "",
    payment_method: "transfer" as PaymentMethod,
    notes: "",
  });

  useEffect(() => {
    if (!variantId || !brandId || !Number.isInteger(qty) || qty < 1) { router.replace("/"); return; }

    const fetchSummary = async () => {
      try {
        const { variant: v, prices } = await api<{
          variant: { type_name: string; weight: number; products: { name: string } | null };
          prices: { brand_id: string; harga_beli: number; brands: { name: string } | null }[];
        }>(`/api/variants/${encodeURIComponent(variantId)}`);
        const p = prices.find((x) => x.brand_id === brandId);
        if (!p) { router.replace("/"); return; }

        setSummary({
          productName: v.products?.name ?? "Produk",
          typeName: v.type_name,
          weight: v.weight,
          brandName: p.brands?.name ?? "—",
          harga_beli: p.harga_beli,
          quantity: qty,
        });
      } catch {
        router.replace("/");
      } finally {
        setLoadingData(false);
      }
    };
    fetchSummary();
  }, [variantId, brandId, qty, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;

    if (!form.buyer_name.trim()) { alert("Nama lengkap wajib diisi"); return; }
    if (!form.buyer_phone.trim()) { alert("Nomor telepon wajib diisi"); return; }
    if (form.delivery_method === "delivery" && !form.delivery_address.trim()) {
      alert("Alamat pengiriman wajib diisi"); return;
    }
    if (form.delivery_method === "delivery" && !form.delivery_city.trim()) {
      alert("Kota tujuan wajib diisi"); return;
    }
    if (form.delivery_method === "delivery" && !/^\d{5}$/.test(form.delivery_postal_code.trim())) {
      alert("Kode pos harus 5 digit"); return;
    }

    try {
      setSubmitting(true);
      const payload: CreateOrderPayload = {
        variant_id: variantId,
        brand_id: brandId,
        quantity: qty,
        buyer_name: form.buyer_name,
        buyer_phone: form.buyer_phone,
        buyer_email: form.buyer_email || undefined,
        delivery_method: form.delivery_method,
        delivery_address: form.delivery_method === "delivery" ? form.delivery_address : undefined,
        delivery_city: form.delivery_method === "delivery" ? form.delivery_city : undefined,
        delivery_postal_code: form.delivery_method === "delivery" ? form.delivery_postal_code : undefined,
        payment_method: form.payment_method,
        notes: form.notes || undefined,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat pesanan");

      router.push(`/checkout/sukses?no=${json.order.order_number}&phone=${encodeURIComponent(form.buyer_phone)}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#ce9233]" />
      </div>
    );
  }

  if (!summary) return null;

  const total = summary.harga_beli * summary.quantity;

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      {/* Nav */}
      <nav className="bg-white border-b border-[#908974]/30 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-[#1c424f]">Beranda</Link>
          <span className="text-gray-400">/</span>
          <Link href={`/produk/${variantId}?brand=${brandId}`} className="text-sm text-gray-500 hover:text-[#1c424f]">Produk</Link>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-800 font-medium">Checkout</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Ringkasan Pesanan */}
        <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ringkasan Pesanan</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">{summary.productName} — {summary.typeName}</p>
              <p className="text-sm text-gray-500">{summary.weight} gram · Brand: {summary.brandName}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatRupiah(summary.harga_beli)} × {summary.quantity}
              </p>
            </div>
            <p className="text-xl font-bold text-[#1c424f] whitespace-nowrap">{formatRupiah(total)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">Data Pembeli</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
              <input type="text" required value={form.buyer_name} onChange={(e) => set("buyer_name", e.target.value)}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Nama sesuai identitas" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor WhatsApp <span className="text-red-500">*</span></label>
              <input type="tel" required value={form.buyer_phone} onChange={(e) => set("buyer_phone", e.target.value)}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="08xxxxxxxxxx" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input type="email" value={form.buyer_email} onChange={(e) => set("buyer_email", e.target.value)}
              className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              placeholder="email@contoh.com" />
          </div>

          {/* Metode Pengiriman */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Metode Pengiriman <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(["pickup", "delivery"] as DeliveryMethod[]).map((method) => (
                <button key={method} type="button"
                  onClick={() => set("delivery_method", method)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                    form.delivery_method === method
                      ? "border-[#1c424f] bg-[#1c424f] text-white"
                      : "border-[#908974]/40 text-gray-700 hover:border-[#1c424f]"
                  }`}>
                  {method === "pickup" ? "Ambil Sendiri" : "Dikirim"}
                </button>
              ))}
            </div>
          </div>

          {/* Alamat (hanya jika delivery) */}
          {form.delivery_method === "delivery" && (
            <div className="space-y-3 border border-[#908974]/30 rounded-xl p-4 bg-[#f7f4ed]">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Alamat Lengkap <span className="text-red-500">*</span></label>
                <textarea required value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f] resize-none"
                  placeholder="Jl. Contoh No. 1, RT/RW, Kelurahan, Kecamatan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota <span className="text-red-500">*</span></label>
                  <input type="text" required maxLength={100} value={form.delivery_city} onChange={(e) => set("delivery_city", e.target.value)}
                    className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                    placeholder="Malang" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kode Pos <span className="text-red-500">*</span></label>
                  <input type="text" required inputMode="numeric" pattern="\d{5}" maxLength={5} title="5 digit angka" value={form.delivery_postal_code} onChange={(e) => set("delivery_postal_code", e.target.value)}
                    className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                    placeholder="65100" />
                </div>
              </div>
            </div>
          )}

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Metode Pembayaran <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(["transfer", "cod"] as PaymentMethod[]).map((method) => (
                <button key={method} type="button"
                  onClick={() => set("payment_method", method)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                    form.payment_method === method
                      ? "border-[#1c424f] bg-[#1c424f] text-white"
                      : "border-[#908974]/40 text-gray-700 hover:border-[#1c424f]"
                  }`}>
                  {method === "transfer" ? "Transfer Bank" : "COD"}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f] resize-none"
              placeholder="Catatan untuk penjual..." />
          </div>

          {/* Total & Submit */}
          <div className="border-t border-[#908974]/20 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Total Pembayaran</span>
              <span className="text-2xl font-bold text-[#1c424f]">{formatRupiah(total)}</span>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-[#ce9233] hover:bg-[#b87f2d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition shadow-lg">
              {submitting ? "Memproses..." : "Konfirmasi Pesanan"}
            </button>
            {form.delivery_method === "delivery" && (
              <p className="text-xs text-center text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Total di atas belum termasuk ongkos kirim. Ongkir akan dikonfirmasi admin via WhatsApp sebelum pembayaran.
              </p>
            )}
            {form.payment_method === "transfer" && (
              <p className="text-xs text-center text-[#b87f2d]">
                Untuk transfer, 3 digit kode unik (500–999) ditambahkan ke total agar pembayaran mudah dicocokkan.
              </p>
            )}
            <p className="text-xs text-center text-gray-400">
              Tidak perlu login · Admin akan menghubungi via WhatsApp
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#ce9233]" />
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar halaman bisa di-prerender.
export default function CheckoutPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CheckoutContent />
    </Suspense>
  );
}
