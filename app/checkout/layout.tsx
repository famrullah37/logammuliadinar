import type { Metadata } from "next";

// Checkout & halaman sukses berisi data pesanan pribadi: jangan diindeks.
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
