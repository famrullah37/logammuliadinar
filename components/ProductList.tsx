"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import ProductForm from "./ProductForm";
import toast from "react-hot-toast";

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
      toast.error(errorMessage);
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
      toast.success("Produk berhasil dihapus");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal menghapus produk";
      toast.error(errorMessage);
    }
  };

  const editingProduct = products.find((p) => p.id === editingId);

  if (editingId && editingProduct) {
    return (
      <div>
        <button
          onClick={() => setEditingId(null)}
          className="mb-6 text-[#1c424f] hover:text-[#15323c] font-semibold flex items-center gap-2"
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233] mb-4"></div>
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
            className="bg-[#ce9233] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#b87f2d] hover:shadow-lg transition"
          >
            Tambah Produk Pertama
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f1e5cf] border-b-2 border-[#908974]/50">
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
                  className={`border-b border-[#908974]/20 ${index % 2 === 0 ? "bg-white" : "bg-[#fbf8f2]"} hover:bg-[#eef3f5] transition`}
                >
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {product.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#f1e5cf] text-[#704f19] px-3 py-1 rounded-full text-sm font-semibold">
                      Rp{product.harga_konsumen.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#e6eff2] text-[#1c424f] px-3 py-1 rounded-full text-sm font-semibold">
                      Rp{product.harga_buyback.toLocaleString("id-ID")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setEditingId(product.id)}
                        className="bg-[#1c424f] hover:bg-[#15323c] text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
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
