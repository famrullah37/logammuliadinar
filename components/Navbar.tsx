"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, X } from "lucide-react";
import { whatsappLink } from "@/lib/site";

const LINKS = [
  { href: "/#produk", label: "Harga" },
  { href: "/buyback", label: "Buyback" },
  { href: "/#cara-beli", label: "Cara Beli" },
  { href: "/#kenapa", label: "Keunggulan" },
  { href: "/pesanan", label: "Cek Pesanan" },
];

/** solid: selalu berlatar gelap (untuk halaman tanpa hero gelap di bagian atas). */
export default function Navbar({ solid: alwaysSolid = false }: { solid?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = alwaysSolid || scrolled || isOpen;

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        solid
          ? "bg-brand-ink/95 backdrop-blur-md shadow-lg shadow-black/10 border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link href="/" className="flex items-center" aria-label="Logam Mulia Dinar — Beranda">
            <Image src="/logolmd.png" alt="Logam Mulia Dinar" width={100} height={45} priority />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold transition shadow-lg shadow-brand-gold/20"
            >
              <MessageCircle size={16} strokeWidth={2.5} />
              Hubungi Kami
            </a>
          </div>

          <button
            onClick={() => setIsOpen((o) => !o)}
            className="md:hidden p-2 -mr-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition"
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-5 pt-1 space-y-1 animate-fade-up">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-3 rounded-xl text-white/85 hover:text-white hover:bg-white/10 font-medium transition"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white px-4 py-3 rounded-xl font-semibold transition"
            >
              <MessageCircle size={18} strokeWidth={2.5} />
              Hubungi Kami
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
