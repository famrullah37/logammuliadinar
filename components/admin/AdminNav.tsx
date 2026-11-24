"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { versionLabel } from "@/lib/version";
import { resetMe, ROLE_LABEL, useMe, type Role } from "./useMe";

const LINKS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "Produk & Harga", roles: ["admin"] },
  { href: "/admin/harga", label: "Harga Harian", roles: ["admin"] },
  { href: "/admin/toko", label: "Transaksi Toko", roles: ["admin", "kasir"] },
  { href: "/admin/orders", label: "Pesanan", roles: ["admin", "kasir"] },
  { href: "/admin/buyback", label: "Buyback", roles: ["admin", "kasir"] },
  { href: "/admin/stok", label: "Stok", roles: ["admin", "kasir"] },
  { href: "/admin/kas", label: "Kas", roles: ["admin"] },
  { href: "/admin/laporan", label: "Laporan", roles: ["admin"] },
  { href: "/admin/zakat", label: "Zakat", roles: ["admin"] },
  { href: "/admin/akun", label: "Akun", roles: ["admin", "kasir"] },
];

const isActive = (href: string, pathname: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

/** Halaman pertama untuk role (dipakai setelah login & bila membuka halaman tanpa akses). */
export const homeFor = (role: string) => (role === "admin" ? "/admin" : "/admin/toko");

/** Navigasi antar halaman admin, hanya menampilkan menu sesuai role. */
export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const links = me ? LINKS.filter((l) => l.roles.includes(me.role)) : [];

  // Halaman di luar hak role → arahkan ke halaman awal role (API tetap menolak dengan 403).
  useEffect(() => {
    if (!me) return;
    const current = LINKS.find((l) => isActive(l.href, pathname));
    if (current && !current.roles.includes(me.role)) router.replace(homeFor(me.role));
  }, [me, pathname, router]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    resetMe();
    router.push("/login");
  };

  return (
    <nav aria-label="Menu admin" className="bg-[#1c424f] print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto py-2">
        {links.map((l) => {
          const active = isActive(l.href, pathname);
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
        <span className="ml-auto flex items-center gap-3 self-center whitespace-nowrap pl-3 text-xs text-white/60">
          {me && (
            <span title={me.email}>
              {me.name || me.email} · <span className="font-semibold text-white/80">{ROLE_LABEL[me.role]}</span>
            </span>
          )}
          <button type="button" onClick={logout} className="rounded-md px-2 py-1 font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            Keluar
          </button>
          <span className="text-white/40" title="Versi aplikasi">{versionLabel()}</span>
        </span>
      </div>
    </nav>
  );
}
