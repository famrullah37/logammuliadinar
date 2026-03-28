"use client";

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1c424f] text-white border-t-4 border-[#ce9233]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/logolmd.png"
                  alt="Logam Mulia Dinar"
                  width={100}
                  height={45}
                />
              </Link>
            </div>
            <p className="text-[#d5e0e5]">
              Platform investasi emas syariah yang terpercaya dan transparan.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#ce9233]">Menu</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-[#d5e0e5] hover:text-[#ce9233] transition"
                >
                  Beranda
                </Link>
              </li>
              <li>
                <Link
                  href="/#produk"
                  className="text-[#d5e0e5] hover:text-[#ce9233] transition"
                >
                  Produk
                </Link>
              </li>
              <li>
                <Link
                  href="/#kenapa"
                  className="text-[#d5e0e5] hover:text-[#ce9233] transition"
                >
                  Tentang Kami
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#ce9233]">
              Hubungi Kami
            </h3>
            <ul className="space-y-3 text-[#d5e0e5]">
              <li className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M19.05 4.91A9.88 9.88 0 0 0 12.05 2C6.57 2 2.1 6.47 2.1 11.95c0 1.75.46 3.46 1.34 4.97L2 22l5.2-1.36a9.9 9.9 0 0 0 4.75 1.21h.01c5.48 0 9.94-4.47 9.94-9.95 0-2.66-1.04-5.16-2.85-6.99Zm-6.99 15.26h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.08.81.82-3-.2-.31a8.25 8.25 0 0 1-1.27-4.39c0-4.56 3.71-8.27 8.28-8.27 2.21 0 4.28.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.84c0 4.56-3.71 8.27-8.27 8.27Zm4.54-6.18c-.25-.12-1.49-.73-1.72-.82-.23-.08-.4-.12-.57.12-.16.25-.65.82-.79.99-.15.16-.29.19-.54.06a6.63 6.63 0 0 1-1.95-1.2 7.36 7.36 0 0 1-1.36-1.68c-.14-.25-.01-.38.1-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.57-1.38-.78-1.89-.21-.51-.42-.44-.57-.45l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.16 1.74 2.66 4.22 3.72.59.25 1.05.4 1.41.52.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.22-.16-.47-.28Z" />
                </svg>
                <span>+62 812-3327-2733</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Famrullah37@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-[#ce9233]">
              Ikuti Kami
            </h3>
            <div className="flex gap-4">
              {[
                {
                  label: "Instagram",
                  icon: (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle
                        cx="17.5"
                        cy="6.5"
                        r="1"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                  ),
                },
                {
                  label: "Facebook",
                  icon: (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
                    </svg>
                  ),
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="w-10 h-10 bg-[#ce9233] hover:bg-[#b87f2d] rounded-full flex items-center justify-center transition text-white"
                  title={social.label}
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 pt-8">
          <p className="text-center text-[#d5e0e5]">
            © {currentYear} Logam Mulia Dinar. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
