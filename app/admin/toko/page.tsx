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
}

interface BankAccount {
  id: string;
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
}

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const inputCls = "mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm focus:outline-none focus:border-[#1c424f]";
const labelCls = "block text-xs font-semibold text-gray-600";

const EMPTY = {
  priceId: "", quantity: "1", unitPrice: "", name: "", phone: "", email: "", notes: "",
  method: "cash" as Method, bank: "", accountNumber: "", accountHolder: "",
  hasCertificate: true, hasPackaging: true,
};

/** Link wa.me ke nomor pelanggan (08xx → 628xx). */
const waLink = (phone: string, text: string) => {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};

export default function AdminStorePage() {
  const router = useRouter();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [kind, setKind] = useState<Kind>("sale");
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
    Promise.all([
      api<StockRow[]>("/api/admin/stock"),
      api<{ bank_accounts: BankAccount[] }>("/api/admin/data"),
    ])
      .then(([stock, data]) => {
        if (ignore) return;
        setRows(stock);
        setAccounts(data.bank_accounts);
      })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat data");
      });
    return () => { ignore = true; };
  }, [router, reloadKey]);

  const selected = useMemo(() => rows.find((r) => r.id === form.priceId), [rows, form.priceId]);
  const qty = Number(form.quantity);
  const unit = Number(form.unitPrice);
  const total = qty > 0 && unit > 0 ? qty * unit : 0;
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Harga bawaan mengikuti harga hari ini (jual / buyback) dan masih bisa diubah.
  const pickProduct = (priceId: string, k: Kind = kind) => {
    const r = rows.find((x) => x.id === priceId);
    setForm((f) => ({ ...f, priceId, unitPrice: r ? String(k === "sale" ? r.harga_beli : r.harga_buyback) : "" }));
  };
  const switchKind = (k: Kind) => {
    setKind(k);
    setDone(null);
    if (form.priceId) pickProduct(form.priceId, k);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.priceId) { toast.error("Pilih produk"); return; }
    if (!Number.isInteger(qty) || qty < 1) { toast.error("Jumlah minimal 1"); return; }
    if (!(unit > 0)) { toast.error("Harga per keping wajib diisi"); return; }
    const label = kind === "sale" ? "penjualan" : "buyback";
    if (!window.confirm(`Simpan ${label} ${formatRupiah(total)} atas nama ${form.name.trim()}? Transaksi langsung selesai dan nota terbit.`)) return;
    try {
      setSaving(true);
      const res = await api<{ number: string; receipt_number: string | null; receipt_token: string | null; total: number }>(
        "/api/admin/store",
        {
          method: "POST",
          body: {
            kind,
            price_id: form.priceId,
            quantity: qty,
            unit_price: unit,
            name: form.name,
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
      setDone({ kind, ...res, name: form.name.trim(), phone: form.phone.trim() });
      toast.success(`Transaksi tersimpan · nota ${res.receipt_number}`);
      setForm(EMPTY);
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
    if (!window.confirm(`Hapus rekening ${a.bank} ${a.account_number}?`)) return;
    try {
      await api(`/api/admin/bank_accounts/${a.id}`, { method: "DELETE" });
      toast.success("Rekening dihapus");
      setReloadKey((k) => k + 1);
    } catch (err) {
      onError(err, "Gagal menghapus rekening");
    }
  };

  const products = [...new Set(rows.map((r) => r.product_name))];
  const isSale = kind === "sale";

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Transaksi <span className="text-[#1c424f]">Toko</span></h1>
          <p className="text-sm text-gray-500">
            Penjualan & buyback langsung di toko. Langsung selesai: stok, kas, zakat (penjualan), dan nota tercatat otomatis.
          </p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="inline-flex rounded-xl border border-[#908974]/30 bg-white p-1">
          {([["sale", "Penjualan"], ["buyback", "Buyback"]] as [Kind, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => switchKind(k)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                kind === k ? (k === "sale" ? "bg-emerald-600 text-white" : "bg-[#ce9233] text-white") : "text-gray-600 hover:bg-[#f7f4ed]"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {done && (
          <div className="rounded-2xl border-2 border-emerald-600/40 bg-emerald-50 p-5 space-y-3">
            <p className="font-bold text-emerald-800">
              {done.kind === "sale" ? "Penjualan" : "Buyback"} tersimpan · {formatRupiah(done.total)}
            </p>
            <p className="text-sm text-gray-700">
              No. {done.number} · Nota <span className="font-mono font-semibold">{done.receipt_number}</span>
            </p>
            {done.receipt_token && (
              <div className="flex flex-wrap gap-2">
                <a href={`/nota/${done.receipt_token}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1c424f] hover:bg-[#15323c] text-white">
                  Lihat / cetak nota
                </a>
                {done.phone && (
                  <a target="_blank" rel="noopener noreferrer"
                    href={waLink(done.phone, `Assalamu'alaikum ${done.name}, terima kasih atas transaksi ${done.kind === "sale" ? "pembelian" : "buyback"} di Logam Mulia Dinar. Berikut nota ${done.receipt_number}: ${window.location.origin}/nota/${done.receipt_token}`)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white">
                    Kirim nota via WA
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className={`bg-white rounded-2xl border-2 p-5 sm:p-6 space-y-5 ${isSale ? "border-emerald-600/30" : "border-[#ce9233]/40"}`}>
          <h2 className="font-bold text-gray-900">{isSale ? "Penjualan di toko" : "Buyback di toko"}</h2>

          <div className="grid gap-3 md:grid-cols-[2fr_0.8fr_1.2fr]">
            <label className={labelCls}>
              Produk
              <select required value={form.priceId} onChange={(e) => pickProduct(e.target.value)} className={inputCls}>
                <option value="">{rows.length ? "Pilih produk & brand" : "Belum ada data harga — isi di Produk & Harga"}</option>
                {products.map((product) => (
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
            <label className={labelCls}>
              Jumlah (keping)
              <input type="number" required min={1} max={1000} step={1} value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              {isSale ? "Harga jual / keping (Rp)" : "Harga buyback / keping (Rp)"}
              <input type="number" required min={1} step={1} value={form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)} className={inputCls} />
              {selected && (
                <span className="mt-1 block font-normal text-gray-500">
                  Harga hari ini: {formatRupiah(Number(isSale ? selected.harga_beli : selected.harga_buyback))}
                </span>
              )}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className={labelCls}>
              {isSale ? "Nama pembeli" : "Nama penjual"}
              <input required maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              No. HP / WhatsApp <span className="font-normal text-gray-400">(opsional)</span>
              <input inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="08xx" />
            </label>
            <label className={labelCls}>
              Email <span className="font-normal text-gray-400">(opsional)</span>
              <input type="email" maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
            </label>
          </div>

          <div className="space-y-3">
            <p className={labelCls}>{isSale ? "Pembayaran dari pembeli" : "Pembayaran ke penjual"}</p>
            <div className="flex flex-wrap gap-2">
              {([["cash", "Tunai"], ["transfer", "Transfer bank"]] as [Method, string][]).map(([m, label]) => (
                <button key={m} type="button" onClick={() => set("method", m)}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    form.method === m ? "border-[#1c424f] bg-[#1c424f] text-white" : "border-[#908974]/40 text-gray-700 hover:bg-[#f7f4ed]"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {isSale && form.method === "transfer" && (
              <p className="text-xs text-gray-500">
                Pastikan dana sudah masuk ke rekening toko sebelum menyimpan.
                {accounts.length === 0 && " Rekening toko belum diisi (lihat bagian bawah halaman ini)."}
              </p>
            )}
            {!isSale && form.method === "transfer" && (
              <div className="grid gap-3 md:grid-cols-3">
                <label className={labelCls}>
                  Bank penjual
                  <input required maxLength={50} value={form.bank} onChange={(e) => set("bank", e.target.value)} className={inputCls} placeholder="BSI / BRI / BCA" />
                </label>
                <label className={labelCls}>
                  No. rekening
                  <input required inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Atas nama
                  <input required maxLength={120} value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} className={inputCls} />
                </label>
              </div>
            )}
          </div>

          {!isSale && (
            <div className="flex flex-wrap gap-5 text-sm text-gray-700">
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

          <label className={labelCls}>
            Catatan <span className="font-normal text-gray-400">(opsional, tampil di nota)</span>
            <textarea rows={2} maxLength={2000} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f2ece0] pt-4">
            <p className="text-sm text-gray-600">
              Total {isSale ? "diterima" : "dibayarkan"}:{" "}
              <span className="text-xl font-bold text-[#1c424f] tabular-nums">{formatRupiah(total)}</span>
            </p>
            <button type="submit" disabled={saving}
              className={`px-6 py-2.5 rounded-lg font-semibold text-white disabled:opacity-60 ${
                isSale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#ce9233] hover:bg-[#b87f2d]"
              }`}>
              {saving ? "Menyimpan..." : isSale ? "Simpan penjualan & terbitkan nota" : "Simpan buyback & terbitkan nota"}
            </button>
          </div>
        </form>

        {/* ── Rekening toko ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#908974]/30 p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-bold text-gray-900">Rekening toko</h2>
            <p className="text-sm text-gray-500">Rekening tujuan transfer yang ditampilkan ke pembeli setelah checkout.</p>
          </div>
          {accounts.length === 0 ? (
            <p className="text-sm text-amber-700">Belum ada rekening. Pembeli akan diberi tahu bahwa nomor rekening dikirim via WhatsApp.</p>
          ) : (
            <ul className="divide-y divide-[#f2ece0]">
              {accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
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
      </main>
    </div>
  );
}
