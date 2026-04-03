"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Brand, Price, ProductMaster } from "@/lib/types";
import toast from "react-hot-toast";

type PriceFormState = {
  brand_id: string;
  product_id: string;
  harga_beli: string;
  harga_buyback: string;
};

type BrandFormState = {
  name: string;
};

type ProductFormState = {
  name: string;
  weight: string;
};

const initialFormState: PriceFormState = {
  brand_id: "",
  product_id: "",
  harga_beli: "",
  harga_buyback: "",
};

const initialBrandFormState: BrandFormState = {
  name: "",
};

const initialProductFormState: ProductFormState = {
  name: "",
  weight: "",
};

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function AdminPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [prices, setPrices] = useState<Price[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [form, setForm] = useState<PriceFormState>(initialFormState);
  const [brandForm, setBrandForm] = useState<BrandFormState>(
    initialBrandFormState,
  );
  const [productForm, setProductForm] = useState<ProductFormState>(
    initialProductFormState,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const productsByWeight = useMemo(
    () => [...products].sort((a, b) => Number(a.weight) - Number(b.weight)),
    [products],
  );

  const fetchMasterData = useCallback(async () => {
    const [brandsResult, productsResult] = await Promise.all([
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("products").select("id,name,weight").order("weight"),
    ]);

    if (brandsResult.error) {
      throw brandsResult.error;
    }

    if (productsResult.error) {
      throw productsResult.error;
    }

    setBrands((brandsResult.data ?? []) as Brand[]);
    setProducts((productsResult.data ?? []) as ProductMaster[]);
  }, []);

  const fetchPrices = useCallback(async () => {
    const { data, error } = await supabase
      .from("prices")
      .select(
        `
        id,
        brand_id,
        product_id,
        harga_beli,
        harga_buyback,
        created_at,
        brands(id,name),
        products(id,name,weight)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setPrices((data ?? []) as Price[]);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      await Promise.all([fetchMasterData(), fetchPrices()]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal memuat data admin";
      toast.error(errorMessage);
    } finally {
      setDataLoading(false);
    }
  }, [fetchMasterData, fetchPrices]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        await loadData();
      } catch {
        router.push("/login");
      } finally {
        setAuthLoading(false);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: unknown, session: { user?: { id: string } } | null) => {
        if (!session) {
          router.push("/login");
        }
      },
    );

    return () => subscription?.unsubscribe();
  }, [router, loadData]);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const resetBrandForm = () => {
    setBrandForm(initialBrandFormState);
    setEditingBrandId(null);
  };

  const resetProductForm = () => {
    setProductForm(initialProductFormState);
    setEditingProductId(null);
  };

  const startEdit = (price: Price) => {
    setEditingId(price.id);
    setForm({
      brand_id: price.brand_id,
      product_id: price.product_id,
      harga_beli: String(price.harga_beli),
      harga_buyback: String(price.harga_buyback),
    });
  };

  const startEditBrand = (brand: Brand) => {
    setEditingBrandId(brand.id);
    setBrandForm({ name: brand.name });
  };

  const startEditProduct = (product: ProductMaster) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      weight: String(product.weight),
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !form.brand_id ||
      !form.product_id ||
      !form.harga_beli ||
      !form.harga_buyback
    ) {
      toast.error("Semua field wajib diisi");
      return;
    }

    const hargaBeli = Number(form.harga_beli);
    const hargaBuyback = Number(form.harga_buyback);

    if (Number.isNaN(hargaBeli) || Number.isNaN(hargaBuyback)) {
      toast.error("Harga harus berupa angka valid");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        const { error } = await supabase
          .from("prices")
          .update({
            brand_id: form.brand_id,
            product_id: form.product_id,
            harga_beli: hargaBeli,
            harga_buyback: hargaBuyback,
          })
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        toast.success("Data harga berhasil diperbarui");
      } else {
        const { error } = await supabase.from("prices").insert([
          {
            brand_id: form.brand_id,
            product_id: form.product_id,
            harga_beli: hargaBeli,
            harga_buyback: hargaBuyback,
          },
        ]);

        if (error) {
          throw error;
        }

        toast.success("Data harga berhasil ditambahkan");
      }

      resetForm();
      await fetchPrices();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menyimpan data harga";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const deletePrice = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data harga ini?")) {
      return;
    }

    try {
      const { error } = await supabase.from("prices").delete().eq("id", id);
      if (error) {
        throw error;
      }

      setPrices((current) => current.filter((item) => item.id !== id));
      toast.success("Data harga berhasil dihapus");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menghapus data harga";
      toast.error(errorMessage);
    }
  };

  const submitBrandForm = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = brandForm.name.trim();
    if (!name) {
      toast.error("Nama brand wajib diisi");
      return;
    }

    try {
      setBrandSubmitting(true);

      if (editingBrandId) {
        const { error } = await supabase
          .from("brands")
          .update({ name })
          .eq("id", editingBrandId);

        if (error) {
          throw error;
        }

        toast.success("Brand berhasil diperbarui");
      } else {
        const { error } = await supabase.from("brands").insert([{ name }]);

        if (error) {
          throw error;
        }

        toast.success("Brand berhasil ditambahkan");
      }

      resetBrandForm();
      await fetchMasterData();
      await fetchPrices();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menyimpan brand";
      toast.error(errorMessage);
    } finally {
      setBrandSubmitting(false);
    }
  };

  const submitProductForm = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = productForm.name.trim();
    const weight = Number(productForm.weight);

    if (!name) {
      toast.error("Nama product wajib diisi");
      return;
    }

    if (Number.isNaN(weight) || weight <= 0) {
      toast.error("Weight harus angka lebih dari 0");
      return;
    }

    try {
      setProductSubmitting(true);

      if (editingProductId) {
        const { error } = await supabase
          .from("products")
          .update({ name, weight })
          .eq("id", editingProductId);

        if (error) {
          throw error;
        }

        toast.success("Product berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([{ name, weight }]);

        if (error) {
          throw error;
        }

        toast.success("Product berhasil ditambahkan");
      }

      resetProductForm();
      await fetchMasterData();
      await fetchPrices();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menyimpan product";
      toast.error(errorMessage);
    } finally {
      setProductSubmitting(false);
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Yakin ingin menghapus brand ini?")) {
      return;
    }

    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Brand berhasil dihapus");
      await fetchMasterData();
      await fetchPrices();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menghapus brand";
      toast.error(errorMessage);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Yakin ingin menghapus product ini?")) {
      return;
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Product berhasil dihapus");
      await fetchMasterData();
      await fetchPrices();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menghapus product";
      toast.error(errorMessage);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#ce9233]" />
          <p className="text-gray-600 mt-4">Memeriksa sesi login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin
              <span className="text-[#1c424f]"> Harga Dinar</span>
            </h1>
            <p className="text-sm text-gray-600">
              Kelola relasi brand, product, dan harga
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-[#ce9233] hover:bg-[#b87f2d] text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        <section className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
            {editingId ? "Edit Data Harga" : "Tambah Data Harga"}
          </h2>

          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={submitForm}
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Brand
              </label>
              <select
                value={form.brand_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, brand_id: event.target.value }))
                }
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              >
                <option value="">Pilih brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product
              </label>
              <select
                value={form.product_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    product_id: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              >
                <option value="">Pilih product</option>
                {productsByWeight.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.weight} gram)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga Beli
              </label>
              <input
                type="number"
                value={form.harga_beli}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    harga_beli: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh 1450000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga Buyback
              </label>
              <input
                type="number"
                value={form.harga_buyback}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    harga_buyback: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh 1375000"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#1c424f] hover:bg-[#15323c] text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-60"
              >
                {submitting
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan Perubahan"
                    : "Tambah Data"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white border border-[#908974]/40 text-[#1c424f] px-6 py-3 rounded-xl font-semibold transition hover:bg-[#f7f4ed]"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
              {editingBrandId ? "Edit Brand" : "Tambah Brand"}
            </h2>

            <form className="space-y-3" onSubmit={submitBrandForm}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Brand
                </label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(event) =>
                    setBrandForm({ name: event.target.value })
                  }
                  className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                  placeholder="Contoh: UBS"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={brandSubmitting}
                  className="bg-[#1c424f] hover:bg-[#15323c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60"
                >
                  {brandSubmitting
                    ? "Menyimpan..."
                    : editingBrandId
                      ? "Simpan Brand"
                      : "Tambah Brand"}
                </button>
                {editingBrandId && (
                  <button
                    type="button"
                    onClick={resetBrandForm}
                    className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#f7f4ed] transition"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-2 max-h-72 overflow-auto pr-1">
              {brands.length === 0 ? (
                <p className="text-sm text-gray-600">Belum ada brand</p>
              ) : (
                brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#908974]/25 bg-[#fcfaf6]"
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      {brand.name}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditBrand(brand)}
                        className="px-2.5 py-1 rounded-md bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBrand(brand.id)}
                        className="px-2.5 py-1 rounded-md border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
              {editingProductId ? "Edit Product" : "Tambah Product"}
            </h2>

            <form className="space-y-3" onSubmit={submitProductForm}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Product
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                  placeholder="Contoh: Emas Batangan"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weight (gram)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.weight}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      weight: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                  placeholder="Contoh: 1"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="bg-[#1c424f] hover:bg-[#15323c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60"
                >
                  {productSubmitting
                    ? "Menyimpan..."
                    : editingProductId
                      ? "Simpan Product"
                      : "Tambah Product"}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#f7f4ed] transition"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-2 max-h-72 overflow-auto pr-1">
              {productsByWeight.length === 0 ? (
                <p className="text-sm text-gray-600">Belum ada product</p>
              ) : (
                productsByWeight.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#908974]/25 bg-[#fcfaf6]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {product.weight} gram
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditProduct(product)}
                        className="px-2.5 py-1 rounded-md bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="px-2.5 py-1 rounded-md border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              List Harga ({prices.length})
            </h2>
            <button
              onClick={loadData}
              className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg font-semibold hover:bg-[#f7f4ed] transition"
            >
              Refresh
            </button>
          </div>

          {dataLoading ? (
            <div className="py-10 text-center bg-[#f7f4ed] rounded-xl">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233]" />
              <p className="text-gray-600 mt-3">Memuat data harga...</p>
            </div>
          ) : prices.length === 0 ? (
            <div className="py-10 text-center bg-[#f7f4ed] rounded-xl">
              <p className="text-gray-600">Belum ada data di tabel prices</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#908974]/25">
              <table className="w-full min-w-205 border-collapse">
                <thead>
                  <tr className="bg-[#1c424f] text-white text-left">
                    <th className="px-4 py-3 text-sm font-semibold">Brand</th>
                    <th className="px-4 py-3 text-sm font-semibold">Product</th>
                    <th className="px-4 py-3 text-sm font-semibold">Weight</th>
                    <th className="px-4 py-3 text-sm font-semibold">
                      Harga Beli
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold">
                      Harga Buyback
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price, index) => (
                    <tr
                      key={price.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-[#fcfaf6]"}
                    >
                      <td className="px-4 py-3 border-t border-[#f2ece0] text-sm font-semibold text-[#1c424f]">
                        {price.brands?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 border-t border-[#f2ece0] text-sm text-gray-800">
                        {price.products?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 border-t border-[#f2ece0] text-sm text-gray-800">
                        {price.products?.weight ?? 0} gram
                      </td>
                      <td className="px-4 py-3 border-t border-[#f2ece0] text-sm font-semibold text-[#704f19]">
                        {formatCurrency(price.harga_beli)}
                      </td>
                      <td className="px-4 py-3 border-t border-[#f2ece0] text-sm font-semibold text-[#1c424f]">
                        {formatCurrency(price.harga_buyback)}
                      </td>
                      <td className="px-4 py-3 border-t border-[#f2ece0] text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(price)}
                            className="px-3 py-1.5 rounded-lg bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePrice(price.id)}
                            className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition"
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
        </section>
      </main>
    </div>
  );
}
