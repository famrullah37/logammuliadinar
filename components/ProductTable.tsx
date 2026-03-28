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
    <div className="overflow-x-auto rounded-xl">
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233]"></div>
          <p className="text-gray-600 mt-4">Memuat data produk...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-600">Belum ada produk yang tersedia</p>
        </div>
      ) : (
        <table className="w-full border-separate [border-spacing:8px]">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-black text-white rounded-lg text-left font-extrabold text-lg">
                Jenis Dinar
              </th>
              <th className="px-6 py-3 bg-black text-white rounded-lg text-center font-extrabold text-lg">
                Konsumen
              </th>
              <th className="px-6 py-3 bg-black text-white rounded-lg text-center font-extrabold text-lg">
                Buyback
              </th>
              <th className="px-6 py-3 bg-black text-white rounded-lg text-center font-extrabold text-lg">
                Beli
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="p-0 align-middle">
                  <div className="bg-[#e5e5e7] rounded-lg px-4 py-3 min-w-65">
                    <div className="leading-tight">
                      <p className="text-[#1c424f] font-extrabold text-xl">
                        {product.name}
                      </p>
                      <p className="text-[#4b5563] text-xs">
                        Logam Mulia Dinar
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-0 align-middle">
                  <div className="bg-[#1c424f] text-white rounded-lg px-4 py-5 text-center font-extrabold text-[1.9rem] leading-none tracking-wide min-w-57.5">
                    {product.harga_konsumen.toLocaleString("id-ID")}
                  </div>
                </td>
                <td className="p-0 align-middle">
                  <div className="bg-[#e5e5e7] text-[#1c424f] rounded-lg px-4 py-5 text-center font-extrabold text-[1.9rem] leading-none tracking-wide min-w-57.5">
                    {product.harga_buyback.toLocaleString("id-ID")}
                  </div>
                </td>
                <td className="p-0 align-middle">
                  <a
                    href="https://wa.me/6281233272733"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-full min-h-22 w-full inline-flex items-center justify-center gap-2 bg-[#ce9233] hover:bg-[#b87f2d] text-white px-4 py-2 rounded-lg font-bold transition"
                  >
                    <svg
                      className="w-6 h-6"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 50 50"
                      fill="currentColor"
                    >
                      <path d="M25,2C12.318,2,2,12.318,2,25c0,3.96,1.023,7.854,2.963,11.29L2.037,46.73c-0.096,0.343-0.003,0.711,0.245,0.966 C2.473,47.893,2.733,48,3,48c0.08,0,0.161-0.01,0.24-0.029l10.896-2.699C17.463,47.058,21.21,48,25,48c12.682,0,23-10.318,23-23 S37.682,2,25,2z M36.57,33.116c-0.492,1.362-2.852,2.605-3.986,2.772c-1.018,0.149-2.306,0.213-3.72-0.231 c-0.857-0.27-1.957-0.628-3.366-1.229c-5.923-2.526-9.791-8.415-10.087-8.804C15.116,25.235,13,22.463,13,19.594 s1.525-4.28,2.067-4.864c0.542-0.584,1.181-0.73,1.575-0.73s0.787,0.005,1.132,0.021c0.363,0.018,0.85-0.137,1.329,1.001 c0.492,1.168,1.673,4.037,1.819,4.33c0.148,0.292,0.246,0.633,0.05,1.022c-0.196,0.389-0.294,0.632-0.59,0.973 s-0.62,0.76-0.886,1.022c-0.296,0.291-0.603,0.606-0.259,1.19c0.344,0.584,1.529,2.493,3.285,4.039 c2.255,1.986,4.158,2.602,4.748,2.894c0.59,0.292,0.935,0.243,1.279-0.146c0.344-0.39,1.476-1.703,1.869-2.286 s0.787-0.487,1.329-0.292c0.542,0.194,3.445,1.604,4.035,1.896c0.59,0.292,0.984,0.438,1.132,0.681 C37.062,30.587,37.062,31.755,36.57,33.116z"></path>
                    </svg>
                    Chat
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
