import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import ProductTable from "@/components/ProductTable";
import WhySection from "@/components/WhySection";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";
import HowToBuy from "@/components/HowToBuy";
import CtaSection from "@/components/CtaSection";

export const metadata: Metadata = {
  title: "Harga Dinar Emas Terkini — Beli & Buyback Logam Mulia",
  description:
    "Cek harga beli dan buyback dinar emas terbaru hari ini dari berbagai brand terpercaya. Beli dinar emas syariah berkualitas tinggi secara online, aman dan mudah.",
  keywords: [
    "harga dinar emas hari ini",
    "beli dinar emas online",
    "harga buyback dinar emas",
    "dinar emas 4.25 gram harga",
    "toko dinar emas online terpercaya",
    "investasi dinar emas",
    "dinar emas syariah",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Harga Dinar Emas Terkini — Beli & Buyback Logam Mulia",
    description:
      "Cek harga beli dan buyback dinar emas terbaru hari ini dari berbagai brand terpercaya.",
    url: "/",
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://logammuliadinar.com";

// Data terstruktur untuk Google (kartu organisasi + kontak).
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: BASE_URL,
  logo: `${BASE_URL}/logolmd.png`,
  email: SITE.email,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: SITE.whatsappDisplay.replace(/[\s-]/g, ""),
    availableLanguage: ["Indonesian"],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      <Navbar />
      <Header />

      <main className="grow">
        <section id="produk" className="scroll-mt-20 bg-white py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Harga Hari Ini</p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight">
                  Harga dinar &amp; emas batangan
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Pilih kategori dan brand sesuai keinginan Anda, lalu klik harga untuk melihat detail dan membeli.
                </p>
              </div>
            </div>
            <ProductTable />
          </div>
        </section>

        <HowToBuy />
        <WhySection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
