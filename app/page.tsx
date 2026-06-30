import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import ProductTable from "@/components/ProductTable";
import WhySection from "@/components/WhySection";
import Footer from "@/components/Footer";

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
  openGraph: {
    title: "Harga Dinar Emas Terkini — Beli & Buyback Logam Mulia",
    description:
      "Cek harga beli dan buyback dinar emas terbaru hari ini dari berbagai brand terpercaya.",
    url: "/",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Header />

      <main className="grow">
        {/* Produk Section */}
        <section id="produk" className="py-16 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Daftar
                <span className="text-[#1c424f]"> Produk Kami</span>
              </h2>
              <p className="text-lg text-gray-600">
                Pilih dinar yang sesuai dengan kebutuhan investasi Anda
              </p>
            </div>
            <ProductTable />
          </div>
        </section>

        {/* Kenapa Section */}
        <WhySection />
      </main>

      <Footer />
    </div>
  );
}
