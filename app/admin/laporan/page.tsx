"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AdminNav from "@/components/admin/AdminNav";
import PeriodPicker, { currentMonth, downloadCsv } from "@/components/admin/PeriodPicker";
import { api, ApiError } from "@/lib/api";

interface Totals { transaksi: number; keping: number; gram: number; nilai: number; kode_unik?: number; ongkir?: number }
interface ByItem { product_name: string; type_name: string; brand_name: string; keping: number; nilai: number }
interface Report {
  from: string;
  to: string;
  sales: Totals;
  sales_by: ByItem[];
  buyback: Totals;
  buyback_by: ByItem[];
  cash: { saldo_awal: number; masuk: number; keluar: number; saldo_akhir: number; by_category: { direction: "in" | "out"; category: string; total: number; entri: number }[] };
  stock: { keping: number; gram: number; nilai_buyback: number; nilai_modal: number; habis: number };
  profit: { pendapatan: number; hpp: number; laba_kotor: number; transaksi: number; tanpa_modal: number };
  open: { pesanan: number; nilai_pesanan: number; buyback: number; menunggu_ongkir: number; zakat_belum: number };
}

const LABELS: Record<string, string> = {
  penjualan: "Penjualan", buyback: "Buyback", koreksi: "Koreksi (pembatalan)",
  modal: "Setoran modal", lainnya_masuk: "Pemasukan lain", operasional: "Biaya operasional", gaji: "Gaji",
  sewa: "Sewa", pembelian_stok: "Pembelian stok", prive: "Pengambilan pemilik", zakat: "Zakat", lainnya_keluar: "Pengeluaran lain",
};
const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const gram = (v: number) => `${v.toLocaleString("id-ID", { maximumFractionDigits: 4 })} g`;
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#908974]/30 p-5 break-inside-avoid">
      <h2 className="font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v, strong, cls = "" }: { k: string; v: string; strong?: boolean; cls?: string }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? "border-t border-[#f2ece0] mt-1 pt-2 font-bold" : ""}`}>
      <span className="text-gray-600">{k}</span>
      <span className={`tabular-nums ${cls}`}>{v}</span>
    </div>
  );
}

function ByTable({ items, empty }: { items: ByItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#908974]/20">
          <th className="py-2">Produk</th><th className="py-2">Brand</th><th className="py-2 text-right">Keping</th><th className="py-2 text-right">Nilai</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={`${i.product_name}-${i.type_name}-${i.brand_name}`} className="border-b border-[#f2ece0] last:border-0">
            <td className="py-2">{i.product_name} {i.type_name}</td>
            <td className="py-2">{i.brand_name}</td>
            <td className="py-2 text-right tabular-nums">{i.keping}</td>
            <td className="py-2 text-right tabular-nums">{rp(i.nilai)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminReportPage() {
  const router = useRouter();
  const [period, setPeriod] = useState(currentMonth);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    api<Report>(`/api/admin/report?from=${period.from}&to=${period.to}`)
      .then((d) => { if (!ignore) setReport(d); })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat laporan");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [period, router]);

  const exportCsv = () => {
    if (!report) return;
    const r = report;
    downloadCsv(`laporan_${r.from}_${r.to}.csv`, [
      ["Laporan keuangan", `${r.from} s.d. ${r.to}`],
      [],
      ["RINGKASAN"],
      ["Penjualan (transaksi)", r.sales.transaksi], ["Penjualan (keping)", r.sales.keping], ["Penjualan (gram)", r.sales.gram], ["Penjualan (nilai)", r.sales.nilai],
      ["Buyback (transaksi)", r.buyback.transaksi], ["Buyback (keping)", r.buyback.keping], ["Buyback (gram)", r.buyback.gram], ["Buyback (nilai)", r.buyback.nilai],
      ["Penjualan barang (nilai nota)", r.profit.pendapatan], ["HPP (FIFO)", r.profit.hpp], ["Laba kotor", r.profit.laba_kotor], ["Transaksi tanpa data modal", r.profit.tanpa_modal],
      ["Kas saldo awal", r.cash.saldo_awal], ["Kas masuk", r.cash.masuk], ["Kas keluar", r.cash.keluar], ["Kas saldo akhir", r.cash.saldo_akhir],
      [],
      ["PENJUALAN PER PRODUK", "Brand", "Keping", "Nilai"],
      ...r.sales_by.map((i) => [`${i.product_name} ${i.type_name}`, i.brand_name, i.keping, i.nilai]),
      [],
      ["BUYBACK PER PRODUK", "Brand", "Keping", "Nilai"],
      ...r.buyback_by.map((i) => [`${i.product_name} ${i.type_name}`, i.brand_name, i.keping, i.nilai]),
      [],
      ["KAS PER KATEGORI", "Jenis", "Entri", "Total"],
      ...r.cash.by_category.map((c) => [LABELS[c.category] ?? c.category, c.direction === "in" ? "Masuk" : "Keluar", c.entri, c.total]),
    ]);
  };

  const r = report;
  const selisih = r ? r.sales.nilai - r.buyback.nilai : 0;

  return (
    <div className="min-h-screen bg-[#f7f4ed] print:bg-white">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Laporan <span className="text-[#1c424f]">Keuangan</span></h1>
          {r && <p className="text-sm text-gray-500">Periode {fmtDate(r.from)} – {fmtDate(r.to)}</p>}
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <PeriodPicker from={period.from} to={period.to} onChange={(from, to) => { setLoading(true); setPeriod({ from, to }); }} />
          <div className="flex gap-2">
            <button onClick={exportCsv} disabled={!r}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] disabled:opacity-50">
              Unduh CSV
            </button>
            <button onClick={() => window.print()} disabled={!r}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1c424f] text-white disabled:opacity-50">
              Cetak
            </button>
          </div>
        </div>

        {loading || !r ? (
          <p className="py-16 text-center text-gray-500">Memuat laporan...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ["Penjualan", rp(r.sales.nilai), `${r.sales.transaksi} transaksi · ${gram(r.sales.gram)}`],
                ["Buyback", rp(r.buyback.nilai), `${r.buyback.transaksi} transaksi · ${gram(r.buyback.gram)}`],
                ["Laba kotor (FIFO)", rp(r.profit.laba_kotor), r.profit.tanpa_modal ? `${r.profit.tanpa_modal} transaksi tanpa data modal` : `dari ${r.profit.transaksi} transaksi`],
                ["Saldo kas akhir", rp(r.cash.saldo_akhir), `awal ${rp(r.cash.saldo_awal)}`],
              ].map(([k, v, sub]) => (
                <div key={k} className="bg-white rounded-2xl border border-[#908974]/30 p-4">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-[#1c424f]">{v}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Arus kas">
                <Row k="Saldo awal" v={rp(r.cash.saldo_awal)} />
                {r.cash.by_category.filter((c) => c.direction === "in").map((c) => (
                  <Row key={`in-${c.category}`} k={`+ ${LABELS[c.category] ?? c.category}`} v={rp(c.total)} cls="text-emerald-700" />
                ))}
                {r.cash.by_category.filter((c) => c.direction === "out").map((c) => (
                  <Row key={`out-${c.category}`} k={`− ${LABELS[c.category] ?? c.category}`} v={rp(c.total)} cls="text-red-600" />
                ))}
                <Row k="Total masuk" v={rp(r.cash.masuk)} strong cls="text-emerald-700" />
                <Row k="Total keluar" v={rp(r.cash.keluar)} cls="text-red-600" />
                <Row k="Saldo akhir" v={rp(r.cash.saldo_akhir)} strong />
              </Card>

              <Card title="Laba kotor (FIFO)">
                <Row k="Penjualan barang (nilai nota, tanpa ongkir)" v={rp(r.profit.pendapatan)} />
                <Row k="− Modal barang terjual (HPP)" v={rp(r.profit.hpp)} cls="text-red-600" />
                <Row k="Laba kotor" v={rp(r.profit.laba_kotor)} strong cls={r.profit.laba_kotor < 0 ? "text-red-600" : "text-emerald-700"} />
                {r.profit.tanpa_modal > 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    {r.profit.tanpa_modal} transaksi tidak dihitung karena stoknya tidak dilacak atau modalnya tidak diketahui.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">Selisih penjualan − buyback (arus barang): {rp(selisih)}</p>
              </Card>

              <Card title="Posisi saat ini">
                <Row k="Stok (yang dilacak)" v={`${r.stock.keping} keping · ${gram(r.stock.gram)}`} />
                <Row k="Nilai stok (modal FIFO)" v={rp(r.stock.nilai_modal)} />
                <Row k="Nilai stok (harga buyback hari ini)" v={rp(r.stock.nilai_buyback)} />
                <Row k="Produk stok habis" v={String(r.stock.habis)} />
                <Row k="Pesanan belum selesai" v={`${r.open.pesanan} · ${rp(r.open.nilai_pesanan)}`} strong />
                <Row k="Pengajuan buyback berjalan" v={String(r.open.buyback)} />
                <Row k="Dana zakat (2,5%) belum dikeluarkan" v={rp(r.open.zakat_belum)} cls={r.open.zakat_belum > 0 ? "text-amber-600" : ""} />
                {r.open.menunggu_ongkir ? <Row k="Pesanan menunggu ongkir" v={String(r.open.menunggu_ongkir)} cls="text-amber-600" /> : null}
                {r.sales.ongkir ? <Row k="Ongkos kirim (termasuk di penjualan)" v={rp(r.sales.ongkir)} /> : null}
                {r.sales.kode_unik ? <Row k="Kode unik transfer (termasuk di penjualan)" v={rp(r.sales.kode_unik)} /> : null}
              </Card>
            </div>

            <Card title="Penjualan per produk">
              <ByTable items={r.sales_by} empty="Belum ada penjualan selesai pada periode ini." />
            </Card>
            <Card title="Buyback per produk">
              <ByTable items={r.buyback_by} empty="Belum ada buyback selesai pada periode ini." />
            </Card>
            <p className="text-xs text-gray-500">
              Penjualan & buyback dihitung dari transaksi berstatus Selesai berdasarkan tanggal selesai (WIB). Kas mencakup entri otomatis dan manual.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
