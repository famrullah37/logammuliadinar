import Image from "next/image";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { SITE, whatsappLink } from "@/lib/site";

const MENU = [
  { href: "/#produk", label: "Harga Dinar" },
  { href: "/buyback", label: "Buyback" },
  { href: "/#cara-beli", label: "Cara Beli" },
  { href: "/#kenapa", label: "Keunggulan" },
  { href: "/pesanan", label: "Cek Pesanan" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-ink text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" aria-label="Logam Mulia Dinar — Beranda">
              <Image src="/logolmd.png" alt="Logam Mulia Dinar" width={110} height={50} />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Platform investasi dinar emas syariah yang terpercaya, dengan harga beli dan buyback yang transparan.
            </p>
          </div>

          <nav aria-label="Menu footer">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Menu</h3>
            <ul className="mt-5 space-y-3">
              {MENU.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className="text-sm text-white/70 transition hover:text-white">
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Hubungi Kami</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-white/70 transition hover:text-white"
                >
                  <MessageCircle size={18} className="text-brand-gold" />
                  {SITE.whatsappDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="inline-flex items-center gap-3 text-white/70 transition hover:text-white"
                >
                  <Mail size={18} className="text-brand-gold" />
                  {SITE.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-8 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>© {currentYear} Logam Mulia Dinar. Semua hak dilindungi.</p>
          <p>Harga dapat berubah sewaktu-waktu mengikuti harga emas.</p>
        </div>
      </div>
    </footer>
  );
}
