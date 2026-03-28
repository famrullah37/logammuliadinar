"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="relative min-h-screen border-b border-[#908974]/30">
      <Image
        src="/slide_01.jpg"
        alt="Koin dinar emas"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#1c424f]/55" />

      <div className="relative z-10 min-h-[92vh] flex items-center pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Investasi Emas Syariah yang
              <span className="text-[#ce9233]"> Terpercaya</span>
            </h1>
            <p className="text-lg text-[#f4f1ea] leading-relaxed">
              Logam Mulia Dinar menyediakan emas murni berkualitas tinggi dengan
              sistem syariah yang transparan. Investasi cerdas untuk masa depan
              yang lebih aman.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-[#ce9233] hover:bg-[#b87f2d] text-white px-8 py-4 rounded-lg font-bold text-lg transition shadow-lg hover:shadow-xl">
                Mulai Investasi Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
