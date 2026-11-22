import type { Metadata } from "next";

// Halaman login admin: jangan diindeks.
export const metadata: Metadata = {
  title: "Login Admin",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
