"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckoutSuksesPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("no") ?? "";
  const phone = searchParams.get("phone") ?? "";

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

        {/* Info pembayaran */}
        <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 text-left space-y-2">
          <p className="text-sm font-semibold text-gray-700">Langkah selanjutnya:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Admin akan menghubungi Anda via WhatsApp untuk konfirmasi</li>
            <li>Lakukan pembayaran sesuai instruksi dari admin</li>
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
