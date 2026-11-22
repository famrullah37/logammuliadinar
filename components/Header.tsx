import Image from "next/image";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import { whatsappLink } from "@/lib/site";

const STATS = [
  { value: "Au 999.9", label: "Emas murni 24 karat" },
  { value: "Hingga 99%", label: "Jaminan buyback" },
  { value: "Tanpa akun", label: "Checkout langsung" },
];

export default function Header() {
  return (
    <header className="relative isolate overflow-hidden bg-brand-ink">
      <Image
        src="/slide_01.jpg"
        alt="Koin 1 Dinar emas Au 999.9"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[70%_center] -z-20"
      />
      {/* Gradien: gelap di kiri untuk teks, koin tetap terlihat di kanan.
          Di layar sempit koin berada di belakang teks, jadi lapisan dibuat lebih pekat. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-ink via-brand-ink/85 to-brand-ink/60 lg:via-brand-ink/75 lg:to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-ink via-transparent to-brand-ink/30" />
      <div
        className="absolute -left-40 top-1/3 -z-10 h-[28rem] w-[28rem] rounded-full bg-brand-gold/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28 lg:min-h-[min(88vh,860px)] lg:flex lg:items-center">
        <div className="max-w-2xl">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-1.5 text-sm font-medium text-brand-gold-light backdrop-blur-sm">
            <ShieldCheck size={16} className="text-brand-gold" />
            Dinar emas syariah · harga transparan
          </div>

          <h1
            className="animate-fade-up mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-white tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Investasi emas syariah yang{" "}
            <span className="bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-light bg-clip-text text-transparent">
              terpercaya
            </span>
          </h1>

          <p
            className="animate-fade-up mt-6 text-lg leading-relaxed text-white/75 max-w-xl"
            style={{ animationDelay: "160ms" }}
          >
            Logam Mulia Dinar menyediakan dinar emas dan emas batangan murni berkualitas tinggi dengan harga
            beli dan buyback yang selalu terbuka. Investasi cerdas untuk masa depan yang lebih aman.
          </p>

          <div
            className="animate-fade-up mt-10 flex flex-col sm:flex-row gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href="#produk"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold px-7 py-4 text-base font-semibold text-white shadow-xl shadow-brand-gold/25 transition hover:bg-brand-gold-dark"
            >
              Lihat Harga Hari Ini
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              <MessageCircle size={18} />
              Konsultasi via WhatsApp
            </a>
          </div>

          <dl
            className="animate-fade-up mt-14 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 max-w-xl"
            style={{ animationDelay: "320ms" }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-xl sm:text-2xl font-bold text-brand-gold-light">{s.value}</dd>
                <dd className="mt-1 text-xs sm:text-sm text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </header>
  );
}
