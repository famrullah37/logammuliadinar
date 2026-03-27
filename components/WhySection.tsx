"use client";

export default function WhySection() {
  const reasons = [
    {
      icon: "✓",
      title: "Bersertifikat Internasional",
      description:
        "Semua produk kami telah lulus sertifikasi internasional dan diakui secara global.",
    },
    {
      icon: "📜",
      title: "Halal dan Syariah",
      description:
        "Investasi yang sesuai dengan prinsip syariah dan telah mendapat fatwa resmi.",
    },
    {
      icon: "🛡️",
      title: "Aman dan Terpercaya",
      description:
        "Deposit emas Anda disimpan di vault aman dengan asuransi penuh.",
    },
    {
      icon: "💰",
      title: "Harga Kompetitif",
      description:
        "Harga konsumen dan buyback terbaik di kelasnya dengan transparansi penuh.",
    },
    {
      icon: "⏱️",
      title: "Transaksi Cepat",
      description:
        "Proses pembelian dan penjualan yang mudah dan dapat dilakukan kapan saja.",
    },
    {
      icon: "👥",
      title: "Layanan Pelanggan 24/7",
      description:
        "Tim profesional kami siap membantu Anda setiap saat melalui berbagai channel.",
    },
  ];

  return (
    <section
      id="kenapa"
      className="py-16 sm:py-24 bg-gradient-to-b from-white via-green-50 to-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Kenapa Memilih
            <span className="bg-gradient-to-r from-yellow-400 to-green-500 bg-clip-text text-transparent">
              {" "}
              Logam Mulia Dinar?
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Kami berkomitmen memberikan layanan terbaik untuk investasi emas
            Anda
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition border-2 border-transparent hover:border-yellow-300"
            >
              <div className="text-4xl mb-4">{reason.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {reason.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
