"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="absolute top-0 inset-x-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logolmd.png"
              alt="Logam Mulia Dinar"
              width={100}
              height={45}
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/#produk"
              className="text-white/90 hover:text-white font-medium transition"
            >
              Produk
            </Link>
            <Link
              href="/#kenapa"
              className="text-white/90 hover:text-white font-medium transition"
            >
              Kenapa Kami
            </Link>
            <a
              href="https://wa.me/6281233272733"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#ce9233] hover:bg-[#b87f2d] text-white px-5 py-2 rounded-lg font-semibold transition"
            >
              Hubungi Kami
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white/90 hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2">
            <Link
              href="/#produk"
              className="block text-white/90 hover:text-white py-2 font-medium"
            >
              Produk
            </Link>
            <Link
              href="/#kenapa"
              className="block text-white/90 hover:text-white py-2 font-medium"
            >
              Kenapa Kami
            </Link>
            <a
              href="https://wa.me/6281233272733"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#ce9233] hover:bg-[#b87f2d] text-white px-4 py-2 rounded-lg font-semibold text-center transition"
            >
              Hubungi Kami
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
