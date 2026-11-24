"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { versionLabel } from "@/lib/version";
import IdleLogout from "./IdleLogout";
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
  const activeRef = useRef<HTMLAnchorElement>(null);
  const links = me ? LINKS.filter((l) => l.roles.includes(me.role)) : [];

  // Halaman di luar hak role → arahkan ke halaman awal role (API tetap menolak dengan 403).
  useEffect(() => {
    if (!me) return;
    const current = LINKS.find((l) => isActive(l.href, pathname));
    if (current && !current.roles.includes(me.role)) router.replace(homeFor(me.role));
  }, [me, pathname, router]);

  // Di HP menu bisa digeser: pastikan menu aktif terlihat.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [me, pathname]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    resetMe();
    router.push("/login");
  };

  // Nama tampilan singkat: nama pengguna, atau bagian depan email.
  const displayName = me ? me.name || me.email.split("@")[0] : "";

  return (
    <nav aria-label="Menu admin" className="bg-[#1c424f] print:hidden">
      <IdleLogout />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="-mx-1 flex w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:w-auto lg:flex-1 lg:flex-wrap lg:overflow-visible lg:px-0">
          {links.map((l) => {
            const active = isActive(l.href, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                ref={active ? activeRef : undefined}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-white text-[#1c424f]" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        {me && (
          <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-sm">
            <span className="text-white/70" title={`${me.email} · ${versionLabel()}`}>
              {displayName}
              <span className="ml-1.5 rounded bg-white/15 px-1.5 py-0.5 text-xs font-semibold text-white">{ROLE_LABEL[me.role]}</span>
            </span>
            <button type="button" onClick={logout}
              className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10">
              Keluar
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
