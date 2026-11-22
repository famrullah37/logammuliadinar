import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displaySerif = Playfair_Display({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://logammuliadinar.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: "%s — Logam Mulia Dinar",
    default: "Logam Mulia Dinar — Harga Dinar Emas Terkini",
  },
  description:
    "Cek harga beli dan buyback dinar emas terkini dari berbagai brand. Beli dinar emas syariah berkualitas tinggi secara online.",
  keywords: [
    // produk utama
    "dinar emas",
    "dinar emas 1 dinar",
    "dinar emas 4.25 gram",
    "harga dinar emas",
    "beli dinar emas",
    "jual dinar emas",
    "dinar emas murah",
    // brand populer
    "dinar emas antam",
    "dinar emas koin nusantara",
    "dinar emas wakala",
    "dinar emas amanah",
    // investasi & syariah
    "investasi emas syariah",
    "emas syariah",
    "logam mulia syariah",
    "investasi emas halal",
    "tabungan emas syariah",
    // harga & buyback
    "harga emas hari ini",
    "harga dinar emas terkini",
    "buyback dinar emas",
    "harga buyback emas",
    "cek harga emas",
    // umum logam mulia
    "logam mulia",
    "beli emas online",
    "toko emas online",
    "emas batangan",
    "harga emas per gram",
    "investasi emas online",
    "jual beli emas online",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Logam Mulia Dinar",
    images: [{ url: "/logolmd.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      data-scroll-behavior="smooth"
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
