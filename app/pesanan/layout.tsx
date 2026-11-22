import type { Metadata } from "next";

// Cek status pesanan: data pribadi, jangan diindeks.
export const metadata: Metadata = {
  title: "Cek Status Pesanan",
  robots: { index: false, follow: false },
};

export default function PesananLayout({ children }: { children: React.ReactNode }) {
  return children;
}
