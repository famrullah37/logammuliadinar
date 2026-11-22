"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AdminNav from "@/components/admin/AdminNav";
import { api, ApiError } from "@/lib/api";
import { daysUntil, formatHijri, hijri, isRamadanFirst, nextHaul } from "@/lib/hijri";

interface StockItem {
  id: string;
  brand_name: string;
  product_name: string;
  type_name: string;
  weight: number;
  stock: number;
  harga_jual: number;
  nilai: number;
}

interface Reserve {
  id: string;
  order_number: string;
  kind: "sale" | "reversal" | "carryover";
  base_amount: number;
  amount: number;
  created_at: string;
  paid_date: string | null;
}

interface ZakatData {
  items: StockItem[];
  untracked: number;
  saldo_kas: number;
  pending: { keping: number; nilai: number; pesanan: number };
  last_zakat: { entry_date: string; amount: number; description: string | null } | null;
  reserves: Reserve[];
  reserve_totals: { belum: number; sudah: number; transaksi_belum: number };
  payouts: {
    id: string; paid_date: string; amount: number; note: string | null; transaksi: number;
    kind: "penyisihan" | "haul"; haul_year: number | null;
    kewajiban: number | null; dibayar_sebelumnya: number | null; tabungan: number | null; sisa_tabungan: number | null;
  }[];
  period: {
    haul_year: number;
    dibayar_awal: number;
    haul_payout: { paid_date: string; amount: number; kewajiban: number; dibayar_sebelumnya: number; tabungan: number; sisa_tabungan: number } | null;
  };
}

const NISAB_GRAM = 85;
const RATE = 0.025;
const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const num = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const todayWib = () => new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });

function Line({ k, v, sub, strong, cls = "" }: { k: string; v: string; sub?: string; strong?: boolean; cls?: string }) {
  return (
    <div className={`flex justify-between gap-4 py-2 text-sm ${strong ? "border-t border-[#f2ece0] font-bold" : ""}`}>
      <span className="text-gray-700">{k}{sub && <span className="block text-xs font-normal text-gray-400">{sub}</span>}</span>
      <span className={`tabular-nums ${cls}`}>{v}</span>
    </div>
  );
}

export default function ZakatPage() {
  const router = useRouter();
  const [data, setData] = useState<ZakatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Penyisihan yang dipilih untuk dikeluarkan (bawaan: semua yang belum dikeluarkan).
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({
    hargaEmas: "", // harga emas per gram hari ini (untuk nisab)
    includePending: true,
    kasLain: "", // kas/rekening usaha di luar Buku Kas
    piutang: "", // piutang lancar
    utang: "", // utang jatuh tempo (mis. ke pusat)
  });

  useEffect(() => {
    let ignore = false;
    api<ZakatData>("/api/admin/zakat")
      .then((d) => { if (!ignore) setData(d); })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
        toast.error(err instanceof Error ? err.message : "Gagal memuat data");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [router, reloadKey]);

  const stokNilai = data?.items.reduce((s, i) => s + i.nilai, 0) ?? 0;
  const pendingNilai = form.includePending ? data?.pending.nilai ?? 0 : 0;
  const kas = data?.saldo_kas ?? 0;
  const totalHarta = stokNilai + pendingNilai + kas + num(form.kasLain) + num(form.piutang);
  const bersih = totalHarta - num(form.utang);
  const nisab = num(form.hargaEmas) * NISAB_GRAM;
  const wajib = num(form.hargaEmas) > 0 && bersih >= nisab;
  const zakat = wajib ? bersih * RATE : 0;

  const unpaidIds = (data?.reserves ?? []).filter((z) => z.paid_date === null).map((z) => z.id);
  const chosen = selected ?? new Set(unpaidIds);
  const chosenRows = (data?.reserves ?? []).filter((z) => z.paid_date === null && chosen.has(z.id));
  const chosenTotal = chosenRows.reduce((s, z) => s + z.amount, 0);

  const payout = async () => {
    if (chosenRows.length === 0 || chosenTotal <= 0) return;
    const note = window.prompt(
      `Keluarkan zakat ${rp(chosenTotal)} dari ${chosenRows.length} transaksi?\nKeterangan (opsional, mis. disalurkan ke BAZNAS/masjid):`,
      "",
    );
    if (note === null) return;
    try {
      setPaying(true);
      const res = await api<{ amount: number; count: number }>("/api/admin/zakat/payout", {
        method: "POST",
        body: { reserve_ids: chosenRows.map((z) => z.id), note },
      });
      toast.success(`Zakat ${rp(res.amount)} dikeluarkan · ${res.count} transaksi ditandai`);
      setSelected(null);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : "Gagal mengeluarkan zakat");
    } finally {
      setPaying(false);
    }
  };

  const now = new Date();
  const haul = nextHaul(now);
  const sisaHari = daysUntil(haul, now);
  const hariHaul = isRamadanFirst(now);
  const tahun = data?.period.haul_year ?? 0;
  const haulPaid = data?.period.haul_payout ?? null;
  const dibayarAwal = data?.period.dibayar_awal ?? 0;
  const kewajiban = Math.round(zakat);
  const sisaKewajiban = Math.max(0, kewajiban - dibayarAwal);
  const tabungan = data?.reserve_totals.belum ?? 0;
  const selisih = tabungan - sisaKewajiban; // + lebih (dibawa ke haul berikutnya), − kurang (ditambah dari kas)

  const payHaul = async () => {
    if (!wajib) return;
    const lines = [
      `Bayar zakat haul 1 Ramadhan ${tahun} H sebesar ${rp(sisaKewajiban)}?`,
      selisih < 0 ? `Tabungan kurang ${rp(-selisih)} — sisanya diambil dari kas.` : `Tabungan lebih ${rp(selisih)} — disimpan untuk haul berikutnya.`,
      hariHaul ? null : "Catatan: hari ini bukan 1 Ramadhan.",
      "Keterangan (opsional, mis. disalurkan ke BAZNAS/masjid):",
    ].filter(Boolean);
    const note = window.prompt(lines.join("\n"), "");
    if (note === null) return;
    try {
      setSaving(true);
      const res = await api<{ dibayar_sekarang: number; sisa_tabungan: number; kewajiban: number }>("/api/admin/zakat/haul", {
        method: "POST",
        body: {
          harga_emas: num(form.hargaEmas),
          include_pending: form.includePending,
          kas_lain: num(form.kasLain),
          piutang: num(form.piutang),
          utang: num(form.utang),
          note,
        },
      });
      toast.success(`Zakat haul dibayar ${rp(res.dibayar_sekarang)}${res.sisa_tabungan ? ` · sisa tabungan ${rp(res.sisa_tabungan)} dibawa ke tahun depan` : ""}`);
      setSelected(null);
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : "Gagal membayar zakat haul");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm text-right tabular-nums focus:outline-none focus:border-[#1c424f]";

  return (
    <div className="min-h-screen bg-[#f7f4ed] print:bg-white">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Kalkulator <span className="text-[#1c424f]">Zakat Perdagangan</span></h1>
          <p className="text-sm text-gray-500">
            Haul setiap 1 Ramadhan. Stok dinilai dengan harga jual pada hari haul. Zakat 2,5% bila harta bersih ≥ nisab 85 gram emas.
          </p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading || !data ? (
          <p className="py-16 text-center text-gray-500">Memuat data...</p>
        ) : (
          <>
          <div className={`mb-6 rounded-2xl border p-5 ${hariHaul ? "border-emerald-300 bg-emerald-50" : "border-[#908974]/30 bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Haul zakat</p>
                <p className="text-lg font-bold text-gray-900">
                  1 Ramadhan {hijri(haul).year} H ≈ {haul.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-gray-500">Hari ini: {todayWib()} / {formatHijri(now)}.</p>
              <p className="text-xs text-gray-500">Perkiraan kalender Umm al-Qura — ikuti penetapan awal Ramadhan oleh Kemenag (bisa berbeda ±1 hari).</p>
              </div>
              <p className={`rounded-full px-4 py-2 text-sm font-semibold ${hariHaul ? "bg-emerald-600 text-white" : "bg-[#f7f4ed] text-[#1c424f]"}`}>
                {hariHaul ? "Hari ini haul — hitung & catat zakat" : `${sisaHari} hari lagi`}
              </p>
            </div>
            {!hariHaul && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Hari ini bukan hari haul. Angka di bawah memakai stok, harga jual, dan kas hari ini — gunakan sebagai perkiraan,
                lalu hitung ulang tepat pada 1 Ramadhan. Membayar sebelum haul (ta&apos;jil) dibolehkan menurut jumhur ulama.
              </p>
            )}
            {haulPaid && (
              <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs text-emerald-800">
                Zakat haul 1 Ramadhan {tahun} H sudah dibayar pada {haulPaid.paid_date}: kewajiban {rp(haulPaid.kewajiban)},
                dibayar saat haul {rp(haulPaid.amount)}{haulPaid.dibayar_sebelumnya ? `, dicicil lebih awal ${rp(haulPaid.dibayar_sebelumnya)}` : ""}.
              </p>
            )}
            {!haulPaid && dibayarAwal > 0 && (
              <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Sudah dikeluarkan lebih awal (ta&apos;jil) untuk haul 1 Ramadhan {tahun} H: {rp(dibayarAwal)} — mengurangi kewajiban saat haul.
              </p>
            )}
          </div>

          {/* ── Penyisihan zakat 2,5% dari harga jual setiap penjualan ── */}
          <section className="mb-6 bg-white rounded-2xl border border-[#908974]/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900">Tabungan zakat (2,5% dari penjualan)</h2>
                <p className="text-sm text-gray-500">
                  Disisihkan otomatis dari harga jual setiap penjualan selesai (tanpa ongkir & kode unik). Kewajiban sebenarnya dihitung saat haul.
                </p>
              </div>
              <div className="flex gap-3 text-right">
                <div className="rounded-xl bg-amber-50 px-4 py-2">
                  <p className="text-xs text-amber-700">Belum dikeluarkan</p>
                  <p className="text-lg font-bold tabular-nums text-amber-800">{rp(data.reserve_totals.belum)}</p>
                  <p className="text-[11px] text-amber-700">{data.reserve_totals.transaksi_belum} transaksi</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-2">
                  <p className="text-xs text-emerald-700">Sudah dikeluarkan</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-800">{rp(data.reserve_totals.sudah)}</p>
                </div>
              </div>
            </div>

            {data.reserves.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Belum ada penjualan selesai.</p>
            ) : (
              <>
                <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-[#f2ece0]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#908974]/20">
                        <th className="px-3 py-2 w-8">
                          <input type="checkbox" aria-label="Pilih semua yang belum dikeluarkan" className="accent-[#1c424f]"
                            checked={unpaidIds.length > 0 && unpaidIds.every((id) => chosen.has(id))}
                            onChange={(e) => setSelected(e.target.checked ? new Set(unpaidIds) : new Set())} />
                        </th>
                        <th className="px-3 py-2">Transaksi</th>
                        <th className="px-3 py-2 text-right">Harga jual</th>
                        <th className="px-3 py-2 text-right">Zakat 2,5%</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reserves.map((z) => (
                        <tr key={z.id} className="border-b border-[#f2ece0] last:border-0">
                          <td className="px-3 py-2">
                            {z.paid_date === null && (
                              <input type="checkbox" aria-label={`Pilih ${z.order_number}`} className="accent-[#1c424f]"
                                checked={chosen.has(z.id)}
                                onChange={(e) => {
                                  const next = new Set(chosen);
                                  if (e.target.checked) next.add(z.id); else next.delete(z.id);
                                  setSelected(next);
                                }} />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs">{z.order_number}</span>
                            {z.kind === "reversal" && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">koreksi pembatalan</span>}
                            {z.kind === "carryover" && <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700">kelebihan dari haul sebelumnya</span>}
                            <span className="block text-[11px] text-gray-400">
                              {new Date(z.created_at).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{rp(z.base_amount)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${z.amount < 0 ? "text-red-600" : ""}`}>{rp(z.amount)}</td>
                          <td className="px-3 py-2">
                            {z.paid_date ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Sudah dikeluarkan · {new Date(`${z.paid_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Belum dikeluarkan</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">
                    Dipilih: <span className="font-semibold">{chosenRows.length} transaksi</span> ·{" "}
                    <span className="font-bold tabular-nums">{rp(chosenTotal)}</span>
                  </p>
                  <button onClick={payout} disabled={paying || !!haulPaid || chosenRows.length === 0 || chosenTotal <= 0}
                    title={haulPaid ? "Haul periode ini sudah dibayar; pengeluaran lebih awal untuk haul berikutnya dimulai 1 Syawal" : undefined}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
                    {paying ? "Memproses..." : "Keluarkan lebih awal (ta'jil)"}
                  </button>
                </div>
              </>
            )}

            {data.payouts.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Riwayat pengeluaran zakat</p>
                <ul className="divide-y divide-[#f2ece0] text-sm">
                  {data.payouts.map((p) => (
                    <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span className="text-gray-700">
                        {new Date(`${p.paid_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                          {p.kind === "haul" ? `Haul ${p.haul_year} H` : `Ta'jil${p.haul_year ? ` haul ${p.haul_year} H` : ""}`}
                        </span>
                        <span className="text-gray-400"> · {p.transaksi} transaksi{p.note ? ` · ${p.note}` : ""}</span>
                        {p.kind === "haul" && p.kewajiban !== null && (
                          <span className="block text-xs text-gray-400">
                            kewajiban {rp(p.kewajiban)} · tabungan {rp(p.tabungan ?? 0)}{p.sisa_tabungan ? ` · sisa ${rp(p.sisa_tabungan)} dibawa` : ""}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums">{rp(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <h2 className="mb-1 font-bold text-gray-900">Kewajiban zakat saat haul (rumus NU Online)</h2>
          <p className="mb-3 text-sm text-gray-500">(Stok dinilai harga jual + kas + piutang − utang) × 2,5% bila ≥ nisab 85 gram emas. Bandingkan dengan tabungan, lalu bayar pada 1 Ramadhan.</p>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-[#908974]/30 p-5">
                <h2 className="font-bold text-gray-900">Stok barang dagangan (harga jual hari ini)</h2>
                {data.untracked > 0 && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {data.untracked} produk stoknya tidak dilacak sehingga tidak ikut terhitung. Lacak semua stok di menu Stok agar hasil akurat,
                    atau tambahkan nilainya secara manual di &quot;Kas/harta lain&quot;.
                  </p>
                )}
                {data.items.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Tidak ada stok yang dilacak.</p>
                ) : (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#908974]/20">
                        <th className="py-2">Produk</th><th className="py-2">Brand</th>
                        <th className="py-2 text-right">Stok</th><th className="py-2 text-right">Harga jual</th><th className="py-2 text-right">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((i) => (
                        <tr key={i.id} className="border-b border-[#f2ece0] last:border-0">
                          <td className="py-2">{i.product_name} {i.type_name}</td>
                          <td className="py-2">{i.brand_name}</td>
                          <td className="py-2 text-right tabular-nums">{i.stock}</td>
                          <td className="py-2 text-right tabular-nums">{rp(i.harga_jual)}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{rp(i.nilai)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="bg-white rounded-2xl border border-[#908974]/30 p-5 space-y-4 print:hidden">
                <h2 className="font-bold text-gray-900">Data tambahan</h2>
                <label className="block text-xs font-semibold text-gray-600">
                  Harga emas per gram hari ini (untuk nisab) *
                  <input inputMode="numeric" value={form.hargaEmas} onChange={(e) => setForm((f) => ({ ...f, hargaEmas: e.target.value }))}
                    className={inputCls} placeholder="1500000" />
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.includePending} className="mt-1 accent-[#1c424f]"
                    onChange={(e) => setForm((f) => ({ ...f, includePending: e.target.checked }))} />
                  <span>
                    Hitung barang dari pesanan yang belum selesai ({data.pending.pesanan} pesanan, {data.pending.keping} keping, {rp(data.pending.nilai)})
                    <span className="block text-xs text-gray-400">Stoknya sudah dipotong saat dipesan, tetapi barang belum diserahkan / belum dibayar.</span>
                  </span>
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-semibold text-gray-600">
                    Kas/harta lain (Rp)
                    <input inputMode="numeric" value={form.kasLain} onChange={(e) => setForm((f) => ({ ...f, kasLain: e.target.value }))}
                      className={inputCls} placeholder="0" />
                  </label>
                  <label className="block text-xs font-semibold text-gray-600">
                    Piutang lancar (Rp)
                    <input inputMode="numeric" value={form.piutang} onChange={(e) => setForm((f) => ({ ...f, piutang: e.target.value }))}
                      className={inputCls} placeholder="0" />
                  </label>
                  <label className="block text-xs font-semibold text-gray-600">
                    Utang jatuh tempo (Rp)
                    <input inputMode="numeric" value={form.utang} onChange={(e) => setForm((f) => ({ ...f, utang: e.target.value }))}
                      className={inputCls} placeholder="0" />
                  </label>
                </div>
              </section>
            </div>

            <aside className="bg-white rounded-2xl border border-[#908974]/30 p-5 h-fit lg:sticky lg:top-6">
              <h2 className="font-bold text-gray-900 mb-2">Perhitungan</h2>
              <Line k="Nilai stok" v={rp(stokNilai)} sub="harga jual hari ini" />
              {form.includePending && <Line k="Barang dipesan (belum selesai)" v={rp(pendingNilai)} />}
              <Line k="Saldo kas (Buku Kas)" v={rp(kas)} cls={kas < 0 ? "text-red-600" : ""} />
              {num(form.kasLain) > 0 && <Line k="Kas/harta lain" v={rp(num(form.kasLain))} />}
              {num(form.piutang) > 0 && <Line k="Piutang lancar" v={rp(num(form.piutang))} />}
              {num(form.utang) > 0 && <Line k="− Utang jatuh tempo" v={rp(num(form.utang))} cls="text-red-600" />}
              <Line k="Harta bersih" v={rp(bersih)} strong />
              <Line k="Nisab (85 gram emas)" v={num(form.hargaEmas) ? rp(nisab) : "isi harga emas"} />

              <div className={`mt-4 rounded-xl p-4 text-center ${!num(form.hargaEmas) ? "bg-gray-50" : wajib ? "bg-emerald-50" : "bg-amber-50"}`}>
                {!num(form.hargaEmas) ? (
                  <p className="text-sm text-gray-500">Isi harga emas per gram untuk menghitung nisab.</p>
                ) : wajib ? (
                  <>
                    <p className="text-xs text-emerald-700">Mencapai nisab — zakat 2,5%</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">{rp(zakat)}</p>
                  </>
                ) : (
                  <p className="text-sm text-amber-800">Belum mencapai nisab — tidak wajib zakat perdagangan.</p>
                )}
              </div>

              {wajib && (
                <div className="mt-4 rounded-xl border border-[#f2ece0] p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Tabungan vs kewajiban haul {tahun} H</p>
                  <Line k="Kewajiban (2,5%)" v={rp(kewajiban)} />
                  {dibayarAwal > 0 && <Line k="− Sudah dikeluarkan lebih awal" v={rp(dibayarAwal)} />}
                  <Line k="Sisa kewajiban" v={rp(sisaKewajiban)} strong />
                  <Line k="Tabungan zakat terkumpul" v={rp(tabungan)} />
                  <p className={`mt-1 rounded-lg px-3 py-2 text-xs ${selisih < 0 ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>
                    {selisih < 0
                      ? `Tabungan kurang ${rp(-selisih)} — saat bayar, kekurangannya diambil dari kas.`
                      : selisih > 0
                        ? `Tabungan lebih ${rp(selisih)} — disimpan sebagai tabungan untuk haul berikutnya.`
                        : "Tabungan pas dengan sisa kewajiban."}
                  </p>
                </div>
              )}

              <div className="mt-4 flex gap-2 print:hidden">
                <button onClick={payHaul} disabled={!wajib || saving || !!haulPaid}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#1c424f] text-white hover:bg-[#15323c] disabled:opacity-40">
                  {saving ? "Memproses..." : haulPaid ? `Haul ${tahun} H sudah dibayar` : `Bayar zakat haul ${tahun} H`}
                </button>
                <button onClick={() => window.print()} className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#908974]/40 text-[#1c424f]">
                  Cetak
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Ringkasan pendapat umum (jumhur ulama/BAZNAS), bukan fatwa. Konfirmasikan tanggal haul dan cara penilaian ke ustadz atau lembaga zakat Anda.
              </p>
            </aside>
          </div>
          </>
        )}
      </main>
    </div>
  );
}
