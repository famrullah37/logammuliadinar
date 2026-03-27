"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("dinar_products")
          .select("*");

        if (fetchError) throw fetchError;
        setProducts(data || []);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Gagal memuat produk";
        setError(errorMessage);
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          Pastikan tabel dinar_products sudah dibuat di Supabase
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-lg border border-gray-200">
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          <p className="text-gray-600 mt-4">Memuat data produk...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-600">Belum ada produk yang tersedia</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-yellow-100 to-green-50 border-b-2 border-yellow-300">
              <th className="px-6 py-4 text-left font-bold text-gray-800">
                Jenis Dinar
              </th>
              <th className="px-6 py-4 text-left font-bold text-gray-800">
                Harga Konsumen
              </th>
              <th className="px-6 py-4 text-left font-bold text-gray-800">
                Harga Buyback
              </th>
              <th className="px-6 py-4 text-center font-bold text-gray-800">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={product.id}
                className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-yellow-50"} hover:bg-green-50 transition`}
              >
                <td className="px-6 py-4 font-semibold text-gray-800">
                  {product.name}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Rp{product.harga_konsumen.toLocaleString("id-ID")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Rp{product.harga_buyback.toLocaleString("id-ID")}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <a
                    href="https://wa.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.036-5.044 5.46-5.044 9.075 0 1.71.33 3.361.997 4.919l-1.06 3.861 3.95-1.034c1.454.746 3.083 1.14 4.75 1.14h.004c5.305 0 9.668-4.356 9.668-9.674 0-2.589-.525-5.02-1.54-7.362-1.007-2.307-2.515-4.365-4.38-5.855-1.858-1.466-4.217-2.273-6.708-2.272Z" />
                    </svg>
                    Chat via WhatsApp
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
