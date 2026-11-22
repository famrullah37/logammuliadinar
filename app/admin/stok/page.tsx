"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AdminNav from "@/components/admin/AdminNav";
import { api, ApiError } from "@/lib/api";

interface StockRow {
  id: string;
  stock: number | null;
  harga_beli: number;
  harga_buyback: number;
  brand_name: string;
  product_name: string;
  type_name: string;
  weight: number;
  last_movement: string | null;
  nilai_modal: number;
  modal_berikutnya: number | null;
}

interface Lot {
  id: string;
  source: string;
  unit_cost: number | null;
  qty_in: number;
  qty_remaining: number;
  ref: string | null;
  note: string | null;
  created_at: string;
}

interface Movement {
  id: string;
  change: number;
  stock_after: number;
  reason: string;
  ref: string | null;
  note: string | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  order: "Pesanan",
  order_cancel: "Pesanan batal",
  buyback: "Buyback masuk",
  buyback_cancel: "Buyback batal",
  adjust: "Penyesuaian",
  set: "Set stok",
  purchase: "Masuk dari pusat",
};

const LOT_SOURCE: Record<string, string> = {
  pusat: "Pusat", buyback: "Buyback", koreksi: "Koreksi", awal: "Saldo awal", retur: "Retur",
};

type EditMode = "set" | "adjust" | "purchase";

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminStockPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<{ id: string; mode: EditMode; value: string; unitCost: string; note: string } | null>(null);
  const [history, setHistory] = useState<{ id: string; items: Movement[]; lots: Lot[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  // Formulir utama: input stok baru + harga pembelian per keping.
  const [incoming, setIncoming] = useState({ priceId: "", qty: "", cost: "", note: "" });
  const [savingIncoming, setSavingIncoming] = useState(false);

  const onError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
    toast.error(err instanceof Error ? err.message : fallback);
  };

  useEffect(() => {
    let ignore = false;
    api<StockRow[]>("/api/admin/stock")
      .then((d) => { if (!ignore) setRows(d); })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat stok");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [router, reloadKey]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.product_name} ${r.type_name} ${r.brand_name}`.toLowerCase().includes(q)) : rows;
  }, [rows, filter]);

  const tracked = rows.filter((r) => r.stock !== null);
  const totalUnits = tracked.reduce((s, r) => s + (r.stock ?? 0), 0);
  const totalValue = tracked.reduce((s, r) => s + Number(r.nilai_modal ?? 0), 0);
  const outOfStock = tracked.filter((r) => r.stock === 0).length;

  const submitIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(incoming.qty);
    const cost = Number(incoming.cost);
    if (!incoming.priceId) { toast.error("Pilih produk terlebih dahulu"); return; }
    if (!Number.isInteger(qty) || qty <= 0) { toast.error("Jumlah harus bilangan bulat lebih dari 0"); return; }
    if (!(cost > 0)) { toast.error("Harga pembelian per keping wajib diisi"); return; }
    try {
      setSavingIncoming(true);
      await api(`/api/admin/stock/${incoming.priceId}`, {
        method: "PATCH",
        body: { mode: "purchase", value: qty, unit_cost: cost, note: incoming.note },
      });
      toast.success(`Stok masuk ${qty} keping dicatat · kas keluar ${formatRupiah(qty * cost)}`);
      setIncoming({ priceId: "", qty: "", cost: "", note: "" });
      if (history?.id === incoming.priceId) setHistory(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      onError(err, "Gagal menyimpan stok masuk");
    } finally {
      setSavingIncoming(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      await api(`/api/admin/stock/${editing.id}`, {
        method: "PATCH",
        body: {
          mode: editing.mode,
          value: Number(editing.value),
          unit_cost: editing.unitCost === "" ? undefined : Number(editing.unitCost),
          note: editing.note,
        },
      });
      if (history?.id === editing.id) setHistory(null);
      toast.success(editing.mode === "purchase" ? "Stok masuk dicatat — kas keluar otomatis tercatat" : "Stok diperbarui");
      setReloadKey((k) => k + 1); // muat ulang nilai modal FIFO dari server
      setEditing(null);
    } catch (err) {
      onError(err, "Gagal menyimpan stok");
    } finally {
      setSaving(false);
    }
  };

  const untrack = async (row: StockRow) => {
    if (!confirm(`Berhenti melacak stok ${row.brand_name} ${row.product_name} ${row.type_name}? Produk akan bisa dipesan tanpa batas.`)) return;
    try {
      await api(`/api/admin/stock/${row.id}`, { method: "PATCH", body: { mode: "untrack" } });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, stock: null } : r)));
      toast.success("Stok tidak lagi dilacak");
    } catch (err) {
      onError(err, "Gagal mengubah");
    }
  };

  const showHistory = async (row: StockRow) => {
    if (history?.id === row.id) { setHistory(null); return; }
    try {
      const d = await api<{ movements: Movement[]; lots: Lot[] }>(`/api/admin/stock?price_id=${row.id}`);
      setHistory({ id: row.id, items: d.movements, lots: d.lots });
    } catch (err) {
      onError(err, "Gagal memuat riwayat");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Stok <span className="text-[#1c424f]">Produk</span></h1>
          <p className="text-sm text-gray-500">Stok per brand × pecahan dengan modal FIFO. Kosong = tidak dilacak (bisa dipesan tanpa batas).</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Dilacak", `${tracked.length} dari ${rows.length}`],
            ["Total keping", totalUnits.toLocaleString("id-ID")],
            ["Nilai stok (modal FIFO)", formatRupiah(totalValue)],
            ["Stok habis", String(outOfStock)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white rounded-2xl border border-[#908974]/30 p-4">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="mt-1 text-lg font-bold text-[#1c424f] tabular-nums">{v}</p>
            </div>
          ))}
        </div>

        {/* ── Input stok baru ─────────────────────────────────── */}
        <form onSubmit={submitIncoming} className="bg-white rounded-2xl border-2 border-emerald-600/30 p-5 space-y-4">
          <div>
            <h2 className="font-bold text-gray-900">Input stok baru</h2>
            <p className="text-sm text-gray-500">
              Barang masuk dari pusat beserta harga pembeliannya. Stok bertambah, modal dicatat (FIFO), dan kas keluar tercatat otomatis.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1.3fr_1.5fr_auto] md:items-end">
            <label className="block text-xs font-semibold text-gray-600">
              Produk
              <select required value={incoming.priceId} onChange={(e) => setIncoming((f) => ({ ...f, priceId: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm">
                <option value="">Pilih produk & brand</option>
                {[...new Set(rows.map((r) => r.product_name))].map((product) => (
                  <optgroup key={product} label={product}>
                    {rows.filter((r) => r.product_name === product).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.product_name} {r.type_name} — {r.brand_name}{r.stock !== null ? ` (stok ${r.stock})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Jumlah (keping)
              <input type="number" required min={1} step={1} value={incoming.qty}
                onChange={(e) => setIncoming((f) => ({ ...f, qty: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm" placeholder="5" />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Harga pembelian / keping (Rp)
              <input type="number" required min={1} step={1} value={incoming.cost}
                onChange={(e) => setIncoming((f) => ({ ...f, cost: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm" placeholder="6250000" />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Keterangan
              <input value={incoming.note} maxLength={300}
                onChange={(e) => setIncoming((f) => ({ ...f, note: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm" placeholder="No. faktur pusat" />
            </label>
            <button type="submit" disabled={savingIncoming}
              className="px-5 py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap">
              {savingIncoming ? "Menyimpan..." : "Simpan stok masuk"}
            </button>
          </div>
          {Number(incoming.qty) > 0 && Number(incoming.cost) > 0 && (
            <p className="text-sm text-gray-700">
              Total pembelian: <span className="font-bold tabular-nums">{formatRupiah(Number(incoming.qty) * Number(incoming.cost))}</span>
              <span className="text-gray-500"> — dicatat sebagai kas keluar &quot;Pembelian stok&quot;</span>
            </p>
          )}
        </form>

        <div className="flex flex-wrap gap-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari produk / brand..."
            className="w-full sm:w-72 px-4 py-2.5 border border-[#908974]/40 rounded-xl bg-white focus:outline-none focus:border-[#1c424f]"
          />
          <button onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-[#908974]/40 text-[#1c424f] hover:bg-white/70 transition">
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#908974]/30 overflow-x-auto">
          {loading ? (
            <p className="p-10 text-center text-gray-500">Memuat stok...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#908974]/20">
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-right">Nilai modal</th>
                  <th className="px-4 py-3">Terakhir berubah</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <FragmentRow key={r.id}>
                    <tr className="border-b border-[#f2ece0] align-middle">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{r.product_name} {r.type_name}</p>
                        <p className="text-xs text-gray-500">{r.weight} gram</p>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{r.brand_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.stock === null ? (
                          <span className="text-gray-400">tidak dilacak</span>
                        ) : r.stock === 0 ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Habis</span>
                        ) : (
                          <span className={`font-bold ${r.stock <= 5 ? "text-amber-600" : "text-gray-900"}`}>{r.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {r.stock ? formatRupiah(Number(r.nilai_modal)) : "—"}
                        {r.stock && r.modal_berikutnya !== null ? (
                          <span className="block text-[11px] text-gray-400">keluar berikutnya @ {formatRupiah(r.modal_berikutnya)}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.last_movement ? formatDate(r.last_movement) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button onClick={() => setEditing({ id: r.id, mode: "purchase", value: "", unitCost: "", note: "" })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                            + Masuk dari pusat
                          </button>
                          <button onClick={() => setEditing({ id: r.id, mode: "set", value: String(r.stock ?? 0), unitCost: "", note: "" })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c424f] text-white hover:bg-[#15323c]">
                            {r.stock === null ? "Lacak stok" : "Set"}
                          </button>
                          {r.stock !== null && (
                            <>
                              <button onClick={() => setEditing({ id: r.id, mode: "adjust", value: "", unitCost: "", note: "" })}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#ce9233] text-white hover:bg-[#b87f2d]">
                                ± Sesuaikan
                              </button>
                              <button onClick={() => showHistory(r)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#908974]/40 text-[#1c424f] hover:bg-[#f7f4ed]">
                                Riwayat
                              </button>
                              <button onClick={() => untrack(r)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600">
                                Lepas
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {editing?.id === r.id && (
                      <tr className="bg-[#f7f4ed]">
                        <td colSpan={6} className="px-4 py-4">
                          <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                            <label className="text-sm">
                              <span className="block text-xs font-semibold text-gray-600 mb-1">
                                {editing.mode === "purchase" ? "Jumlah masuk (keping)" : editing.mode === "set" ? "Jumlah stok" : "Tambah (+) / kurangi (−)"}
                              </span>
                              <input type="number" step={1} required autoFocus value={editing.value}
                                min={editing.mode === "adjust" ? undefined : editing.mode === "purchase" ? 1 : 0}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                className="w-36 px-3 py-2 border border-[#908974]/40 rounded-lg bg-white" />
                            </label>
                            <label className="text-sm">
                              <span className="block text-xs font-semibold text-gray-600 mb-1">
                                {editing.mode === "purchase" ? "Harga beli dari pusat / keping" : "Harga modal / keping (opsional)"}
                              </span>
                              <input type="number" step={1} min={editing.mode === "purchase" ? 1 : 0}
                                required={editing.mode === "purchase"} value={editing.unitCost}
                                onChange={(e) => setEditing({ ...editing, unitCost: e.target.value })}
                                placeholder={editing.mode === "purchase" ? "6250000" : "kosong = modal terakhir"}
                                className="w-48 px-3 py-2 border border-[#908974]/40 rounded-lg bg-white" />
                            </label>
                            {editing.mode === "purchase" && Number(editing.value) > 0 && Number(editing.unitCost) > 0 && (
                              <p className="text-xs text-gray-600 pb-2">
                                Kas keluar otomatis: <span className="font-semibold">{formatRupiah(Number(editing.value) * Number(editing.unitCost))}</span>
                              </p>
                            )}
                            <label className="text-sm flex-1 min-w-48">
                              <span className="block text-xs font-semibold text-gray-600 mb-1">Catatan (opsional)</span>
                              <input value={editing.note} maxLength={300}
                                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                                placeholder={editing.mode === "purchase" ? "No. faktur pusat" : editing.mode === "set" ? "Hitung fisik" : "Koreksi"}
                                className="w-full px-3 py-2 border border-[#908974]/40 rounded-lg bg-white" />
                            </label>
                            <button type="submit" disabled={saving}
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1c424f] text-white disabled:opacity-60">
                              {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600">
                              Batal
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}
                    {history?.id === r.id && (
                      <tr className="bg-[#fcfaf6]">
                        <td colSpan={6} className="px-4 py-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Lot tersisa (FIFO: atas keluar lebih dulu)</p>
                          {history.lots.length === 0 ? (
                            <p className="mb-4 text-sm text-gray-500">Tidak ada lot tersisa.</p>
                          ) : (
                            <table className="mb-4 w-full text-xs">
                              <tbody>
                                {history.lots.map((l) => (
                                  <tr key={l.id} className="border-b border-[#f2ece0] last:border-0">
                                    <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                                    <td className="py-1.5 pr-3">{LOT_SOURCE[l.source] ?? l.source}</td>
                                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{l.qty_remaining} / {l.qty_in} keping</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums">{l.unit_cost === null ? "modal ?" : `@ ${formatRupiah(Number(l.unit_cost))}`}</td>
                                    <td className="py-1.5 font-mono text-gray-500">{l.ref ?? ""}</td>
                                    <td className="py-1.5 text-gray-500">{l.note ?? ""}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Riwayat perubahan</p>
                          {history.items.length === 0 ? (
                            <p className="text-sm text-gray-500">Belum ada riwayat.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <tbody>
                                {history.items.map((m) => (
                                  <tr key={m.id} className="border-b border-[#f2ece0] last:border-0">
                                    <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{formatDate(m.created_at)}</td>
                                    <td className="py-1.5 pr-3">{REASON_LABEL[m.reason] ?? m.reason}</td>
                                    <td className={`py-1.5 pr-3 text-right font-semibold tabular-nums ${m.change > 0 ? "text-emerald-700" : "text-red-600"}`}>
                                      {m.change > 0 ? `+${m.change}` : m.change}
                                    </td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums">→ {m.stock_after}</td>
                                    <td className="py-1.5 font-mono text-gray-500">{m.ref ?? ""}</td>
                                    <td className="py-1.5 text-gray-500">{m.note ?? ""}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
