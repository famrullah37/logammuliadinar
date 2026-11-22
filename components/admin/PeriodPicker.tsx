"use client";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Pilihan periode: preset (hari ini, bulan ini, bulan lalu, tahun ini) + tanggal bebas. */
export default function PeriodPicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const now = new Date();
  const presets: [string, string, string][] = [
    ["Hari ini", ymd(now), ymd(now)],
    ["Bulan ini", ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)],
    ["Bulan lalu", ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0))],
    ["Tahun ini", ymd(new Date(now.getFullYear(), 0, 1)), ymd(now)],
  ];
  const inputCls = "px-3 py-2 border border-[#908974]/40 rounded-lg bg-white text-sm";
  return (
    <div className="flex flex-wrap items-end gap-2 print:hidden">
      {presets.map(([label, f, t]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(f, t)}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
            from === f && to === t ? "bg-[#1c424f] text-white border-[#1c424f]" : "bg-white text-gray-700 border-[#908974]/40 hover:border-[#1c424f]"
          }`}
        >
          {label}
        </button>
      ))}
      <label className="text-xs text-gray-500">
        Dari
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && onChange(e.target.value, to)} className={`block ${inputCls}`} />
      </label>
      <label className="text-xs text-gray-500">
        Sampai
        <input type="date" value={to} min={from} onChange={(e) => e.target.value && onChange(from, e.target.value)} className={`block ${inputCls}`} />
      </label>
    </div>
  );
}

export function currentMonth(): { from: string; to: string } {
  const now = new Date();
  return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
}

/** Unduh baris-baris sebagai CSV (UTF-8 BOM agar terbaca benar di Excel). */
export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    // Cegah formula injection di Excel: awali karakter berbahaya dengan apostrof.
    const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
    return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
