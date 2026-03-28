"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import toast from "react-hot-toast";

interface ProductFormProps {
  onSuccess?: () => void;
  initialData?: Product;
}

export default function ProductForm({
  onSuccess,
  initialData,
}: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [hargaKonsumen, setHargaKonsumen] = useState(
    initialData?.harga_konsumen.toString() || "",
  );
  const [hargaBuyback, setHargaBuyback] = useState(
    initialData?.harga_buyback.toString() || "",
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hargaKonsumenNum = parseInt(hargaKonsumen, 10);
      const hargaBuybackNum = parseInt(hargaBuyback, 10);

      if (!name || !hargaKonsumenNum || !hargaBuybackNum) {
        throw new Error("Semua field harus diisi");
      }

      if (initialData) {
        // Update
        const { error: updateError } = await supabase
          .from("dinar_products")
          .update({
            name,
            harga_konsumen: hargaKonsumenNum,
            harga_buyback: hargaBuybackNum,
          })
          .eq("id", initialData.id);

        if (updateError) throw updateError;
        toast.success("Produk berhasil diperbarui");
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("dinar_products")
          .insert([
            {
              name,
              harga_konsumen: hargaKonsumenNum,
              harga_buyback: hargaBuybackNum,
            },
          ]);

        if (insertError) throw insertError;
        toast.success("Produk berhasil ditambahkan");
        setName("");
        setHargaKonsumen("");
        setHargaBuyback("");
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {initialData ? "Edit Produk" : "Tambah Produk Baru"}
      </h2>

      {/* Jenis Dinar */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Jenis Dinar
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Dinar Murni 1 Gram"
          className="w-full px-4 py-3 border-2 border-[#908974]/40 rounded-lg focus:outline-none focus:border-[#1c424f] focus:ring-2 focus:ring-[#1c424f]/20 transition"
        />
      </div>

      {/* Harga Konsumen */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Harga Konsumen (Rp)
        </label>
        <input
          type="number"
          value={hargaKonsumen}
          onChange={(e) => setHargaKonsumen(e.target.value)}
          placeholder="Contoh: 850000"
          className="w-full px-4 py-3 border-2 border-[#908974]/40 rounded-lg focus:outline-none focus:border-[#1c424f] focus:ring-2 focus:ring-[#1c424f]/20 transition"
        />
      </div>

      {/* Harga Buyback */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Harga Buyback (Rp)
        </label>
        <input
          type="number"
          value={hargaBuyback}
          onChange={(e) => setHargaBuyback(e.target.value)}
          placeholder="Contoh: 820000"
          className="w-full px-4 py-3 border-2 border-[#908974]/40 rounded-lg focus:outline-none focus:border-[#1c424f] focus:ring-2 focus:ring-[#1c424f]/20 transition"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#1c424f] hover:bg-[#15323c] disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition shadow-lg hover:shadow-xl disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {initialData ? "Menyimpan..." : "Menambahkan..."}
            </span>
          ) : (
            <span>{initialData ? "Simpan Perubahan" : "Tambah Produk"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
