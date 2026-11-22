import { ClipboardList, MessageCircle, MousePointerClick, PackageCheck } from "lucide-react";

// Sesuai alur checkout yang sebenarnya (lihat PRD §4.4).
const STEPS = [
  {
    icon: MousePointerClick,
    title: "Pilih produk",
    description: "Pilih dinar atau emas batangan dari brand yang Anda inginkan, lalu klik harganya.",
  },
  {
    icon: ClipboardList,
    title: "Isi data, tanpa akun",
    description: "Masukkan nama, nomor WhatsApp, metode pengiriman, dan pembayaran. Tidak perlu daftar.",
  },
  {
    icon: MessageCircle,
    title: "Konfirmasi via WhatsApp",
    description: "Anda mendapat nomor pesanan. Admin kami menghubungi untuk konfirmasi pembayaran.",
  },
  {
    icon: PackageCheck,
    title: "Ambil atau dikirim",
    description: "Ambil langsung di toko atau terima di alamat Anda. Pantau status kapan saja.",
  },
];

export default function HowToBuy() {
  return (
    <section id="cara-beli" className="scroll-mt-20 bg-brand-cream py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Cara Beli</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight">
            Empat langkah, tanpa ribet
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Beli dinar emas langsung dari website. Harga dikunci saat Anda membuat pesanan.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-3xl border border-brand-olive/15 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-deep/5"
            >
              <span
                className="absolute right-6 top-5 font-display text-5xl font-bold text-brand-olive/15 select-none"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-deep text-brand-gold-light">
                <step.icon size={22} />
              </div>
              <h3 className="relative mt-6 text-lg font-semibold text-gray-900">
                <span className="sr-only">Langkah {i + 1}: </span>
                {step.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
