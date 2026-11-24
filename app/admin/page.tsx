"use client";

import AdminNav from "@/components/admin/AdminNav";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Brand, Price, ProductMaster, ProductVariant } from "@/lib/types";
import toast from "react-hot-toast";

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

// ── form state types ──────────────────────────────────────────────
type PriceForm = { brand_id: string; variant_id: string; harga_beli: string; harga_buyback: string; image_url: string; description: string };
type BrandForm = { name: string };
type ProductForm = { name: string };
type VariantForm = {
  product_id: string; type_name: string; weight: string;
  purity: string; image_url: string; description: string;
};

const INIT_PRICE: PriceForm = { brand_id: "", variant_id: "", harga_beli: "", harga_buyback: "", image_url: "", description: "" };
const INIT_BRAND: BrandForm = { name: "" };
const INIT_PRODUCT: ProductForm = { name: "" };
const INIT_VARIANT: VariantForm = { product_id: "", type_name: "", weight: "", purity: "999.9", image_url: "", description: "" };

// Gambar yang sudah ada di /public, ditawarkan sebagai pilihan cepat.
const IMAGE_PRESETS = ["/1per4-DINAR.png", "/1per2-DINAR.png", "/1-DINAR.png", "/BLKLG-DINAR.png"];

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
  const fetchAll = useCallback(async () => {
    const data = await api<{ brands: Brand[]; products: ProductMaster[]; variants: ProductVariant[]; prices: Price[] }>(
      "/api/admin/data",
    );
    setBrands(data.brands);
    setProducts(data.products);
    setVariants(data.variants);
    setPrices(data.prices);
  }, []);

  /** Tangani error API: sesi habis → ke /login, selain itu tampilkan toast. */
  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : fallback);
    },
    [router],
  );

  // Naikkan reloadKey untuk memuat ulang data (tombol Muat ulang).
  const [reloadKey, setReloadKey] = useState(0);

  // ── muat data ────────────────────────────────────────────────────
  // Proxy sudah mengarahkan ke /login bila belum login; di sini cukup muat data.
  useEffect(() => {
    let ignore = false;
    api<{ brands: Brand[]; products: ProductMaster[]; variants: ProductVariant[]; prices: Price[] }>("/api/admin/data")
      .then((data) => {
        if (ignore) return;
        setBrands(data.brands);
        setProducts(data.products);
        setVariants(data.variants);
        setPrices(data.prices);
      })
      .catch((err) => { if (!ignore) handleError(err, "Gagal memuat data"); })
      .finally(() => {
        if (ignore) return;
        setDataLoading(false);
        setAuthLoading(false);
      });
    return () => { ignore = true; };
  }, [handleError, reloadKey]);

  /** Simpan (tambah/ubah) satu resource admin. */
  const save = (resource: string, id: string | null, payload: Record<string, unknown>) =>
    id
      ? api(`/api/admin/${resource}/${id}`, { method: "PUT", body: payload })
      : api(`/api/admin/${resource}`, { method: "POST", body: payload });

  const remove = (resource: string, id: string) => api(`/api/admin/${resource}/${id}`, { method: "DELETE" });

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
      await save("prices", editingPriceId, {
        brand_id: priceForm.brand_id, variant_id: priceForm.variant_id, harga_beli: hargaBeli, harga_buyback: hargaBuyback,
        image_url: priceForm.image_url.trim(), description: priceForm.description.trim(),
      });
      toast.success(editingPriceId ? "Harga berhasil diperbarui" : "Harga berhasil ditambahkan");
      setPriceForm(INIT_PRICE); setEditingPriceId(null);
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menyimpan harga");
    } finally {
      setPriceSubmitting(false);
    }
  };

  const deletePrice = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data harga ini?")) return;
    try {
      await remove("prices", id);
      setPrices((c) => c.filter((p) => p.id !== id));
      toast.success("Harga berhasil dihapus");
    } catch (err) {
      handleError(err, "Gagal menghapus harga");
    }
  };

  // ── brand CRUD ───────────────────────────────────────────────────
  const submitBrandForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = brandForm.name.trim();
    if (!name) { toast.error("Nama brand wajib diisi"); return; }
    try {
      setBrandSubmitting(true);
      await save("brands", editingBrandId, { name });
      toast.success(editingBrandId ? "Brand berhasil diperbarui" : "Brand berhasil ditambahkan");
      setBrandForm(INIT_BRAND); setEditingBrandId(null);
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menyimpan brand");
    } finally {
      setBrandSubmitting(false);
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Yakin ingin menghapus brand ini?")) return;
    try {
      await remove("brands", id);
      toast.success("Brand berhasil dihapus");
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menghapus brand");
    }
  };

  // ── product master CRUD ──────────────────────────────────────────
  const submitProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = productForm.name.trim();
    if (!name) { toast.error("Nama produk wajib diisi"); return; }
    try {
      setProductSubmitting(true);
      await save("products", editingProductId, { name });
      toast.success(editingProductId ? "Produk berhasil diperbarui" : "Produk berhasil ditambahkan");
      setProductForm(INIT_PRODUCT); setEditingProductId(null);
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menyimpan produk");
    } finally {
      setProductSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Yakin ingin menghapus produk ini? Semua variannya akan ikut terhapus.")) return;
    try {
      await remove("products", id);
      toast.success("Produk berhasil dihapus");
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menghapus produk");
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
      await save("variants", editingVariantId, {
        product_id: variantForm.product_id, type_name, weight,
        purity: variantForm.purity.trim() || "999.9",
        image_url: variantForm.image_url.trim(),
        description: variantForm.description.trim(),
      });
      toast.success(editingVariantId ? "Varian berhasil diperbarui" : "Varian berhasil ditambahkan");
      setVariantForm(INIT_VARIANT); setEditingVariantId(null);
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menyimpan varian");
    } finally {
      setVariantSubmitting(false);
    }
  };

  const deleteVariant = async (id: string) => {
    if (!confirm("Yakin ingin menghapus varian ini?")) return;
    try {
      await remove("variants", id);
      toast.success("Varian berhasil dihapus");
      await fetchAll();
    } catch (err) {
      handleError(err, "Gagal menghapus varian");
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
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Produk <span className="text-[#1c424f]">& Harga</span></h1>
          <p className="text-sm text-gray-500">Kelola brand, produk (kategori), varian (pecahan), dan harga brand × varian.</p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Harga Form ── */}
        <section className="bg-white rounded-2xl border border-[#908974]/30 shadow-sm p-5 sm:p-7">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            {editingPriceId ? "Ubah Data Harga" : "Tambah Data Harga"}
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

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gambar khusus brand ini <span className="font-normal text-gray-400">(opsional — kosong = pakai gambar varian)</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  list="variant-image-presets"
                  value={priceForm.image_url}
                  onChange={(e) => setPriceForm((p) => ({ ...p, image_url: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                  placeholder="/1-DINAR.png atau https://..."
                />
                {(priceForm.image_url.startsWith("/") || priceForm.image_url.startsWith("https://")) && (
                  // eslint-disable-next-line @next/next/no-img-element -- pratinjau sederhana, path bebas diketik admin
                  <img src={priceForm.image_url} alt="Pratinjau" className="h-12 w-12 shrink-0 rounded-lg border border-[#908974]/30 object-contain bg-[#f7f4ed]" />
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deskripsi khusus brand ini <span className="font-normal text-gray-400">(opsional — tampil di halaman detail brand)</span>
              </label>
              <textarea
                rows={3}
                value={priceForm.description}
                onChange={(e) => setPriceForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f] resize-y"
                placeholder="Contoh: Dinar Antam dengan sertifikat LBMA, kemasan segel resmi."
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
              {editingBrandId ? "Ubah Brand" : "Tambah Brand"}
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
                        className="px-2.5 py-1 rounded bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Ubah</button>
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
              {editingProductId ? "Ubah Produk" : "Tambah Produk"}
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
                        className="px-2.5 py-1 rounded bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Ubah</button>
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
            {editingVariantId ? "Ubah Varian Produk" : "Tambah Varian Produk"}
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Kadar emas (Au)</label>
              <input
                type="text"
                value={variantForm.purity}
                onChange={(e) => setVariantForm((v) => ({ ...v, purity: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                placeholder="999.9"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gambar <span className="font-normal text-gray-400">(opsional — path /public atau URL https)</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  list="variant-image-presets"
                  value={variantForm.image_url}
                  onChange={(e) => setVariantForm((v) => ({ ...v, image_url: e.target.value }))}
                  className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f]"
                  placeholder="/1-DINAR.png"
                />
                <datalist id="variant-image-presets">
                  {IMAGE_PRESETS.map((src) => <option key={src} value={src} />)}
                </datalist>
                {(variantForm.image_url.startsWith("/") || variantForm.image_url.startsWith("https://")) && (
                  // eslint-disable-next-line @next/next/no-img-element -- pratinjau sederhana, path bebas diketik admin
                  <img src={variantForm.image_url} alt="Pratinjau" className="h-12 w-12 shrink-0 rounded-lg border border-[#908974]/30 object-contain bg-[#f7f4ed]" />
                )}
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deskripsi <span className="font-normal text-gray-400">(opsional — tampil di halaman produk)</span>
              </label>
              <textarea
                rows={3}
                value={variantForm.description}
                onChange={(e) => setVariantForm((v) => ({ ...v, description: e.target.value }))}
                className="w-full px-4 py-3 border border-[#908974]/40 rounded-xl focus:outline-none focus:border-[#1c424f] resize-y"
                placeholder="Contoh: Dinar emas 4,25 gram dengan desain Ka'bah, dilengkapi sertifikat keaslian."
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
                                onClick={() => { setEditingVariantId(v.id); setVariantForm({ product_id: v.product_id, type_name: v.type_name, weight: String(v.weight), purity: v.purity ?? "999.9", image_url: v.image_url ?? "", description: v.description ?? "" }); }}
                                className="px-2.5 py-1 rounded bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Ubah</button>
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
            <button onClick={() => { setDataLoading(true); setReloadKey((k) => k + 1); }}
              className="bg-white border border-[#908974]/40 text-[#1c424f] px-4 py-2 rounded-lg font-semibold hover:bg-[#f7f4ed] transition text-sm">
              Muat ulang
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
                                setPriceForm({ brand_id: price.brand_id, variant_id: price.variant_id, harga_beli: String(price.harga_beli), harga_buyback: String(price.harga_buyback), image_url: price.image_url ?? "", description: price.description ?? "" });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#1c424f] text-white text-xs font-semibold hover:bg-[#15323c] transition">Ubah</button>
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
