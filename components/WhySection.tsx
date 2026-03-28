"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function WhySection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);

  const reasons = [
    {
      title: "Kemurnian",
      description:
        "Dinar 24 Karat (999.9) dengan kualitas emas terbaik untuk investasi jangka panjang.",
      imageSrc: "/1-DINAR.png",
      imageClass: "object-contain",
    },
    {
      title: "Jaminan 99%",
      description:
        "Jaminan buyback hingga 99% dengan proses transparan dan harga kompetitif.",
      imageSrc: "/1per2-DINAR.png",
      imageClass: "object-cover rounded-xl",
    },
    {
      title: "Desain Berkelas",
      description:
        "Desain dinar elegan, sarat makna, cocok untuk investasi sekaligus koleksi bernilai.",
      imageSrc: "/BLKLG-DINAR.png",
      imageClass: "object-contain",
    },
    {
      title: "Likuid dan Fleksibel",
      description:
        "Pilihan pecahan beragam memudahkan strategi simpanan dan pencairan sesuai kebutuhan.",
      imageSrc: "/1per4-DINAR.png",
      imageClass: "object-cover rounded-xl",
    },
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = useMemo(
    () => Math.max(0, reasons.length - visibleCount),
    [reasons.length, visibleCount],
  );

  const activeIndex = Math.min(currentIndex, maxIndex);

  const goPrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const goNext = () => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));

  return (
    <section id="kenapa" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Kenapa Harus
            <span className="text-[#1c424f]"> Logam Mulia Dinar?</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-4xl mx-auto">
            Berikut keunggulan utama Dinar untuk membantu Anda membangun
            investasi emas yang lebih aman dan bernilai.
          </p>
        </div>

        <div className="relative">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="hidden md:inline-flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-white text-[#ce9233] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Sebelumnya"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${(activeIndex * 100) / visibleCount}%)`,
              }}
            >
              {reasons.map((reason, index) => (
                <div
                  key={index}
                  className="px-3"
                  style={{ flex: `0 0 ${100 / visibleCount}%` }}
                >
                  <div className="bg-white p-6 rounded-full h-full text-center">
                    <div className="w-40 h-40 mx-auto mb-6 relative">
                      <Image
                        src={reason.imageSrc}
                        alt={reason.title}
                        fill
                        className={reason.imageClass}
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-[#1c424f] mb-2">
                      {reason.title}
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={activeIndex === maxIndex}
            className="hidden md:inline-flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-white text-[#ce9233] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Berikutnya"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          <div className="mt-8 flex items-center justify-center gap-4 md:hidden">
            <button
              onClick={goPrev}
              disabled={activeIndex === 0}
              className="w-10 h-10 rounded-full bg-white text-[#ce9233] inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Sebelumnya"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={goNext}
              disabled={activeIndex === maxIndex}
              className="w-10 h-10 rounded-full bg-white text-[#ce9233] inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Berikutnya"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
