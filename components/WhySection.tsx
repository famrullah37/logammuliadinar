import Image from "next/image";

const REASONS = [
  {
    title: "Kemurnian",
    description: "Dinar 24 karat (999.9) dengan kualitas emas terbaik untuk investasi jangka panjang.",
    imageSrc: "/1-DINAR.png",
  },
  {
    title: "Jaminan 99%",
    description: "Jaminan buyback hingga 99% dengan proses transparan dan harga kompetitif.",
    imageSrc: "/1per2-DINAR.png",
  },
  {
    title: "Desain Berkelas",
    description: "Desain dinar elegan, sarat makna, cocok untuk investasi sekaligus koleksi bernilai.",
    imageSrc: "/BLKLG-DINAR.png",
  },
  {
    title: "Likuid dan Fleksibel",
    description: "Pilihan pecahan beragam memudahkan strategi simpanan dan pencairan sesuai kebutuhan.",
    imageSrc: "/1per4-DINAR.png",
  },
];

export default function WhySection() {
  return (
    <section id="kenapa" className="scroll-mt-20 relative overflow-hidden bg-brand-ink py-20 sm:py-28">
      <div
        className="absolute right-0 top-0 h-[30rem] w-[30rem] translate-x-1/3 -translate-y-1/3 rounded-full bg-brand-gold/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Keunggulan</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Kenapa Logam Mulia Dinar?
          </h2>
          <p className="mt-4 text-lg text-white/65">
            Keunggulan utama dinar untuk membantu Anda membangun investasi emas yang lebih aman dan bernilai.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <article
              key={reason.title}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm transition hover:border-brand-gold/40 hover:bg-white/[0.07]"
            >
              <div className="relative mx-auto h-32 w-32">
                <div
                  className="absolute inset-2 rounded-full bg-brand-gold/30 blur-2xl transition group-hover:bg-brand-gold/50"
                  aria-hidden="true"
                />
                <Image
                  src={reason.imageSrc}
                  alt=""
                  fill
                  sizes="128px"
                  className="relative object-contain drop-shadow-2xl transition duration-500 group-hover:scale-105 group-hover:rotate-6"
                />
              </div>
              <h3 className="mt-7 text-lg font-semibold text-white">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{reason.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
