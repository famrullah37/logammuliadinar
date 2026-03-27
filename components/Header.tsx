"use client";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-yellow-50 via-white to-green-50 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Investasi Emas Syariah yang
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                {" "}
                Terpercaya
              </span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Logam Mulia Dinar menyediakan emas murni berkualitas tinggi dengan
              sistem syariah yang transparan. Investasi cerdas untuk masa depan
              yang lebih aman.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition shadow-lg hover:shadow-xl">
                Mulai Investasi Sekarang
              </button>
              <button className="border-2 border-green-500 text-green-600 hover:bg-green-50 px-8 py-4 rounded-lg font-bold text-lg transition">
                Hubungi Kami
              </button>
            </div>
          </div>

          {/* Right Image */}
          <div className="flex justify-center">
            <div className="w-64 h-64 bg-gradient-to-br from-yellow-300 via-yellow-200 to-green-200 rounded-full flex items-center justify-center shadow-2xl">
              <div className="text-6xl">💰</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
