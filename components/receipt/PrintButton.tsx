"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink"
    >
      <Printer size={16} /> Cetak / Simpan PDF
    </button>
  );
}
