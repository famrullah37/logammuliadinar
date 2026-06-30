"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/lib/types";
import toast from "react-hot-toast";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: "pending",   label: "Menunggu",    color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Selesai",      color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Dibatalkan",   color: "bg-red-100 text-red-800" },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, quantity, harga_beli, total_harga,
          buyer_name, buyer_phone, buyer_email,
          delivery_method, delivery_address, delivery_city, delivery_postal_code,
          payment_method, notes, status, created_at,
          product_variants(type_name, weight, products(name)),
          brands(name)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data ?? []) as unknown as Order[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }
        await fetchOrders();
      } catch {
        router.push("/login");
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrap();
  }, [router, fetchOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success("Status pesanan diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#ce9233]" />
      </div>
    );
  }

  const getStatusStyle = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-700";
  const getStatusLabel = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manajemen <span className="text-[#1c424f]">Pesanan</span>
            </h1>
            <p className="text-sm text-gray-500">{orders.length} pesanan ditampilkan</p>
          </div>
          <Link href="/admin"
            className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#f7f4ed] transition">
            ← Kembali ke Admin
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${filterStatus === "all" ? "bg-[#1c424f] text-white border-[#1c424f]" : "bg-white text-gray-700 border-[#908974]/40 hover:border-[#1c424f]"}`}>
            Semua
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${filterStatus === s.value ? "bg-[#1c424f] text-white border-[#1c424f]" : "bg-white text-gray-700 border-[#908974]/40 hover:border-[#1c424f]"}`}>
              {s.label}
            </button>
          ))}
          <button onClick={fetchOrders}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] hover:bg-[#f7f4ed] transition">
            Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#908974]/30">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233]" />
            <p className="text-gray-500 mt-3">Memuat pesanan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#908974]/30">
            <p className="text-gray-500">Tidak ada pesanan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const pv = order.product_variants as ({ type_name: string; weight: number; products: { name: string } | null }) | undefined;
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">{order.order_number}</p>
                      <p className="font-bold text-gray-900 mt-0.5">
                        {pv?.products?.name} — {pv?.type_name} ({pv?.weight} gram)
                      </p>
                      <p className="text-sm text-gray-500">{order.brands?.name} · {order.quantity} pcs</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${getStatusStyle(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-xs text-gray-400">Pembeli</p>
                      <p className="font-semibold text-gray-800">{order.buyer_name}</p>
                      <p className="text-gray-500">{order.buyer_phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="font-bold text-[#1c424f]">{formatRupiah(order.total_harga)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Pengiriman</p>
                      <p className="text-gray-800">{order.delivery_method === "pickup" ? "Ambil Sendiri" : "Dikirim"}</p>
                      {order.delivery_method === "delivery" && (
                        <p className="text-xs text-gray-500">{order.delivery_city}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Pembayaran</p>
                      <p className="text-gray-800">{order.payment_method === "transfer" ? "Transfer Bank" : "COD"}</p>
                    </div>
                  </div>

                  {order.notes && (
                    <p className="text-xs text-gray-500 bg-[#f7f4ed] rounded-lg px-3 py-2 mb-4">
                      Catatan: {order.notes}
                    </p>
                  )}

                  {/* Update status */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#f2ece0] pt-4">
                    <span className="text-xs font-semibold text-gray-500 mr-1">Ubah status:</span>
                    {STATUS_OPTIONS.filter((s) => s.value !== order.status).map((s) => (
                      <button key={s.value}
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, s.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${s.color} hover:opacity-80`}>
                        {s.label}
                      </button>
                    ))}
                    <a
                      href={`https://wa.me/${order.buyer_phone.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white transition">
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
