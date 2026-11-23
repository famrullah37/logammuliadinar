"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Order } from "@/lib/types";
import { paymentLabel } from "@/lib/labels";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Dikonfirmasi",        color: "bg-blue-100 text-blue-800" },
  completed: { label: "Selesai",             color: "bg-green-100 text-green-800" },
  cancelled: { label: "Dibatalkan",          color: "bg-red-100 text-red-800" },
};

function PesananContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("no") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError("Nomor pesanan dan nomor telepon wajib diisi"); return;
    }
    try {
      setLoading(true); setError(null); setOrder(null); setSearched(false);

      const data = await api<Order>("/api/orders/lookup", {
        method: "POST",
        body: { order_number: orderNumber, phone },
      });
      setOrder(data);
      setSearched(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const pv = order?.product_variants as ({ type_name: string; weight: number; products: { name: string } | null }) | undefined;
  const status = order ? STATUS_LABEL[order.status] : null;

  return (
    <div className="min-h-screen bg-[#f7f4ed] px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-[#1c424f] transition">← Kembali ke beranda</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Cek Status Pesanan</h1>
          <p className="text-sm text-gray-500 mt-1">Masukkan nomor pesanan dan nomor telepon yang digunakan saat checkout</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor Pesanan</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f] font-mono"
              placeholder="LMD-20260601-1234"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              placeholder="08xxxxxxxxxx"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#1c424f] hover:bg-[#15323c] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition">
            {loading ? "Mencari..." : "Cek Pesanan"}
          </button>
        </form>

        {/* Hasil */}
        {searched && order && (
          <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 font-mono">{order.order_number}</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {pv?.products?.name} — {pv?.type_name}
                </p>
                <p className="text-sm text-gray-500">{pv?.weight} gram · {order.brands?.name}</p>
              </div>
              {status && (
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${status.color}`}>
                  {status.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[#f7f4ed] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Jumlah</p>
                <p className="font-semibold text-gray-900">{order.quantity} pcs</p>
              </div>
              <div className="bg-[#f7f4ed] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Total bayar</p>
                <p className="font-semibold text-[#1c424f]">{formatRupiah(order.total_bayar ?? order.total_harga)}</p>
                {order.delivery_method === "delivery" && (
                  <p className="text-[11px] text-gray-500">
                    {order.ongkir === null || order.ongkir === undefined
                      ? "ongkir menunggu konfirmasi admin"
                      : order.ongkir === 0 ? "gratis ongkir" : `termasuk ongkir ${formatRupiah(order.ongkir)}`}
                  </p>
                )}
                {order.kode_unik && <p className="text-[11px] text-gray-500">termasuk kode unik {order.kode_unik}</p>}
              </div>
              <div className="bg-[#f7f4ed] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Pengiriman</p>
                <p className="font-semibold text-gray-900">{order.delivery_method === "pickup" ? "Ambil Sendiri" : "Dikirim"}</p>
              </div>
              <div className="bg-[#f7f4ed] rounded-lg p-3">
                <p className="text-gray-500 text-xs">Pembayaran</p>
                <p className="font-semibold text-gray-900">{paymentLabel(order.payment_method)}</p>
              </div>
            </div>

            {order.delivery_method === "delivery" && order.delivery_address && (
              <div className="bg-[#f7f4ed] rounded-lg p-3 text-sm">
                <p className="text-gray-500 text-xs mb-1">Alamat Pengiriman</p>
                <p className="text-gray-800">{order.delivery_address}</p>
                {order.delivery_city && <p className="text-gray-600">{order.delivery_city} {order.delivery_postal_code}</p>}
              </div>
            )}

            {order.notes && (
              <div className="bg-[#f7f4ed] rounded-lg p-3 text-sm">
                <p className="text-gray-500 text-xs mb-1">Catatan</p>
                <p className="text-gray-800">{order.notes}</p>
              </div>
            )}

            {order.invoice_number && order.receipt_token && (
              <a
                href={`/nota/${order.receipt_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl bg-[#1c424f] px-4 py-3 text-white transition hover:bg-[#15323c]"
              >
                <span>
                  <span className="block text-xs text-white/60">Nota pembelian</span>
                  <span className="font-mono text-sm font-semibold">{order.invoice_number}</span>
                </span>
                <span className="text-sm font-semibold text-[#f3dfb8]">Lihat nota →</span>
              </a>
            )}

            <p className="text-xs text-gray-400 text-center">
              Dipesan pada {order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar halaman bisa di-prerender.
export default function PesananPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f4ed]" />}>
      <PesananContent />
    </Suspense>
  );
}
