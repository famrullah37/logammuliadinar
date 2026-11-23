"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

/** Nominal transfer dengan 3 digit kode unik disorot, mis. Rp 6.460.<b>537</b>. */
function TransferAmount({ amount }: { amount: number }) {
  const text = formatRupiah(amount);
  return (
    <span className="tabular-nums">
      {text.slice(0, -3)}
      <span className="rounded bg-[#ce9233]/20 px-0.5 text-[#b87f2d]">{text.slice(-3)}</span>
    </span>
  );
}

function SuksesContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("no") ?? "";
  const phone = searchParams.get("phone") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [accounts, setAccounts] = useState<{ bank: string; account_number: string; holder: string }[]>([]);

  useEffect(() => {
    api<{ bank: string; account_number: string; holder: string }[]>("/api/bank-accounts")
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (!orderNumber || !phone) return;
    api<Order>("/api/orders/lookup", { method: "POST", body: { order_number: orderNumber, phone } })
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [orderNumber, phone]);

  const awaitingOngkir = order?.delivery_method === "delivery" && (order.ongkir === null || order.ongkir === undefined);
  const isTransfer = order?.payment_method === "transfer" && !!order.kode_unik;
  const copyAmount = async () => {
    if (!order?.total_bayar) return;
    await navigator.clipboard.writeText(String(order.total_bayar));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Ikon sukses */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Berhasil!</h1>
          <p className="text-gray-500 mt-2">
            Terima kasih. Pesanan Anda sedang diproses oleh tim kami.
          </p>
        </div>

        {/* Nomor pesanan */}
        <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-6 space-y-3">
          <p className="text-sm text-gray-500">Nomor Pesanan Anda</p>
          <p className="text-2xl font-bold text-[#1c424f] tracking-wide">{orderNumber || "—"}</p>
          <p className="text-xs text-gray-400">Simpan nomor ini untuk mengecek status pesanan</p>
        </div>

        {/* Dikirim: ongkir belum bisa dihitung otomatis */}
        {awaitingOngkir && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-left text-sm text-amber-900 space-y-1">
            <p className="font-semibold">Ongkos kirim akan dikonfirmasi admin</p>
            <p>
              Total barang {formatRupiah(order!.total_harga)}{order!.kode_unik ? ` + kode unik ${order!.kode_unik}` : ""}. Admin akan
              menghubungi Anda via WhatsApp dengan ongkir dan total akhir. Mohon tunggu konfirmasi sebelum membayar.
            </p>
            <p className="text-xs text-amber-700">Total akhir juga bisa dilihat di halaman Cek Status Pesanan.</p>
          </div>
        )}

        {/* Nominal transfer dengan kode unik */}
        {isTransfer && !awaitingOngkir && (
          <div className="bg-white rounded-2xl border-2 border-[#ce9233]/50 shadow-sm p-6 space-y-3">
            <p className="text-sm text-gray-500">Transfer tepat sebesar</p>
            <p className="text-3xl font-bold text-[#1c424f]">
              <TransferAmount amount={order.total_bayar!} />
            </p>
            <p className="text-xs text-gray-500">
              {formatRupiah(order.total_harga)}{order.ongkir ? ` + ongkir ${formatRupiah(order.ongkir)}` : ""} + kode unik <span className="font-semibold text-[#b87f2d]">{order.kode_unik}</span>
              <br />3 digit terakhir memudahkan kami mencocokkan transfer Anda.
            </p>
            <button
              type="button"
              onClick={copyAmount}
              className="inline-flex items-center gap-2 rounded-lg border border-[#1c424f]/30 px-4 py-2 text-sm font-semibold text-[#1c424f] hover:bg-[#f7f4ed] transition"
            >
              {copied ? "Tersalin ✓" : "Salin nominal"}
            </button>
            {accounts.length > 0 ? (
              <div className="space-y-2 border-t border-[#f2ece0] pt-3 text-left text-sm">
                {accounts.map((a) => (
                  <div key={`${a.bank}-${a.account_number}`} className="flex justify-between gap-3">
                    <span className="text-gray-500">{a.bank}</span>
                    <span className="text-right">
                      <span className="block font-mono font-semibold text-gray-900">{a.account_number}</span>
                      <span className="block text-xs text-gray-500">a.n. {a.holder}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-[#f2ece0] pt-3 text-xs text-gray-500">
                Nomor rekening tujuan akan dikirim admin via WhatsApp.
              </p>
            )}
          </div>
        )}

        {/* Info pembayaran */}
        <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 text-left space-y-2">
          <p className="text-sm font-semibold text-gray-700">Langkah selanjutnya:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Admin akan menghubungi Anda via WhatsApp untuk konfirmasi</li>
            {awaitingOngkir ? (
              <li>Tunggu konfirmasi ongkos kirim dan total akhir dari admin</li>
            ) : isTransfer ? (
              <li>Transfer sesuai nominal di atas, termasuk 3 digit kode unik</li>
            ) : (
              <li>Lakukan pembayaran sesuai instruksi dari admin</li>
            )}
            <li>Barang akan disiapkan setelah pembayaran dikonfirmasi</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {orderNumber && (
            <Link
              href={`/pesanan?no=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`}
              className="w-full bg-[#1c424f] hover:bg-[#15323c] text-white font-semibold py-3 rounded-xl transition text-center"
            >
              Cek Status Pesanan
            </Link>
          )}
          <Link
            href="/"
            className="w-full bg-white border border-[#908974]/40 hover:bg-[#f7f4ed] text-[#1c424f] font-semibold py-3 rounded-xl transition text-center"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar halaman bisa di-prerender.
export default function CheckoutSuksesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f4ed]" />}>
      <SuksesContent />
    </Suspense>
  );
}
