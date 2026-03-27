"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-2 border-yellow-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">₯</span>
            </div>
            <span className="text-xl font-bold text-gray-800 hidden sm:inline">
              Logam Mulia Dinar
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/#produk"
              className="text-gray-700 hover:text-yellow-500 font-medium transition"
            >
              Produk
            </Link>
            <Link
              href="/#kenapa"
              className="text-gray-700 hover:text-yellow-500 font-medium transition"
            >
              Kenapa Kami
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md hover:shadow-lg"
            >
              Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-yellow-500"
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
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/#produk"
              className="block text-gray-700 hover:text-yellow-500 py-2 font-medium"
            >
              Produk
            </Link>
            <Link
              href="/#kenapa"
              className="block text-gray-700 hover:text-yellow-500 py-2 font-medium"
            >
              Kenapa Kami
            </Link>
            <Link
              href="/login"
              className="block bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-lg font-medium text-center"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
