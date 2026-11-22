import Image from "next/image";

const formatWeight = (w: number) => `${w.toLocaleString("id-ID", { maximumFractionDigits: 3 })}g`;

/**
 * Gambar produk. Path lokal dioptimasi next/image; URL https eksternal
 * ditampilkan apa adanya (unoptimized) agar tidak perlu konfigurasi remotePatterns.
 * Tanpa gambar → koin emas bergaya dengan label berat.
 */
export default function ProductImage({
  src,
  alt,
  weight,
  bar = false,
  sizes,
  className = "",
}: {
  src: string | null;
  alt: string;
  weight: number;
  /** produk batangan → cadangan berbentuk persegi panjang, bukan koin */
  bar?: boolean;
  sizes: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex ${bar ? "aspect-[3/4] rounded-2xl" : "aspect-square rounded-full"} items-center justify-center bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark shadow-2xl shadow-brand-gold/30 ring-8 ring-brand-gold/20 ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="font-display text-2xl sm:text-4xl font-bold text-brand-ink/80">{formatWeight(weight)}</span>
      </div>
    );
  }

  return (
    <div className={`relative aspect-square ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={!src.startsWith("/")}
        className="object-contain drop-shadow-2xl"
      />
    </div>
  );
}
