"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AdminNav from "@/components/admin/AdminNav";
import PeriodPicker, { currentMonth, downloadCsv } from "@/components/admin/PeriodPicker";
import { api, ApiError } from "@/lib/api";

interface CashEntry {
  id: string;
  entry_date: string;
  direction: "in" | "out";
  amount: number;
  category: string;
  description: string | null;
  ref: string | null;
  source: "manual" | "auto";
}

interface CashData {
  from: string;
  to: string;
  saldo_awal: number;
  masuk: number;
  keluar: number;
  saldo_akhir: number;
  entries: CashEntry[];
}

// Harus sama dengan MANUAL_CASH_CATEGORIES / CASH_CATEGORY_LABELS di lib/ledger.ts
const MANUAL = {
  in: { modal: "Setoran modal", lainnya_masuk: "Pemasukan lain" },
  out: {
    operasional: "Biaya operasional",
    gaji: "Gaji",
    sewa: "Sewa",
    pembelian_stok: "Pembelian stok",
    prive: "Pengambilan pemilik",
    zakat: "Zakat",
    lainnya_keluar: "Pengeluaran lain",
  },
} as const;
const LABELS: Record<string, string> = { penjualan: "Penjualan", buyback: "Buyback", koreksi: "Koreksi (pembatalan)", ...MANUAL.in, ...MANUAL.out };

const formatRupiah = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const formatDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

export default function AdminCashPage() {
  const router = useRouter();
  const [period, setPeriod] = useState(currentMonth);
  const [data, setData] = useState<CashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ direction: "out" as "in" | "out", category: "operasional", amount: "", entry_date: today(), description: "" });

  const onError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
    toast.error(err instanceof Error ? err.message : fallback);
  };

  useEffect(() => {
    let ignore = false;
    api<CashData>(`/api/admin/cash?from=${period.from}&to=${period.to}`)
      .then((d) => { if (!ignore) setData(d); })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat kas");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [period, router, reloadKey]);

  const reload = () => { setLoading(true); setReloadKey((k) => k + 1); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api("/api/admin/cash", { method: "POST", body: { ...form, amount: Number(form.amount) } });
      toast.success("Entri kas dicatat");
      setForm((f) => ({ ...f, amount: "", description: "" }));
      reload();
    } catch (err) {
      onError(err, "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: CashEntry) => {
    if (!confirm(`Hapus entri ${LABELS[entry.category] ?? entry.category} ${formatRupiah(entry.amount)}?`)) return;
    try {
      await api(`/api/admin/cash/${entry.id}`, { method: "DELETE" });
      toast.success("Entri dihapus");
      reload();
    } catch (err) {
      onError(err, "Gagal menghapus");
    }
  };

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`kas_${data.from}_${data.to}.csv`, [
      ["Tanggal", "Jenis", "Kategori", "Keterangan", "Referensi", "Masuk", "Keluar", "Sumber"],
      ...data.entries
        .slice()
        .reverse()
        .map((e) => [e.entry_date, e.direction === "in" ? "Masuk" : "Keluar", LABELS[e.category] ?? e.category, e.description, e.ref,
          e.direction === "in" ? e.amount : null, e.direction === "out" ? e.amount : null, e.source === "auto" ? "Otomatis" : "Manual"]),
      [],
      ["Saldo awal", "", "", "", "", data.saldo_awal, "", ""],
      ["Total", "", "", "", "", data.masuk, data.keluar, ""],
      ["Saldo akhir", "", "", "", "", data.saldo_akhir, "", ""],
    ]);
  };

  const inputCls = "w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm focus:outline-none focus:border-[#1c424f]";
  const categories = MANUAL[form.direction];

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Buku <span className="text-[#1c424f]">Kas</span></h1>
          <p className="text-sm text-gray-500">Penjualan & buyback yang selesai tercatat otomatis. Catat modal dan biaya di sini.</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PeriodPicker from={period.from} to={period.to} onChange={(from, to) => { setLoading(true); setPeriod({ from, to }); }} />
          <button onClick={exportCsv} disabled={!data}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] hover:bg-white/70 disabled:opacity-50">
            Unduh CSV
          </button>
        </div>

        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Saldo awal", data.saldo_awal, "text-gray-900"],
              ["Kas masuk", data.masuk, "text-emerald-700"],
              ["Kas keluar", data.keluar, "text-red-600"],
              ["Saldo akhir", data.saldo_akhir, data.saldo_akhir < 0 ? "text-red-600" : "text-[#1c424f]"],
            ].map(([k, v, cls]) => (
              <div key={k as string} className="bg-white rounded-2xl border border-[#908974]/30 p-4">
                <p className="text-xs text-gray-500">{k}</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{formatRupiah(v as number)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <form onSubmit={submit} className="bg-white rounded-2xl border border-[#908974]/30 p-5 space-y-3 h-fit">
            <h2 className="font-bold text-gray-900">Catat kas manual</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["in", "out"] as const).map((d) => (
                <button key={d} type="button"
                  onClick={() => setForm((f) => ({ ...f, direction: d, category: Object.keys(MANUAL[d])[0] }))}
                  className={`py-2 rounded-lg text-sm font-semibold border-2 transition ${
                    form.direction === d
                      ? d === "in" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-600"
                      : "border-[#908974]/30 text-gray-600"
                  }`}>
                  {d === "in" ? "Kas masuk" : "Kas keluar"}
                </button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-gray-600">
              Kategori
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={`mt-1 ${inputCls}`}>
                {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Nominal (Rp)
              <input type="number" min={1} step={1} required value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={`mt-1 ${inputCls}`} placeholder="500000" />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Tanggal
              <input type="date" required max={today()} value={form.entry_date}
                onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Keterangan
              <input value={form.description} maxLength={300}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`mt-1 ${inputCls}`} placeholder="Bayar listrik toko" />
            </label>
            <button type="submit" disabled={saving}
              className="w-full py-2.5 rounded-lg font-semibold bg-[#1c424f] text-white hover:bg-[#15323c] disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-[#908974]/30 overflow-x-auto">
            {loading ? (
              <p className="p-10 text-center text-gray-500">Memuat kas...</p>
            ) : !data || data.entries.length === 0 ? (
              <p className="p-10 text-center text-gray-500">Belum ada entri kas pada periode ini.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#908974]/20">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right">Masuk</th>
                    <th className="px-4 py-3 text-right">Keluar</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => (
                    <tr key={e.id} className="border-b border-[#f2ece0] last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(e.entry_date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{LABELS[e.category] ?? e.category}</span>
                        {e.source === "auto" && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">otomatis</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{e.direction === "in" ? formatRupiah(e.amount) : ""}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600">{e.direction === "out" ? formatRupiah(e.amount) : ""}</td>
                      <td className="px-4 py-3 text-right">
                        {e.source === "manual" && (
                          <button onClick={() => remove(e)} className="text-xs font-semibold text-gray-400 hover:text-red-600">Hapus</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
