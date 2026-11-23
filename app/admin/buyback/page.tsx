"use client";

import AdminNav from "@/components/admin/AdminNav";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, ApiError } from "@/lib/api";
import type { BuybackRequest, OrderStatus } from "@/lib/types";
import { formatAccount } from "@/lib/labels";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

/** Link wa.me ke nomor pelanggan (08xx → 628xx), opsional dengan pesan. */
const waLink = (phone: string, text?: string) => {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: "pending", label: "Baru", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Selesai", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Dibatalkan", color: "bg-red-100 text-red-800" },
];

export default function AdminBuybackPage() {
  const router = useRouter();
  const [items, setItems] = useState<BuybackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : fallback);
    },
    [router],
  );

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const qs = filterStatus !== "all" ? `?status=${filterStatus}` : "";
    api<BuybackRequest[]>(`/api/admin/buyback${qs}`)
      .then((data) => { if (!ignore) setItems(data); })
      .catch((err) => { if (!ignore) handleError(err, "Gagal memuat pengajuan buyback"); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [filterStatus, handleError, reloadKey]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const item = items.find((x) => x.id === id);
    let totalFinal: number | undefined;
    if (status === "completed" && item) {
      // Nilai final setelah barang dicek (bawaan: estimasi). Dipakai di kas & nota.
      const input = window.prompt(
        `Nilai final buyback ${item.request_number} (Rp). Estimasi: ${item.total_estimasi.toLocaleString("id-ID")}`,
        String(item.total_final ?? item.total_estimasi),
      );
      if (input === null) return;
      totalFinal = Number(input.replace(/[^\d]/g, ""));
      if (!totalFinal || totalFinal <= 0) { toast.error("Nilai final tidak valid"); return; }
    }
    try {
      setUpdatingId(id);
      const res = await api<{ status: OrderStatus; receipt_number: string | null; receipt_token: string | null }>(
        `/api/admin/buyback/${id}`, { method: "PATCH", body: { status, total_final: totalFinal } },
      );
      setItems((prev) => prev.map((x) => x.id === id
        ? { ...x, status: res.status, receipt_number: res.receipt_number, receipt_token: res.receipt_token,
            total_final: totalFinal ?? x.total_final }
        : x));
      toast.success(status === "completed" && res.receipt_number
        ? `Buyback selesai — nota ${res.receipt_number} terbit`
        : "Status buyback diperbarui");
    } catch (err) {
      handleError(err, "Gagal update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusOf = (s: string) => STATUS_OPTIONS.find((o) => o.value === s);

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Pengajuan <span className="text-[#1c424f]">Buyback</span>
          </h1>
          <div className="flex gap-2">
            <Link href="/admin/orders" className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] hover:bg-[#f7f4ed] transition">
              Pesanan
            </Link>
            <Link href="/admin" className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1c424f] text-white hover:bg-[#15323c] transition">
              ← Admin
            </Link>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          {[{ value: "all" as const, label: "Semua" }, ...STATUS_OPTIONS].map((s) => (
            <button key={s.value} onClick={() => { setLoading(true); setFilterStatus(s.value); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${filterStatus === s.value ? "bg-[#1c424f] text-white border-[#1c424f]" : "bg-white text-gray-700 border-[#908974]/40 hover:border-[#1c424f]"}`}>
              {s.label}
            </button>
          ))}
          <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] hover:bg-[#f7f4ed] transition">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#908974]/30">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233]" />
            <p className="text-gray-500 mt-3">Memuat pengajuan...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#908974]/30">
            <p className="text-gray-500">Tidak ada pengajuan buyback</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((x) => {
              const pv = x.product_variants;
              const st = statusOf(x.status);
              return (
                <div key={x.id} className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">
                        {x.request_number}
                        {x.channel === "store" && (
                          <span className="ml-2 rounded bg-[#ce9233]/15 px-1.5 py-0.5 font-sans font-semibold text-[#b87f2d]">Toko</span>
                        )}
                        {x.receipt_number && <span className="ml-2 text-[#1c424f]">· Nota {x.receipt_number}</span>}
                      </p>
                      <p className="font-bold text-gray-900 mt-0.5">
                        {pv?.products?.name} {pv?.type_name} ({pv?.weight} gram)
                      </p>
                      <p className="text-sm text-gray-500">{x.brands?.name} · {x.quantity} pcs</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${st?.color ?? "bg-gray-100 text-gray-700"}`}>
                      {st?.label ?? x.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-xs text-gray-400">Pelanggan</p>
                      <p className="font-semibold text-gray-800">{x.seller_name}</p>
                      <p className="text-gray-500">{x.seller_phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{x.total_final ? "Nilai final" : "Estimasi nilai"}</p>
                      <p className="font-bold text-[#1c424f]">{formatRupiah(x.total_final ?? x.total_estimasi)}</p>
                      {x.total_final && x.total_final !== x.total_estimasi && (
                        <p className="text-xs text-gray-400 line-through">{formatRupiah(x.total_estimasi)}</p>
                      )}
                      <p className="text-xs text-gray-500">@ {formatRupiah(x.harga_buyback)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Kelengkapan</p>
                      <p className="text-gray-800">
                        {[x.has_certificate && "Sertifikat", x.has_packaging && "Kemasan"].filter(Boolean).join(" & ") || "Tidak lengkap"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Cara serah</p>
                      <p className="text-gray-800">{x.channel === "store" ? "Langsung di toko" : x.handover_method === "store" ? "Datang ke toko" : "Kirim ke toko"}</p>
                    </div>
                  </div>

                  {(x.seller_bank || x.payout_method === "cash") && (
                    <p className="text-sm text-gray-700 bg-[#f7f4ed] rounded-lg px-3 py-2 mb-4">
                      <span className="text-xs text-gray-500">Pembayaran ke penjual: </span>
                      {x.seller_bank && x.seller_account_number && x.seller_account_holder
                        ? <>Transfer ke <span className="font-mono font-semibold">{formatAccount(x.seller_bank, x.seller_account_number, x.seller_account_holder)}</span></>
                        : "Tunai"}
                    </p>
                  )}

                  {x.notes && (
                    <p className="text-xs text-gray-500 bg-[#f7f4ed] rounded-lg px-3 py-2 mb-4">Catatan: {x.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#f2ece0] pt-4">
                    <span className="text-xs font-semibold text-gray-500 mr-1">Ubah status:</span>
                    {STATUS_OPTIONS.filter((s) => s.value !== x.status).map((s) => (
                      <button key={s.value} disabled={updatingId === x.id} onClick={() => updateStatus(x.id, s.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${s.color} hover:opacity-80`}>
                        {s.label}
                      </button>
                    ))}
                    <div className="ml-auto flex flex-wrap gap-2">
                      {x.receipt_number && x.receipt_token && (
                        <>
                          <a href={`/nota/${x.receipt_token}`} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c424f] hover:bg-[#15323c] text-white transition">
                            Lihat nota
                          </a>
                          {x.seller_phone && (
                            <a
                              href={waLink(x.seller_phone, `Assalamu'alaikum ${x.seller_name}, terima kasih atas transaksi buyback di Logam Mulia Dinar. Berikut nota buyback ${x.receipt_number}: ${window.location.origin}/nota/${x.receipt_token}`)}
                              target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition">
                              Kirim nota via WA
                            </a>
                          )}
                        </>
                      )}
                      {x.seller_phone && (
                        <a href={waLink(x.seller_phone)} target="_blank" rel="noopener noreferrer"
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
