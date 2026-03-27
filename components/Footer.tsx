"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white border-t-4 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">₯</span>
              </div>
              <span className="text-xl font-bold">Logam Mulia Dinar</span>
            </div>
            <p className="text-gray-400">
              Platform investasi emas syariah yang terpercaya dan transparan.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-yellow-400">Menu</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-yellow-400 transition"
                >
                  Beranda
                </Link>
              </li>
              <li>
                <Link
                  href="/#produk"
                  className="text-gray-400 hover:text-yellow-400 transition"
                >
                  Produk
                </Link>
              </li>
              <li>
                <Link
                  href="/#kenapa"
                  className="text-gray-400 hover:text-yellow-400 transition"
                >
                  Tentang Kami
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-yellow-400">
              Hubungi Kami
            </h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773c.058.3.178.645.358 1.016.18.371.414.804.756 1.205.342.401.779.773 1.276 1.05.497.277 1.038.404 1.584.404.46 0 .955-.085 1.466-.205a1 1 0 00.878-.486l1.293-2.16a1 1 0 01.68-.288h.512a6 6 0 110-12z" />
                </svg>
                <span>021-XXXXX-XXXXX</span>
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
                <span>info@logammuliadinar.id</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-yellow-400">
              Ikuti Kami
            </h3>
            <div className="flex gap-4">
              {[
                { icon: "📘", label: "Facebook" },
                { icon: "📷", label: "Instagram" },
                { icon: "𝕏", label: "Twitter" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="w-10 h-10 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center transition text-white"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <p className="text-center text-gray-400">
            © {currentYear} Logam Mulia Dinar. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
