"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Brand, Price, ProductMaster, ProductVariant } from "@/lib/types";
import toast from "react-hot-toast";

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

// ── form state types ──────────────────────────────────────────────
type PriceForm = { brand_id: string; variant_id: string; harga_beli: string; harga_buyback: string };
type BrandForm = { name: string };
type ProductForm = { name: string };
type VariantForm = { product_id: string; type_name: string; weight: string };

const INIT_PRICE: PriceForm = { brand_id: "", variant_id: "", harga_beli: "", harga_buyback: "" };
const INIT_BRAND: BrandForm = { name: "" };
const INIT_PRODUCT: ProductForm = { name: "" };
const INIT_VARIANT: VariantForm = { product_id: "", type_name: "", weight: "" };

export default function AdminPage() {
  const router = useRouter();

  // loading / auth
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // master data
  const [prices, setPrices] = useState<Price[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // price form
  const [priceForm, setPriceForm] = useState<PriceForm>(INIT_PRICE);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  // brand form
  const [brandForm, setBrandForm] = useState<BrandForm>(INIT_BRAND);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [brandSubmitting, setBrandSubmitting] = useState(false);

  // product form
  const [productForm, setProductForm] = useState<ProductForm>(INIT_PRODUCT);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSubmitting, setProductSubmitting] = useState(false);

  // variant form
  const [variantForm, setVariantForm] = useState<VariantForm>(INIT_VARIANT);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantSubmitting, setVariantSubmitting] = useState(false);

  // sorted helpers
  const variantsByWeight = useMemo(
    () => [...variants].sort((a, b) => Number(a.weight) - Number(b.weight)),
    [variants],
  );

  const variantsForPriceSelect = useMemo(
    () =>
      variantsByWeight.map((v) => {
        const productName = products.find((p) => p.id === v.product_id)?.name ?? "—";
        return { id: v.id, label: `${productName} — ${v.type_name} (${v.weight} gram)` };
      }),
    [variantsByWeight, products],
  );

  // ── fetch helpers ────────────────────────────────────────────────
  const fetchMasterData = useCallback(async () => {
    const [brandsRes, productsRes, variantsRes] = await Promise.all([
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("products").select("id,name").order("name"),
      supabase.from("product_variants").select("id,product_id,type_name,weight").order("weight"),
    ]);
    if (brandsRes.error) throw brandsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (variantsRes.error) throw variantsRes.error;
    setBrands((brandsRes.data ?? []) as Brand[]);
    setProducts((productsRes.data ?? []) as ProductMaster[]);
    setVariants((variantsRes.data ?? []) as ProductVariant[]);
  }, []);

  const fetchPrices = useCallback(async () => {
    const { data, error } = await supabase
      .from("prices")
      .select(`id,brand_id,variant_id,harga_beli,harga_buyback,created_at,brands(id,name),product_variants(id,type_name,weight,product_id,products(id,name))`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    setPrices((data ?? []) as Price[]);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      await Promise.all([fetchMasterData(), fetchPrices()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setDataLoading(false);
    }
  }, [fetchMasterData, fetchPrices]);

  // ── auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }
        await loadData();
      } catch {
        router.push("/login");
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: unknown, session: { user?: { id: string } } | null) => {
        if (!session) router.push("/login");
      },
    );
    return () => subscription?.unsubscribe();
  }, [router, loadData]);

  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  // ── price CRUD ───────────────────────────────────────────────────
  const submitPriceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceForm.brand_id || !priceForm.variant_id || !priceForm.harga_beli || !priceForm.harga_buyback) {
      toast.error("Semua field wajib diisi"); return;
    }
    const hargaBeli = Number(priceForm.harga_beli);
    const hargaBuyback = Number(priceForm.harga_buyback);
    if (Number.isNaN(hargaBeli) || Number.isNaN(hargaBuyback)) {
      toast.error("Harga harus berupa angka valid"); return;
    }
    try {
      setPriceSubmitting(true);
      const payload = { brand_id: priceForm.brand_id, variant_id: priceForm.variant_id, harga_beli: hargaBeli, harga_buyback: hargaBuyback };
      if (editingPriceId) {
        const { error } = await supabase.from("prices").update(payload).eq("id", editingPriceId);
        if (error) throw error;
        toast.success("Harga berhasil diperbarui");
      } else {
        const { error } = await supabase.from("prices").insert([payload]);
        if (error) throw error;
        toast.success("Harga berhasil ditambahkan");
      }
      setPriceForm(INIT_PRICE); setEditingPriceId(null);
      await fetchPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan harga");
    } finally {
      setPriceSubmitting(false);
    }
  };

  const deletePrice = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data harga ini?")) return;
    try {
      const { error } = await supabase.from("prices").delete().eq("id", id);
      if (error) throw error;
      setPrices((c) => c.filter((p) => p.id !== id));
      toast.success("Harga berhasil dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus harga");
    }
  };

  // ── brand CRUD ───────────────────────────────────────────────────
  const submitBrandForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = brandForm.name.trim();
    if (!name) { toast.error("Nama brand wajib diisi"); return; }
    try {
      setBrandSubmitting(true);
      if (editingBrandId) {
        const { error } = await supabase.from("brands").update({ name }).eq("id", editingBrandId);
        if (error) throw error;
        toast.success("Brand berhasil diperbarui");
      } else {
        const { error } = await supabase.from("brands").insert([{ name }]);
        if (error) throw error;
        toast.success("Brand berhasil ditambahkan");
      }
      setBrandForm(INIT_BRAND); setEditingBrandId(null);
      await fetchMasterData(); await fetchPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan brand");
    } finally {
      setBrandSubmitting(false);
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Yakin ingin menghapus brand ini?")) return;
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Brand berhasil dihapus");
      await fetchMasterData(); await fetchPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus brand");
    }
  };

  // ── product master CRUD ──────────────────────────────────────────
  const submitProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = productForm.name.trim();
    if (!name) { toast.error("Nama produk wajib diisi"); return; }
    try {
      setProductSubmitting(true);
      if (editingProductId) {
        const { error } = await supabase.from("products").update({ name }).eq("id", editingProductId);
        if (error) throw error;
        toast.success("Produk berhasil diperbarui");
      } else {
        const { error } = await supabase.from("products").insert([{ name }]);
        if (error) throw error;
        toast.success("Produk berhasil ditambahkan");
      }
      setProductForm(INIT_PRODUCT); setEditingProductId(null);
      await fetchMasterData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setProductSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Yakin ingin menghapus produk ini? Semua variannya akan ikut terhapus.")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produk berhasil dihapus");
      await fetchMasterData(); await fetchPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus produk");
    }
  };

  // ── variant CRUD ─────────────────────────────────────────────────
  const submitVariantForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const type_name = variantForm.type_name.trim();
    const weight = Number(variantForm.weight);
    if (!variantForm.product_id) { toast.error("Pilih produk terlebih dahulu"); return; }
    if (!type_name) { toast.error("Nama tipe/varian wajib diisi"); return; }
    if (Number.isNaN(weight) || weight <= 0) { toast.error("Berat harus angka lebih dari 0"); return; }
    try {
      setVariantSubmitting(true);
      const payload = { product_id: variantForm.product_id, type_name, weight };
      if (editingVariantId) {
        const { error } = await supabase.from("product_variants").update(payload).eq("id", editingVariantId);
        if (error) throw error;
        toast.success("Varian berhasil diperbarui");
      } else {
        const { error } = await supabase.from("product_variants").insert([payload]);
        if (error) throw error;
        toast.success("Varian berhasil ditambahkan");
      }
      setVariantForm(INIT_VARIANT); setEditingVariantId(null);
      await fetchMasterData(); await fetchPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan varian");
    } finally {
      setVariantSubmitting(false);
    }
  };

  const deleteVariant = async (id: string) => {
    if (!confirm("Yakin ingin menghapus varian ini?")) return;
    try {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
      toast.success("Varian berhasil dihapus");
      await fetchMasterData(); await fetchPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus varian");
    }
  };

  // ── render ────────────────────────────────────────────────────────
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
      {/* Header */}
      <header className="bg-white border-b border-[#908974]/30 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin <span className="text-[#1c424f]">Logam Mulia Dinar</span>
            </h1>
            <p className="text-sm text-gray-500">Kelola brand, produk, varian, harga, dan pesanan</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="bg-[#1c424f] hover:bg-[#15323c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Pesanan
            </Link>
            <button
              onClick={logout}
              className="bg-[#ce9233] hover:bg-[#b87f2d] text-white px-5 py-2 rounded-lg font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Harga Form ── */}
        <section className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            {editingPriceId ? "Edit Data Harga" : "Tambah Data Harga"}
          </h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitPriceForm}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
              <select
                value={priceForm.brand_id}
                onChange={(e) => setPriceForm((p) => ({ ...p, brand_id: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              >
                <option value="">Pilih brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Varian Produk</label>
              <select
                value={priceForm.variant_id}
                onChange={(e) => setPriceForm((p) => ({ ...p, variant_id: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              >
                <option value="">Pilih varian</option>
                {variantsForPriceSelect.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Harga Beli</label>
              <input
                type="number"
                value={priceForm.harga_beli}
                onChange={(e) => setPriceForm((p) => ({ ...p, harga_beli: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh 1450000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Harga Buyback</label>
              <input
                type="number"
                value={priceForm.harga_buyback}
                onChange={(e) => setPriceForm((p) => ({ ...p, harga_buyback: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh 1375000"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={priceSubmitting}
                className="bg-[#1c424f] hover:bg-[#15323c] text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-60">
                {priceSubmitting ? "Menyimpan..." : editingPriceId ? "Simpan Perubahan" : "Tambah Harga"}
              </button>
              {editingPriceId && (
                <button type="button" onClick={() => { setPriceForm(INIT_PRICE); setEditingPriceId(null); }}
                  className="bg-white border border-[#908974]/40 text-[#1c424f] px-6 py-3 rounded-xl font-semibold hover:bg-[#f7f4ed] transition">
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ── Brand + Product grid ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Brand */}
          <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              {editingBrandId ? "Edit Brand" : "Tambah Brand"}
            </h2>
            <form className="space-y-3" onSubmit={submitBrandForm}>
              <input
                type="text"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ name: e.target.value })}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh: UBS"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={brandSubmitting}
                  className="bg-[#1c424f] hover:bg-[#15323c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60">
                  {brandSubmitting ? "Menyimpan..." : editingBrandId ? "Simpan" : "Tambah Brand"}
                </button>
                {editingBrandId && (
                  <button type="button" onClick={() => { setBrandForm(INIT_BRAND); setEditingBrandId(null); }}
                    className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#f7f4ed] transition">
                    Batal
                  </button>
                )}
              </div>
            </form>
            <div className="mt-4 space-y-2 max-h-60 overflow-auto pr-1">
              {brands.length === 0
                ? <p className="text-sm text-gray-500">Belum ada brand</p>
                : brands.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#908974]/25 bg-[#fcfaf6]">
                    <span className="text-sm font-semibold text-gray-800">{b.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingBrandId(b.id); setBrandForm({ name: b.name }); }}
                        className="px-2.5 py-1 rounded bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Edit</button>
                      <button onClick={() => deleteBrand(b.id)}
                        className="px-2.5 py-1 rounded border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition">Hapus</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Product master */}
          <div className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              {editingProductId ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <form className="space-y-3" onSubmit={submitProductForm}>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ name: e.target.value })}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh: Dinar Emas"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={productSubmitting}
                  className="bg-[#1c424f] hover:bg-[#15323c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60">
                  {productSubmitting ? "Menyimpan..." : editingProductId ? "Simpan" : "Tambah Produk"}
                </button>
                {editingProductId && (
                  <button type="button" onClick={() => { setProductForm(INIT_PRODUCT); setEditingProductId(null); }}
                    className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#f7f4ed] transition">
                    Batal
                  </button>
                )}
              </div>
            </form>
            <div className="mt-4 space-y-2 max-h-60 overflow-auto pr-1">
              {products.length === 0
                ? <p className="text-sm text-gray-500">Belum ada produk</p>
                : products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#908974]/25 bg-[#fcfaf6]">
                    <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingProductId(p.id); setProductForm({ name: p.name }); }}
                        className="px-2.5 py-1 rounded bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Edit</button>
                      <button onClick={() => deleteProduct(p.id)}
                        className="px-2.5 py-1 rounded border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition">Hapus</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* ── Variant management ── */}
        <section className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            {editingVariantId ? "Edit Varian Produk" : "Tambah Varian Produk"}
          </h2>
          <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={submitVariantForm}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Produk</label>
              <select
                value={variantForm.product_id}
                onChange={(e) => setVariantForm((v) => ({ ...v, product_id: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
              >
                <option value="">Pilih produk</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe / Varian</label>
              <input
                type="text"
                value={variantForm.type_name}
                onChange={(e) => setVariantForm((v) => ({ ...v, type_name: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh: Standar"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Berat (gram)</label>
              <input
                type="number"
                step="0.01"
                value={variantForm.weight}
                onChange={(e) => setVariantForm((v) => ({ ...v, weight: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="Contoh: 4.25"
              />
            </div>
            <div className="md:col-span-3 flex flex-wrap gap-3">
              <button type="submit" disabled={variantSubmitting}
                className="bg-[#1c424f] hover:bg-[#15323c] text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-60">
                {variantSubmitting ? "Menyimpan..." : editingVariantId ? "Simpan Varian" : "Tambah Varian"}
              </button>
              {editingVariantId && (
                <button type="button" onClick={() => { setVariantForm(INIT_VARIANT); setEditingVariantId(null); }}
                  className="bg-white border border-[#908974]/40 text-[#1c424f] px-6 py-3 rounded-xl font-semibold hover:bg-[#f7f4ed] transition">
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 overflow-x-auto rounded-xl border border-[#908974]/25">
            {variantsByWeight.length === 0
              ? <p className="text-sm text-gray-500 p-4">Belum ada varian</p>
              : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1c424f] text-white text-left">
                      <th className="px-4 py-2 font-semibold">Produk</th>
                      <th className="px-4 py-2 font-semibold">Tipe / Varian</th>
                      <th className="px-4 py-2 font-semibold">Berat</th>
                      <th className="px-4 py-2 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantsByWeight.map((v, i) => {
                      const productName = products.find((p) => p.id === v.product_id)?.name ?? "—";
                      return (
                        <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-[#fcfaf6]"}>
                          <td className="px-4 py-2 border-t border-[#f2ece0] font-semibold text-[#1c424f]">{productName}</td>
                          <td className="px-4 py-2 border-t border-[#f2ece0] text-gray-800">{v.type_name}</td>
                          <td className="px-4 py-2 border-t border-[#f2ece0] text-gray-800">{v.weight} gram</td>
                          <td className="px-4 py-2 border-t border-[#f2ece0] text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => { setEditingVariantId(v.id); setVariantForm({ product_id: v.product_id, type_name: v.type_name, weight: String(v.weight) }); }}
                                className="px-2.5 py-1 rounded bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Edit</button>
                              <button onClick={() => deleteVariant(v.id)}
                                className="px-2.5 py-1 rounded border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition">Hapus</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </section>

        {/* ── Price list ── */}
        <section className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">List Harga ({prices.length})</h2>
            <button onClick={loadData}
              className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg font-semibold hover:bg-[#f7f4ed] transition text-sm">
              Refresh
            </button>
          </div>

          {dataLoading ? (
            <div className="py-10 text-center bg-[#f7f4ed] rounded-xl">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ce9233]" />
              <p className="text-gray-600 mt-3">Memuat data...</p>
            </div>
          ) : prices.length === 0 ? (
            <div className="py-10 text-center bg-[#f7f4ed] rounded-xl">
              <p className="text-gray-600">Belum ada data harga</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#908974]/25">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#1c424f] text-white text-left">
                    <th className="px-4 py-3 font-semibold">Brand</th>
                    <th className="px-4 py-3 font-semibold">Produk</th>
                    <th className="px-4 py-3 font-semibold">Varian</th>
                    <th className="px-4 py-3 font-semibold">Berat</th>
                    <th className="px-4 py-3 font-semibold">Harga Beli</th>
                    <th className="px-4 py-3 font-semibold">Harga Buyback</th>
                    <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((price, i) => {
                    const pv = price.product_variants as (ProductVariant & { products?: ProductMaster }) | undefined;
                    return (
                      <tr key={price.id} className={i % 2 === 0 ? "bg-white" : "bg-[#fcfaf6]"}>
                        <td className="px-4 py-3 border-t border-[#f2ece0] font-semibold text-[#1c424f]">{price.brands?.name ?? "—"}</td>
                        <td className="px-4 py-3 border-t border-[#f2ece0] text-gray-800">{pv?.products?.name ?? "—"}</td>
                        <td className="px-4 py-3 border-t border-[#f2ece0] text-gray-800">{pv?.type_name ?? "—"}</td>
                        <td className="px-4 py-3 border-t border-[#f2ece0] text-gray-800">{pv?.weight ?? 0} gram</td>
                        <td className="px-4 py-3 border-t border-[#f2ece0] font-semibold text-[#704f19]">{formatCurrency(price.harga_beli)}</td>
                        <td className="px-4 py-3 border-t border-[#f2ece0] font-semibold text-[#1c424f]">{formatCurrency(price.harga_buyback)}</td>
                        <td className="px-4 py-3 border-t border-[#f2ece0] text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingPriceId(price.id);
                                setPriceForm({ brand_id: price.brand_id, variant_id: price.variant_id, harga_beli: String(price.harga_beli), harga_buyback: String(price.harga_buyback) });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Edit</button>
                            <button onClick={() => deletePrice(price.id)}
                              className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
