"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Produk & Harga" },
  { href: "/admin/harga", label: "Harga Harian" },
  { href: "/admin/orders", label: "Pesanan" },
  { href: "/admin/buyback", label: "Buyback" },
  { href: "/admin/stok", label: "Stok" },
  { href: "/admin/kas", label: "Kas" },
  { href: "/admin/laporan", label: "Laporan" },
  { href: "/admin/zakat", label: "Zakat" },
];

/** Navigasi antar halaman admin. */
export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu admin" className="bg-[#1c424f] print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto py-2">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                active ? "bg-white text-[#1c424f]" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
