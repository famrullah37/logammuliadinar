"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Minus, Plus, Search, X } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import { useMe } from "@/components/admin/useMe";
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
}

interface BankAccount {
  id?: string;
  bank: string;
  account_number: string;
  holder: string;
}

type Kind = "sale" | "buyback";
type Method = "cash" | "transfer";

interface Done {
  kind: Kind;
  number: string;
  receipt_number: string | null;
  receipt_token: string | null;
  total: number;
  name: string;
  phone: string;
  change: number | null;
}

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const formatGram = (w: number) => `${Number(w).toLocaleString("id-ID", { maximumFractionDigits: 4 })} g`;
const inputCls = "mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm focus:outline-none focus:border-[#1c424f]";
const labelCls = "block text-xs font-semibold text-gray-600";
const WALK_IN = "Pelanggan toko";

const EMPTY = {
  quantity: 1, customPrice: "", name: "", phone: "", email: "", notes: "",
  method: "cash" as Method, paid: "", bank: "", accountNumber: "", accountHolder: "",
  hasCertificate: true, hasPackaging: true,
};

/** Link wa.me ke nomor pelanggan (08xx → 628xx). */
const waLink = (phone: string, text: string) => {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};

/** Nominal uang tunai cepat: pas, lalu dibulatkan ke atas ke 50 rb / 100 rb / 1 jt. */
const quickCash = (total: number) =>
  [...new Set([total, Math.ceil(total / 50_000) * 50_000, Math.ceil(total / 100_000) * 100_000, Math.ceil(total / 1_000_000) * 1_000_000])]
    .filter((v) => v >= total)
    .slice(0, 4);

export default function StorePosPage() {
  const router = useRouter();
  const me = useMe();
  const isAdmin = me?.role === "admin";
  const [rows, setRows] = useState<StockRow[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [kind, setKind] = useState<Kind>("sale");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [account, setAccount] = useState({ bank: "", account_number: "", holder: "" });

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
        toast.error(err instanceof Error ? err.message : "Gagal memuat produk");
      });
    return () => { ignore = true; };
  }, [router, reloadKey]);

  // Rekening toko: admin bisa mengelola (butuh id), kasir cukup melihat.
  useEffect(() => {
    if (!me) return;
    let ignore = false;
    const load = isAdmin
      ? api<{ bank_accounts: BankAccount[] }>("/api/admin/data").then((d) => d.bank_accounts)
      : api<BankAccount[]>("/api/bank-accounts");
    load.then((a) => { if (!ignore) setAccounts(a); }).catch(() => undefined);
    return () => { ignore = true; };
  }, [me, isAdmin, reloadKey]);

  const isSale = kind === "sale";
  const priceOf = (r: StockRow) => Number(isSale ? r.harga_beli : r.harga_buyback);
  const categories = useMemo(() => ["Semua", ...new Set(rows.map((r) => r.product_name))], [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      (category === "Semua" || r.product_name === category) &&
      (!q || `${r.product_name} ${r.type_name} ${r.brand_name}`.toLowerCase().includes(q)));
  }, [rows, query, category]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const todayPrice = selected ? priceOf(selected) : 0;
  const unit = isAdmin && Number(form.customPrice) > 0 ? Number(form.customPrice) : todayPrice;
  const total = selected ? unit * form.quantity : 0;
  const maxQty = isSale && selected?.stock != null ? selected.stock : 1000;
  const paid = Number(form.paid);
  const change = isSale && form.method === "cash" && paid > 0 ? paid - total : null;
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pick = (r: StockRow) => {
    if (isSale && r.stock === 0) { toast.error("Stok habis"); return; }
    setDone(null);
    if (r.id === selectedId) { set("quantity", Math.min(form.quantity + 1, isSale && r.stock != null ? r.stock : 1000)); return; }
    setSelectedId(r.id);
    setForm((f) => ({ ...f, quantity: 1, customPrice: "", paid: "" }));
  };
  const switchKind = (k: Kind) => {
    setKind(k);
    setDone(null);
    setSelectedId("");
    setForm(EMPTY);
  };
  const clear = () => { setSelectedId(""); setForm(EMPTY); };

  const submit = async () => {
    if (!selected) { toast.error("Pilih produk"); return; }
    if (!(todayPrice > 0) && !(isAdmin && Number(form.customPrice) > 0)) { toast.error("Harga produk ini belum diisi"); return; }
    if (isSale && form.method === "cash" && paid > 0 && paid < total) { toast.error("Uang diterima kurang dari total"); return; }
    const name = form.name.trim() || WALK_IN;
    if (!isSale && !form.name.trim()) { toast.error("Nama penjual wajib diisi untuk buyback"); return; }
    const label = isSale ? "penjualan" : "buyback";
    if (!window.confirm(`Simpan ${label} ${selected.product_name} ${selected.type_name} × ${form.quantity} = ${formatRupiah(total)}?`)) return;
    try {
      setSaving(true);
      const res = await api<{ number: string; receipt_number: string | null; receipt_token: string | null; total: number }>(
        "/api/admin/store",
        {
          method: "POST",
          body: {
            kind,
            price_id: selected.id,
            quantity: form.quantity,
            unit_price: isAdmin && Number(form.customPrice) > 0 ? Number(form.customPrice) : undefined,
            name,
            phone: form.phone,
            email: form.email,
            notes: form.notes,
            payment_method: form.method,
            bank: form.bank,
            account_number: form.accountNumber,
            account_holder: form.accountHolder,
            has_certificate: form.hasCertificate,
            has_packaging: form.hasPackaging,
          },
        },
      );
      setDone({ kind, ...res, name, phone: form.phone.trim(), change: change !== null && change >= 0 ? change : null });
      toast.success(`Tersimpan · nota ${res.receipt_number}`);
      clear();
      setReloadKey((k) => k + 1);
    } catch (err) {
      onError(err, "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/bank_accounts", { method: "POST", body: account });
      toast.success("Rekening ditambahkan");
      setAccount({ bank: "", account_number: "", holder: "" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      onError(err, "Gagal menambah rekening");
    }
  };

  const removeAccount = async (a: BankAccount) => {
    if (!a.id || !window.confirm(`Hapus rekening ${a.bank} ${a.account_number}?`)) return;
    try {
      await api(`/api/admin/bank_accounts/${a.id}`, { method: "DELETE" });
      toast.success("Rekening dihapus");
      setReloadKey((k) => k + 1);
    } catch (err) {
      onError(err, "Gagal menghapus rekening");
    }
  };

  const accent = isSale ? "emerald" : "gold";

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kasir <span className="text-[#1c424f]">Toko</span></h1>
            <p className="text-sm text-gray-500">Penjualan & buyback langsung di toko · harga hari ini · nota langsung terbit.</p>
          </div>
          <div className="inline-flex rounded-xl border border-[#908974]/30 bg-[#f7f4ed] p-1">
            {([["sale", "Penjualan"], ["buyback", "Buyback"]] as [Kind, string][]).map(([k, label]) => (
              <button key={k} type="button" onClick={() => switchKind(k)}
                className={`rounded-lg px-6 py-2.5 text-sm font-bold transition ${
                  kind === k ? (k === "sale" ? "bg-emerald-600 text-white" : "bg-[#ce9233] text-white") : "text-gray-600 hover:bg-white"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {done && (
          <div className="rounded-2xl border-2 border-emerald-600/40 bg-emerald-50 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-emerald-800">
                {done.kind === "sale" ? "Penjualan" : "Buyback"} tersimpan · {formatRupiah(done.total)}
              </p>
              <p className="text-sm text-gray-700">
                {done.name} · No. {done.number} · Nota <span className="font-mono font-semibold">{done.receipt_number}</span>
              </p>
              {done.change !== null && (
                <p className="mt-1 text-lg font-bold text-emerald-800">Kembalian: {formatRupiah(done.change)}</p>
              )}
            </div>
            {done.receipt_token && (
              <div className="flex flex-wrap gap-2">
                <a href={`/nota/${done.receipt_token}`} target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#1c424f] hover:bg-[#15323c] text-white">
                  Lihat / cetak nota
                </a>
                {done.phone && (
                  <a target="_blank" rel="noopener noreferrer"
                    href={waLink(done.phone, `Assalamu'alaikum ${done.name}, terima kasih atas transaksi ${done.kind === "sale" ? "pembelian" : "buyback"} di Logam Mulia Dinar. Berikut nota ${done.receipt_number}: ${window.location.origin}/nota/${done.receipt_token}`)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">
                    Kirim nota via WA
                  </a>
                )}
                <button type="button" onClick={() => setDone(null)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-emerald-700/30 text-emerald-800 hover:bg-white">
                  Transaksi baru
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* ── Daftar produk ─────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk / brand..."
                  aria-label="Cari produk"
                  className="w-full rounded-xl border border-[#908974]/40 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-[#1c424f]" />
              </div>
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    category === c ? "bg-[#1c424f] text-white" : "bg-white text-gray-700 border border-[#908974]/30 hover:bg-[#f2ece0]"
                  }`}>
                  {c}
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className="rounded-2xl bg-white p-8 text-center text-gray-500">
                Belum ada produk berharga. {isAdmin ? "Isi Brand & Data Harga di menu Produk & Harga." : "Minta admin mengisi harga."}
              </p>
            ) : visible.length === 0 ? (
              <p className="rounded-2xl bg-white p-8 text-center text-gray-500">Tidak ada produk yang cocok.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((r) => {
                  const soldOut = isSale && r.stock === 0;
                  const active = r.id === selectedId;
                  return (
                    <button key={r.id} type="button" onClick={() => pick(r)} disabled={soldOut} aria-pressed={active}
                      className={`flex min-h-[132px] flex-col rounded-2xl border-2 bg-white p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? accent === "emerald" ? "border-emerald-600 ring-4 ring-emerald-600/15" : "border-[#ce9233] ring-4 ring-[#ce9233]/20"
                          : "border-transparent shadow-sm hover:border-[#908974]/40"
                      }`}>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{r.brand_name}</span>
                      <span className="mt-0.5 font-bold leading-snug text-gray-900">{r.type_name}</span>
                      <span className="text-xs text-gray-500">{r.product_name} · {formatGram(r.weight)}</span>
                      <span className="mt-auto pt-2 font-bold tabular-nums text-[#1c424f]">
                        {priceOf(r) > 0 ? formatRupiah(priceOf(r)) : "—"}
                      </span>
                      <span className={`text-xs font-semibold ${
                        r.stock === null ? "text-gray-400" : r.stock === 0 ? "text-red-600" : r.stock <= 5 ? "text-amber-600" : "text-emerald-700"
                      }`}>
                        {r.stock === null ? "stok tidak dilacak" : r.stock === 0 ? "habis" : `stok ${r.stock}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Panel transaksi ───────────────────────────────── */}
          <aside className={`rounded-2xl border-2 bg-white p-5 space-y-4 lg:sticky lg:top-4 ${isSale ? "border-emerald-600/30" : "border-[#ce9233]/40"}`}>
            <h2 className="font-bold text-gray-900">{isSale ? "Penjualan" : "Buyback"}</h2>

            {!selected ? (
              <p className="rounded-xl bg-[#f7f4ed] p-6 text-center text-sm text-gray-500">Ketuk produk di sebelah kiri.</p>
            ) : (
              <>
                <div className="rounded-xl bg-[#f7f4ed] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{selected.product_name} {selected.type_name}</p>
                      <p className="text-xs text-gray-500">{selected.brand_name} · {formatGram(selected.weight)}</p>
                    </div>
                    <button type="button" onClick={clear} aria-label="Batalkan pilihan" className="text-gray-400 hover:text-red-600">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="Kurangi" onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#908974]/40 bg-white hover:bg-[#f2ece0]">
                        <Minus size={18} />
                      </button>
                      <input type="number" min={1} max={maxQty} value={form.quantity} aria-label="Jumlah keping"
                        onChange={(e) => set("quantity", Math.min(maxQty, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                        className="h-10 w-16 rounded-lg border border-[#908974]/40 text-center font-bold tabular-nums" />
                      <button type="button" aria-label="Tambah" onClick={() => set("quantity", Math.min(maxQty, form.quantity + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#908974]/40 bg-white hover:bg-[#f2ece0]">
                        <Plus size={18} />
                      </button>
                    </div>
                    <span className="text-sm tabular-nums text-gray-600">@ {formatRupiah(unit)}</span>
                  </div>
                  {isAdmin && (
                    <label className="mt-3 block text-xs font-semibold text-gray-600">
                      Harga khusus / keping <span className="font-normal text-gray-400">(admin, opsional)</span>
                      <input type="number" min={1} step={1} value={form.customPrice} placeholder={String(todayPrice)}
                        onChange={(e) => set("customPrice", e.target.value)} className={inputCls} />
                    </label>
                  )}
                </div>

                <div className="flex items-baseline justify-between border-y border-[#f2ece0] py-3">
                  <span className="text-sm text-gray-600">Total {isSale ? "bayar" : "dibayarkan"}</span>
                  <span className="text-2xl font-bold tabular-nums text-[#1c424f]">{formatRupiah(total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([["cash", "Tunai"], ["transfer", "Transfer"]] as [Method, string][]).map(([m, label]) => (
                    <button key={m} type="button" onClick={() => set("method", m)}
                      className={`rounded-lg border py-2.5 text-sm font-semibold transition ${
                        form.method === m ? "border-[#1c424f] bg-[#1c424f] text-white" : "border-[#908974]/40 text-gray-700 hover:bg-[#f7f4ed]"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>

                {isSale && form.method === "cash" && (
                  <div className="space-y-2">
                    <label className={labelCls}>
                      Uang diterima
                      <input type="number" min={0} step={1000} value={form.paid} onChange={(e) => set("paid", e.target.value)}
                        className={`${inputCls} text-lg font-bold tabular-nums`} placeholder="0" />
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {quickCash(total).map((v) => (
                        <button key={v} type="button" onClick={() => set("paid", String(v))}
                          className="rounded-lg border border-[#908974]/40 px-2.5 py-1.5 text-xs font-semibold tabular-nums hover:bg-[#f7f4ed]">
                          {v === total ? "Uang pas" : formatRupiah(v)}
                        </button>
                      ))}
                    </div>
                    {change !== null && (
                      <p className={`text-lg font-bold tabular-nums ${change < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {change < 0 ? `Kurang ${formatRupiah(-change)}` : `Kembalian ${formatRupiah(change)}`}
                      </p>
                    )}
                  </div>
                )}

                {isSale && form.method === "transfer" && (
                  <div className="rounded-xl bg-[#f7f4ed] p-3 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-700">Transfer ke rekening toko, pastikan dana sudah masuk:</p>
                    {accounts.length === 0 ? (
                      <p className="text-amber-700">Rekening toko belum diisi admin.</p>
                    ) : accounts.map((a) => (
                      <p key={`${a.bank}-${a.account_number}`}>
                        {a.bank} <span className="font-mono font-semibold">{a.account_number}</span> a.n. {a.holder}
                      </p>
                    ))}
                  </div>
                )}

                {!isSale && form.method === "transfer" && (
                  <div className="space-y-2">
                    <label className={labelCls}>
                      Bank penjual
                      <input maxLength={50} value={form.bank} onChange={(e) => set("bank", e.target.value)} className={inputCls} placeholder="BSI / BRI / BCA" />
                    </label>
                    <label className={labelCls}>
                      No. rekening
                      <input inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} className={inputCls} />
                    </label>
                    <label className={labelCls}>
                      Atas nama
                      <input maxLength={120} value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} className={inputCls} />
                    </label>
                  </div>
                )}

                {!isSale && (
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.hasCertificate} onChange={(e) => set("hasCertificate", e.target.checked)} />
                      Ada sertifikat
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={form.hasPackaging} onChange={(e) => set("hasPackaging", e.target.checked)} />
                      Ada kemasan
                    </label>
                  </div>
                )}

                <details className="rounded-xl border border-[#908974]/30 p-3" open={!isSale}>
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                    Data {isSale ? "pembeli (opsional)" : "penjual"}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <label className={labelCls}>
                      Nama {isSale && <span className="font-normal text-gray-400">(kosong = &quot;{WALK_IN}&quot;)</span>}
                      <input maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
                    </label>
                    <label className={labelCls}>
                      No. HP / WhatsApp <span className="font-normal text-gray-400">(untuk kirim nota)</span>
                      <input inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="08xx" />
                    </label>
                    <label className={labelCls}>
                      Catatan <span className="font-normal text-gray-400">(tampil di nota)</span>
                      <textarea rows={2} maxLength={2000} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
                    </label>
                  </div>
                </details>

                <button type="button" onClick={submit} disabled={saving || total <= 0}
                  className={`w-full rounded-xl py-3.5 text-base font-bold text-white disabled:opacity-60 ${
                    isSale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#ce9233] hover:bg-[#b87f2d]"
                  }`}>
                  {saving ? "Menyimpan..." : isSale ? "Bayar & terbitkan nota" : "Simpan buyback & terbitkan nota"}
                </button>
              </>
            )}
          </aside>
        </div>

        {/* ── Rekening toko (kelola: admin) ─────────────────────── */}
        {isAdmin && (
          <section className="bg-white rounded-2xl border border-[#908974]/30 p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-bold text-gray-900">Rekening toko</h2>
              <p className="text-sm text-gray-500">Rekening tujuan transfer yang ditampilkan ke pembeli (checkout & kasir).</p>
            </div>
            {accounts.length === 0 ? (
              <p className="text-sm text-amber-700">Belum ada rekening. Pembeli akan diberi tahu bahwa nomor rekening dikirim via WhatsApp.</p>
            ) : (
              <ul className="divide-y divide-[#f2ece0]">
                {accounts.map((a) => (
                  <li key={a.id ?? a.account_number} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold text-gray-900">{a.bank}</span>{" "}
                      <span className="font-mono">{a.account_number}</span>{" "}
                      <span className="text-gray-500">a.n. {a.holder}</span>
                    </span>
                    <button type="button" onClick={() => removeAccount(a)} className="text-xs font-semibold text-red-600 hover:underline">
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addAccount} className="grid gap-3 md:grid-cols-[1fr_1.3fr_1.5fr_auto] md:items-end">
              <label className={labelCls}>
                Bank
                <input required maxLength={50} value={account.bank} onChange={(e) => setAccount((a) => ({ ...a, bank: e.target.value }))} className={inputCls} placeholder="BSI" />
              </label>
              <label className={labelCls}>
                No. rekening
                <input required inputMode="numeric" maxLength={30} value={account.account_number}
                  onChange={(e) => setAccount((a) => ({ ...a, account_number: e.target.value }))} className={inputCls} />
              </label>
              <label className={labelCls}>
                Atas nama
                <input required maxLength={120} value={account.holder} onChange={(e) => setAccount((a) => ({ ...a, holder: e.target.value }))} className={inputCls} />
              </label>
              <button type="submit" className="px-5 py-2.5 rounded-lg font-semibold bg-[#1c424f] hover:bg-[#15323c] text-white whitespace-nowrap">
                Tambah rekening
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
