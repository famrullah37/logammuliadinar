import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { whatsappLink } from "@/lib/site";

export default function CtaSection() {
  return (
    <section className="bg-brand-cream py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-gold via-[#c48a2f] to-brand-gold-dark px-8 py-14 sm:px-14 sm:py-16 shadow-2xl shadow-brand-gold/20">
          <Image
            src="/1-DINAR.png"
            alt=""
            width={220}
            height={220}
            className="animate-float-slow pointer-events-none absolute -right-8 -bottom-10 w-44 sm:w-56 opacity-90 drop-shadow-2xl"
          />
          <div className="relative max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Mulai simpan dinar emas hari ini
            </h2>
            <p className="mt-4 text-lg text-white/85">
              Punya pertanyaan soal pecahan, brand, atau pengiriman? Tim kami siap membantu lewat WhatsApp.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-ink px-7 py-4 font-semibold text-white transition hover:bg-brand-deep"
              >
                <MessageCircle size={18} />
                Chat WhatsApp
              </a>
              <Link
                href="/pesanan"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <Search size={18} />
                Cek Status Pesanan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
