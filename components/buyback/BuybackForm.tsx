"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, Minus, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { whatsappLink } from "@/lib/site";

export interface BuybackOption {
  brand_id: string;
  brand_name: string;
  variant_id: string;
  variant_label: string;
  weight: number;
  harga_buyback: number;
}

const formatRupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
const inputCls =
  "w-full rounded-xl border border-brand-olive/30 bg-white px-4 py-3 text-sm focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/10";

interface Result {
  request_number: string;
  harga_buyback: number;
  total_estimasi: number;
  quantity: number;
}

export default function BuybackForm({
  options,
  initialBrandId,
  initialVariantId,
}: {
  options: BuybackOption[];
  initialBrandId?: string;
  initialVariantId?: string;
}) {
  const brands = useMemo(
    () => [...new Map(options.map((o) => [o.brand_id, o.brand_name])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id-ID")),
    [options],
  );
  const [brandId, setBrandId] = useState(initialBrandId ?? "");
  const variantsForBrand = options.filter((o) => o.brand_id === brandId).sort((a, b) => a.weight - b.weight);
  const [variantId, setVariantId] = useState(initialVariantId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({
    seller_name: "",
    seller_phone: "",
    seller_email: "",
    has_certificate: true,
    has_packaging: true,
    handover_method: "store" as "store" | "shipping",
    notes: "",
    seller_bank: "",
    seller_account_number: "",
    seller_account_holder: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const selected = options.find((o) => o.brand_id === brandId && o.variant_id === variantId);

  const onBrandChange = (id: string) => {
    setBrandId(id);
    // Pertahankan pecahan bila brand baru juga punya harga untuk pecahan itu.
    if (!options.some((o) => o.brand_id === id && o.variant_id === variantId)) setVariantId("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selected) return setError("Pilih brand dan pecahan terlebih dahulu.");
    if (!form.seller_name.trim() || !form.seller_phone.trim()) return setError("Nama dan nomor WhatsApp wajib diisi.");
    try {
      setSubmitting(true);
      const res = await api<{ request: Result }>("/api/buyback", {
        method: "POST",
        body: { ...form, brand_id: selected.brand_id, variant_id: selected.variant_id, quantity },
      });
      setResult(res.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pengajuan");
    } finally {
      setSubmitting(false);
    }
  };

  if (result && selected) {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-xl shadow-brand-deep/5">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
        <h3 className="mt-4 font-display text-2xl font-bold text-brand-ink">Pengajuan buyback terkirim</h3>
        <p className="mt-2 text-gray-600">Admin kami akan menghubungi Anda via WhatsApp untuk jadwal pengecekan barang.</p>
        <div className="mx-auto mt-6 max-w-sm space-y-2 rounded-2xl bg-brand-cream p-5 text-left text-sm">
          <div className="flex justify-between gap-4"><span className="text-gray-500">No. pengajuan</span><span className="font-mono font-semibold">{result.request_number}</span></div>
          <div className="flex justify-between gap-4"><span className="text-gray-500">Barang</span><span className="text-right font-medium">{selected.brand_name} {selected.variant_label} × {result.quantity}</span></div>
          <div className="flex justify-between gap-4"><span className="text-gray-500">Estimasi nilai</span><span className="font-semibold tabular-nums">{formatRupiah(result.total_estimasi)}</span></div>
        </div>
        <p className="mt-4 text-xs text-gray-500">Nilai final ditetapkan setelah barang dicek. Nota buyback diterbitkan saat transaksi selesai.</p>
        <a
          href={whatsappLink(`Assalamu'alaikum, saya sudah mengajukan buyback dengan nomor ${result.request_number}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-6 py-3 font-semibold text-white transition hover:bg-brand-gold-dark"
        >
          <MessageCircle size={18} /> Konfirmasi via WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-[2rem] border border-brand-olive/15 bg-white p-6 shadow-xl shadow-brand-deep/5 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Brand</span>
          <select value={brandId} onChange={(e) => onBrandChange(e.target.value)} className={inputCls} required>
            <option value="">Pilih brand</option>
            {brands.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Pecahan</span>
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={inputCls} disabled={!brandId} required>
            <option value="">{brandId ? "Pilih pecahan" : "Pilih brand dulu"}</option>
            {variantsForBrand.map((o) => <option key={o.variant_id} value={o.variant_id}>{o.variant_label}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm font-semibold text-gray-700">Jumlah keping</span>
        <div className="flex items-center rounded-full border border-brand-olive/30">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-brand-cream disabled:opacity-40" aria-label="Kurangi jumlah">
            <Minus size={16} />
          </button>
          <span className="w-10 text-center text-lg font-semibold tabular-nums" aria-live="polite">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(1000, q + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-brand-cream" aria-label="Tambah jumlah">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-700">Kelengkapan</legend>
        <div className="flex flex-wrap gap-3">
          {([["has_certificate", "Ada sertifikat"], ["has_packaging", "Kemasan asli"]] as const).map(([key, label]) => (
            <label key={key} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-olive/30 px-4 py-2 text-sm has-[:checked]:border-brand-deep has-[:checked]:bg-brand-deep/[0.05]">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} className="accent-brand-deep" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-700">Cara serah barang</legend>
        <div className="grid grid-cols-2 gap-3">
          {([["store", "Datang ke toko"], ["shipping", "Kirim ke toko"]] as const).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-brand-olive/20 px-4 py-3 text-sm font-semibold has-[:checked]:border-brand-deep has-[:checked]:bg-brand-deep has-[:checked]:text-white">
              <input type="radio" name="handover" value={value} checked={form.handover_method === value}
                onChange={() => setForm((f) => ({ ...f, handover_method: value }))} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Nama lengkap</span>
          <input className={inputCls} value={form.seller_name} onChange={(e) => setForm((f) => ({ ...f, seller_name: e.target.value }))} maxLength={120} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Nomor WhatsApp</span>
          <input className={inputCls} type="tel" value={form.seller_phone} onChange={(e) => setForm((f) => ({ ...f, seller_phone: e.target.value }))} placeholder="08xxxxxxxxxx" maxLength={30} required />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Email <span className="font-normal text-gray-400">(opsional)</span></span>
          <input className={inputCls} type="email" value={form.seller_email} onChange={(e) => setForm((f) => ({ ...f, seller_email: e.target.value }))} />
        </label>
        <fieldset className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
          <legend className="mb-1.5 text-sm font-semibold text-gray-700">
            Rekening untuk pembayaran <span className="font-normal text-gray-400">(opsional — kosongkan bila ingin tunai di toko)</span>
          </legend>
          <input className={inputCls} aria-label="Bank" placeholder="Bank (mis. BSI)" maxLength={50} value={form.seller_bank}
            onChange={(e) => setForm((f) => ({ ...f, seller_bank: e.target.value }))} />
          <input className={inputCls} aria-label="Nomor rekening" placeholder="Nomor rekening" inputMode="numeric" maxLength={30} value={form.seller_account_number}
            onChange={(e) => setForm((f) => ({ ...f, seller_account_number: e.target.value }))} />
          <input className={inputCls} aria-label="Atas nama" placeholder="Atas nama" maxLength={120} value={form.seller_account_holder}
            onChange={(e) => setForm((f) => ({ ...f, seller_account_holder: e.target.value }))} />
        </fieldset>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Catatan <span className="font-normal text-gray-400">(opsional — kondisi barang, dll.)</span></span>
          <textarea className={`${inputCls} resize-y`} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} maxLength={2000} />
        </label>
      </div>

      {selected && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-brand-ink p-5 text-white">
          <span className="text-sm text-white/60">
            Estimasi ({formatRupiah(selected.harga_buyback)} × {quantity})
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-brand-gold-light">
            {formatRupiah(selected.harga_buyback * quantity)}
          </span>
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full rounded-full bg-brand-gold py-4 font-semibold text-white shadow-lg shadow-brand-gold/25 transition hover:bg-brand-gold-dark disabled:opacity-60">
        {submitting ? "Mengirim..." : "Ajukan Buyback"}
      </button>
      <p className="text-center text-xs text-gray-500">
        Harga buyback dikunci saat pengajuan. Nilai final ditetapkan setelah barang dicek admin.
      </p>
    </form>
  );
}
