"use client";

import AdminNav from "@/components/admin/AdminNav";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";
import toast from "react-hot-toast";
import { paymentLabel } from "@/lib/labels";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

/** Pesan tagihan untuk pembeli: rincian barang, ongkir, kode unik, total. */
const billMessage = (o: Order) => {
  const lines = [
    `Assalamu'alaikum ${o.buyer_name}, terima kasih atas pesanan ${o.order_number} di Logam Mulia Dinar.`,
    `Harga barang: ${formatRupiah(o.total_harga)}`,
  ];
  if (o.delivery_method === "delivery") lines.push(`Ongkos kirim: ${o.ongkir ? formatRupiah(o.ongkir) : "Gratis"}`);
  if (o.kode_unik) lines.push(`Kode unik: ${o.kode_unik}`);
  lines.push(`Total ${o.payment_method === "transfer" ? "transfer" : "bayar"}: ${formatRupiah(o.total_bayar ?? o.total_harga)}`);
  if (o.payment_method === "transfer") lines.push("Mohon transfer tepat sesuai nominal (termasuk 3 digit terakhir).");
  return lines.join("\n");
};

/** Link wa.me ke nomor pelanggan (08xx → 628xx), opsional dengan pesan. */
const waLink = (phone: string, text?: string) => {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

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

  const [reloadKey, setReloadKey] = useState(0);

  // Proxy sudah mengarahkan ke /login bila belum login.
  useEffect(() => {
    let ignore = false;
    const qs = filterStatus !== "all" ? `?status=${filterStatus}` : "";
    api<Order[]>(`/api/admin/orders${qs}`)
      .then((data) => { if (!ignore) setOrders(data); })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat pesanan");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
        setAuthLoading(false);
      });
    return () => { ignore = true; };
  }, [filterStatus, router, reloadKey]);

  /** Admin mengisi ongkos kirim (ongkir belum bisa dihitung otomatis). */
  const setOngkir = async (order: Order) => {
    const input = window.prompt(
      `Ongkos kirim untuk ${order.order_number} ke ${order.delivery_city ?? "alamat pembeli"} (Rp, isi 0 bila gratis):`,
      order.ongkir === null || order.ongkir === undefined ? "" : String(order.ongkir),
    );
    if (input === null) return;
    const value = Number(input.replace(/[^\d]/g, ""));
    if (input.trim() === "" || !Number.isFinite(value)) { toast.error("Nominal ongkir tidak valid"); return; }
    try {
      const res = await api<{ ongkir: number; total_bayar: number; total_transfer: number | null }>(
        `/api/admin/orders/${order.id}/ongkir`, { method: "PATCH", body: { ongkir: value } },
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...res } : o)));
      toast.success(`Ongkir disimpan — total bayar ${formatRupiah(res.total_bayar)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan ongkir");
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await api<{ status: OrderStatus; receipt_number: string | null; receipt_token: string | null }>(
        `/api/admin/orders/${orderId}`, { method: "PATCH", body: { status } },
      );
      setOrders((prev) => prev.map((o) => o.id === orderId
        ? { ...o, status: res.status, invoice_number: res.receipt_number, receipt_token: res.receipt_token }
        : o));
      toast.success(status === "completed" && res.receipt_number
        ? `Pesanan selesai — nota ${res.receipt_number} terbit`
        : "Status pesanan diperbarui");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
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
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Daftar <span className="text-[#1c424f]">Pesanan</span></h1>
          <p className="text-sm text-gray-500">{orders.length} pesanan ditampilkan · online dan transaksi toko (label &quot;Toko&quot;).</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setLoading(true); setFilterStatus("all"); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${filterStatus === "all" ? "bg-[#1c424f] text-white border-[#1c424f]" : "bg-white text-gray-700 border-[#908974]/40 hover:border-[#1c424f]"}`}>
            Semua
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button key={s.value}
              onClick={() => { setLoading(true); setFilterStatus(s.value); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${filterStatus === s.value ? "bg-[#1c424f] text-white border-[#1c424f]" : "bg-white text-gray-700 border-[#908974]/40 hover:border-[#1c424f]"}`}>
              {s.label}
            </button>
          ))}
          <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] hover:bg-[#f7f4ed] transition">
            Muat ulang
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
                      <p className="text-xs text-gray-400 font-mono">
                        {order.order_number}
                        {order.channel === "store" && (
                          <span className="ml-2 rounded bg-[#ce9233]/15 px-1.5 py-0.5 font-sans font-semibold text-[#b87f2d]">Toko</span>
                        )}
                        {order.invoice_number && <span className="ml-2 text-[#1c424f]">· Nota {order.invoice_number}</span>}
                      </p>
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
                      <p className="text-gray-500">{order.buyer_phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total bayar</p>
                      <p className="font-bold text-[#1c424f]">{formatRupiah(order.total_bayar ?? order.total_harga)}</p>
                      <p className="text-xs text-gray-500">barang {formatRupiah(order.total_harga)}</p>
                      {order.delivery_method === "delivery" && (
                        order.ongkir === null || order.ongkir === undefined ? (
                          <p className="text-xs font-semibold text-amber-600">ongkir belum diisi</p>
                        ) : (
                          <p className="text-xs text-gray-500">ongkir {order.ongkir === 0 ? "gratis" : formatRupiah(order.ongkir)}</p>
                        )
                      )}
                      {order.kode_unik && (
                        <p className="text-xs text-gray-500">
                          kode unik <span className="font-mono font-semibold text-[#b87f2d]">{order.kode_unik}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Pengiriman</p>
                      <p className="text-gray-800">{order.channel === "store" ? "Langsung di toko" : order.delivery_method === "pickup" ? "Ambil Sendiri" : "Dikirim"}</p>
                      {order.delivery_method === "delivery" && (
                        <p className="text-xs text-gray-500">{order.delivery_city}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Pembayaran</p>
                      <p className="text-gray-800">{paymentLabel(order.payment_method)}</p>
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
                    <div className="ml-auto flex flex-wrap gap-2">
                      {order.delivery_method === "delivery" && (order.status === "pending" || order.status === "confirmed") && (
                        <button
                          onClick={() => setOngkir(order)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition">
                          {order.ongkir === null || order.ongkir === undefined ? "Isi ongkir" : "Ubah ongkir"}
                        </button>
                      )}
                      {order.buyer_phone && order.status !== "completed" && order.status !== "cancelled" &&
                        !(order.delivery_method === "delivery" && (order.ongkir === null || order.ongkir === undefined)) && (
                        <a
                          href={waLink(order.buyer_phone, billMessage(order))}
                          target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition">
                          Kirim tagihan via WA
                        </a>
                      )}
                      {order.invoice_number && order.receipt_token && (
                        <>
                          <a
                            href={`/nota/${order.receipt_token}`}
                            target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c424f] hover:bg-[#15323c] text-white transition">
                            Lihat nota
                          </a>
                          {order.buyer_phone && (
                            <a
                              href={waLink(order.buyer_phone, `Assalamu'alaikum ${order.buyer_name}, terima kasih telah berbelanja di Logam Mulia Dinar. Berikut nota pembelian ${order.invoice_number}: ${window.location.origin}/nota/${order.receipt_token}`)}
                              target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition">
                              Kirim nota via WA
                            </a>
                          )}
                        </>
                      )}
                      {order.buyer_phone && (
                        <a
                          href={waLink(order.buyer_phone)}
                          target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white transition">
                          WhatsApp
                        </a>
                      )}
                    </div>
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
