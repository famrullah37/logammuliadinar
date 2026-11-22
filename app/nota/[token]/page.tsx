import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import PrintButton from "@/components/receipt/PrintButton";
import { getReceiptByToken } from "@/lib/receipts";
import { SITE, whatsappLink } from "@/lib/site";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Nota",
  robots: { index: false, follow: false },
};

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const formatGram = (w: number) => `${w.toLocaleString("id-ID", { maximumFractionDigits: 4 })} gram`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

/** 081233272733 → 0812****2733 (link nota bisa diteruskan; jangan tampilkan nomor utuh). */
const maskPhone = (p: string) => {
  const d = p.replace(/\s/g, "");
  return d.length <= 8 ? d : `${d.slice(0, 4)}${"*".repeat(d.length - 8)}${d.slice(-4)}`;
};

export default async function NotaPage({ params }: Props) {
  const r = await getReceiptByToken((await params).token);
  if (!r) notFound();

  const isOrder = r.kind === "order";
  const cancelled = r.status === "cancelled";
  const title = isOrder ? "Nota Pembelian" : "Nota Buyback";

  const details: [string, string][] = isOrder
    ? [
        ["Pembayaran", r.payment_method === "transfer" ? "Transfer bank" : "COD (bayar di tempat)"],
        ["Pengiriman", r.delivery_method === "pickup" ? "Ambil di toko" : "Dikirim"],
        ...(r.delivery_method === "delivery"
          ? ([["Alamat", [r.delivery_address, r.delivery_city, r.delivery_postal_code].filter(Boolean).join(", ")]] as [string, string][])
          : []),
      ]
    : [
        ["Cara serah", r.handover_method === "store" ? "Datang ke toko" : "Dikirim ke toko"],
        ["Kelengkapan", [r.has_certificate ? "Sertifikat" : null, r.has_packaging ? "Kemasan" : null].filter(Boolean).join(" & ") || "Tanpa sertifikat/kemasan"],
        ["Pembayaran ke pelanggan", "Sesuai kesepakatan dengan admin"],
      ];

  return (
    <div className="min-h-screen bg-brand-cream py-8 sm:py-12 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
        {/* Aksi — tidak ikut tercetak */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-deep">← Kembali ke beranda</Link>
          <PrintButton />
        </div>

        <article className="relative overflow-hidden rounded-3xl border border-brand-olive/20 bg-white shadow-xl shadow-brand-deep/5 print:rounded-none print:border-0 print:shadow-none">
          {cancelled && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="-rotate-12 rounded-xl border-4 border-red-500/60 px-6 py-2 text-5xl font-black tracking-widest text-red-500/60">
                DIBATALKAN
              </span>
            </div>
          )}

          {/* Kop */}
          <header className="flex flex-wrap items-start justify-between gap-6 bg-brand-ink px-6 py-6 text-white sm:px-10 print:bg-white print:text-black print:border-b-2 print:border-black">
            <div>
              <Image src="/logolmd.png" alt={SITE.name} width={110} height={34} />
              <p className="mt-3 text-xs text-white/60 print:text-gray-600">
                WhatsApp {SITE.whatsappDisplay} · {SITE.email}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-brand-gold-light print:text-black">{title}</p>
              <p className="mt-1 font-mono text-sm">{r.receipt_number}</p>
              <p className="mt-1 text-xs text-white/60 print:text-gray-600">{formatDate(r.completed_at)}</p>
            </div>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10">
            {/* Pihak & referensi */}
            <div className="grid gap-6 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">{isOrder ? "Pembeli" : "Penjual (pelanggan)"}</p>
                <p className="mt-1 font-semibold text-gray-900">{r.customer_name}</p>
                <p className="text-gray-600">{maskPhone(r.customer_phone)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs uppercase tracking-wider text-gray-400">{isOrder ? "No. pesanan" : "No. pengajuan"}</p>
                <p className="mt-1 font-mono font-semibold text-gray-900">{r.reference}</p>
                <p className="text-gray-600">Dibuat {formatDate(r.created_at)}</p>
              </div>
            </div>

            {/* Rincian barang */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-sm">
                <thead>
                  <tr className="border-b-2 border-brand-ink/80 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th scope="col" className="pb-2 font-medium">Barang</th>
                    <th scope="col" className="pb-2 text-right font-medium">Qty</th>
                    <th scope="col" className="pb-2 text-right font-medium">{isOrder ? "Harga" : "Harga buyback"}</th>
                    <th scope="col" className="pb-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-brand-olive/15 align-top">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-gray-900">
                        {r.product_name} {r.type_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.brand_name} · {formatGram(r.weight)} · Au {r.purity}
                      </p>
                    </td>
                    <td className="py-4 text-right tabular-nums">{r.quantity}</td>
                    <td className="py-4 text-right tabular-nums whitespace-nowrap">{formatRupiah(r.unit_price)}</td>
                    <td className="py-4 text-right tabular-nums whitespace-nowrap font-semibold">{formatRupiah(r.total)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  {r.kind === "order" && r.delivery_method === "delivery" && (
                    <tr>
                      <td colSpan={3} className="pt-4 text-right text-gray-500">Ongkos kirim</td>
                      <td className="pt-4 text-right tabular-nums text-gray-700">
                        {r.ongkir === null ? "—" : r.ongkir === 0 ? "Gratis" : formatRupiah(r.ongkir)}
                      </td>
                    </tr>
                  )}
                  {/* Nota memakai nilai asli: harga barang + ongkir. Kode unik hanya untuk mencocokkan transfer. */}
                  <tr>
                    <td colSpan={3} className="pt-4 text-right font-semibold text-gray-700">
                      {isOrder ? "Total" : "Total dibayarkan ke pelanggan"}
                    </td>
                    <td className="pt-4 text-right font-display text-xl font-bold tabular-nums text-brand-ink whitespace-nowrap">
                      {formatRupiah(r.kind === "order" ? r.total + (r.ongkir ?? 0) : r.total)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="pt-1 text-right text-xs text-gray-500">
                      Total berat: {formatGram(r.weight * r.quantity)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Keterangan */}
            <dl className="grid gap-x-6 gap-y-3 rounded-2xl bg-brand-cream p-5 text-sm sm:grid-cols-2 print:bg-white print:border print:border-gray-300">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900">{v}</dd>
                </div>
              ))}
              {r.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500">Catatan</dt>
                  <dd className="whitespace-pre-line text-gray-900">{r.notes}</dd>
                </div>
              )}
            </dl>

            <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-dashed border-brand-olive/30 pt-6 text-xs text-gray-500">
              <p className="max-w-sm">
                {isOrder
                  ? "Terima kasih telah berbelanja di Logam Mulia Dinar. Simpan nota ini sebagai bukti pembelian."
                  : "Terima kasih telah mempercayakan buyback kepada Logam Mulia Dinar. Simpan nota ini sebagai bukti transaksi."}
                {" "}Nota ini sah tanpa tanda tangan.
              </p>
              <p className="font-semibold uppercase tracking-wider text-emerald-700">
                {cancelled ? "" : isOrder ? "Lunas" : "Selesai"}
              </p>
            </footer>
          </div>
        </article>

        <div className="mt-6 text-center print:hidden">
          <a
            href={whatsappLink(`Assalamu'alaikum, saya ingin bertanya tentang nota ${r.receipt_number}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-deep hover:underline"
          >
            <MessageCircle size={16} /> Ada pertanyaan soal nota ini?
          </a>
        </div>
      </div>
    </div>
  );
}
