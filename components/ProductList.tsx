"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import ProductForm from "./ProductForm";

interface ProductListProps {
  onTabChange?: () => void;
}

export default function ProductList({ onTabChange }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("dinar_products")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal menghapus produk";
      alert("Error: " + errorMessage);
    }
  };

  const editingProduct = products.find((p) => p.id === editingId);

  if (editingId && editingProduct) {
    return (
      <div>
        <button
          onClick={() => setEditingId(null)}
          className="mb-6 text-yellow-600 hover:text-yellow-700 font-semibold flex items-center gap-2"
        >
          ← Kembali ke Daftar
        </button>
        <ProductForm
          initialData={editingProduct}
          onSuccess={() => {
            setEditingId(null);
            fetchProducts();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-4"></div>
        <p className="text-gray-600">Memuat produk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchProducts}
          className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Daftar Produk ({products.length})
      </h2>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-gray-200">
          <p className="text-gray-600 mb-4">
            Belum ada produk yang ditambahkan
          </p>
          <button
            onClick={onTabChange}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Tambah Produk Pertama
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setEditingId(product.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
