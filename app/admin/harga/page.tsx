"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AdminNav from "@/components/admin/AdminNav";
import { api, ApiError } from "@/lib/api";
import type { Price } from "@/lib/types";
import { formatWib, PRICE_UPDATE_HOUR_WIB, updatedThisCycle } from "@/lib/price-schedule";

type Draft = { harga_beli: string; harga_buyback: string };

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function DailyPricePage() {
  const router = useRouter();
  const [prices, setPrices] = useState<Price[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let ignore = false;
    api<{ prices: Price[] }>("/api/admin/data")
      .then((d) => {
        if (ignore) return;
        setPrices(d.prices);
        setDrafts({});
      })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat harga");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [router, reloadKey]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return [...prices]
      .sort((a, b) =>
        (a.product_variants?.products?.name ?? "").localeCompare(b.product_variants?.products?.name ?? "", "id-ID") ||
        Number(a.product_variants?.weight ?? 0) - Number(b.product_variants?.weight ?? 0) ||
        (a.brands?.name ?? "").localeCompare(b.brands?.name ?? "", "id-ID"))
      .filter((p) => !q || `${p.product_variants?.products?.name} ${p.product_variants?.type_name} ${p.brands?.name}`.toLowerCase().includes(q));
  }, [prices, filter]);

  const valueOf = (p: Price, key: keyof Draft) => drafts[p.id]?.[key] ?? String(p[key]);
  const isChanged = (p: Price) =>
    !!drafts[p.id] && (Number(drafts[p.id].harga_beli) !== p.harga_beli || Number(drafts[p.id].harga_buyback) !== p.harga_buyback);
  const changed = prices.filter(isChanged);
  const lastUpdate = prices.reduce<string | null>((m, p) => (p.updated_at && (!m || p.updated_at > m) ? p.updated_at : m), null);

  const setDraft = (p: Price, key: keyof Draft, value: string) =>
    setDrafts((d) => ({ ...d, [p.id]: { harga_beli: valueOf(p, "harga_beli"), harga_buyback: valueOf(p, "harga_buyback"), [key]: value } }));

  const save = async () => {
    const items = changed.map((p) => ({ id: p.id, harga_beli: Number(drafts[p.id].harga_beli), harga_buyback: Number(drafts[p.id].harga_buyback) }));
    const bad = items.find((i) => !(i.harga_beli > 0) || !(i.harga_buyback >= 0));
    if (bad) { toast.error("Harga beli harus lebih dari 0 dan buyback tidak boleh negatif"); return; }
    const warn = items.filter((i) => i.harga_buyback > i.harga_beli).length;
    if (warn && !confirm(`${warn} baris punya harga buyback lebih tinggi dari harga beli. Tetap simpan?`)) return;
    try {
      setSaving(true);
      const res = await api<{ updated: number }>("/api/admin/daily-prices", { method: "POST", body: { items } });
      toast.success(`${res.updated} harga diperbarui`);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (dirty: boolean) =>
    `w-36 px-3 py-2 rounded-lg border text-right tabular-nums text-sm focus:outline-none focus:border-[#1c424f] ${dirty ? "border-[#ce9233] bg-[#ce9233]/10" : "border-[#908974]/40 bg-white"}`;

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Harga <span className="text-[#1c424f]">Harian</span></h1>
          <p className="text-sm text-gray-500">
            Jadwal update: setiap hari pukul {PRICE_UPDATE_HOUR_WIB}.00 WIB. Ubah harga yang berubah saja, lalu simpan sekaligus.
          </p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        {!loading && (
          updatedThisCycle(lastUpdate) ? (
            <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
              Harga siklus hari ini sudah diperbarui ({formatWib(new Date(lastUpdate!), false)}).
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Belum ada perubahan harga sejak pukul {PRICE_UPDATE_HOUR_WIB}.00 WIB terakhir — harga sebelumnya tetap berlaku.
              {lastUpdate && <> Perubahan terakhir: {formatWib(new Date(lastUpdate), false)}.</>}
            </p>
          )
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cari produk / brand..."
            className="w-full sm:w-72 px-4 py-2.5 border border-[#908974]/40 rounded-xl bg-white focus:outline-none focus:border-[#1c424f]" />
          <div className="ml-auto flex gap-2">
            {changed.length > 0 && (
              <button onClick={() => setDrafts({})} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-red-600">
                Batalkan perubahan
              </button>
            )}
            <button onClick={save} disabled={saving || changed.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1c424f] text-white hover:bg-[#15323c] disabled:opacity-40">
              {saving ? "Menyimpan..." : `Simpan perubahan (${changed.length})`}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#908974]/30 overflow-x-auto">
          {loading ? (
            <p className="p-10 text-center text-gray-500">Memuat harga...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#908974]/20">
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">Harga beli (jual ke pembeli)</th>
                  <th className="px-4 py-3 text-right">Harga buyback</th>
                  <th className="px-4 py-3">Diperbarui</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const dirty = isChanged(p);
                  return (
                    <tr key={p.id} className={`border-b border-[#f2ece0] last:border-0 ${dirty ? "bg-[#ce9233]/5" : ""}`}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-gray-900">{p.product_variants?.products?.name} {p.product_variants?.type_name}</p>
                        <p className="text-xs text-gray-500">{p.product_variants?.weight} gram</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-800">{p.brands?.name}</td>
                      <td className="px-4 py-2.5 text-right">
                        <input type="number" min={1} step={1000} value={valueOf(p, "harga_beli")} aria-label="Harga beli"
                          onChange={(e) => setDraft(p, "harga_beli", e.target.value)} className={inputCls(dirty)} />
                        {dirty && <p className="text-[11px] text-gray-400 line-through">{formatRupiah(p.harga_beli)}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input type="number" min={0} step={1000} value={valueOf(p, "harga_buyback")} aria-label="Harga buyback"
                          onChange={(e) => setDraft(p, "harga_buyback", e.target.value)} className={inputCls(dirty)} />
                        {dirty && <p className="text-[11px] text-gray-400 line-through">{formatRupiah(p.harga_buyback)}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(p.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Pesanan yang sudah dibuat tetap memakai harga saat checkout. Modal stok (FIFO) tidak terpengaruh perubahan harga jual.
        </p>
      </main>
    </div>
  );
}
