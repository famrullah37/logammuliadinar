# Setup Supabase untuk Logam Mulia Dinar

## Langkah-langkah Setup

### 1. Buat Tabel Dinar Products di Supabase

1. Login ke [Supabase Dashboard](https://supabase.com)
2. Pilih project Anda (logammuliadinar)
3. Buka menu **SQL Editor** atau **Table Editor**
4. Buat tabel dengan query SQL berikut:

```sql
-- Buat tabel dinar_products
CREATE TABLE dinar_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jenisDinar TEXT NOT NULL,
  harga_konsumen BIGINT NOT NULL,
  harga_buyback BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buat index untuk performa
CREATE INDEX idx_dinar_products_created_at ON dinar_products(created_at DESC);

-- Aktifkan RLS (Row Level Security)
ALTER TABLE dinar_products ENABLE ROW LEVEL SECURITY;

-- Policy untuk READ (publik bisa lihat)
CREATE POLICY "Enable read access for all users" ON dinar_products
  FOR SELECT USING (true);

-- Policy untuk WRITE (hanya authenticated user)
CREATE POLICY "Enable write for authenticated users" ON dinar_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON dinar_products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON dinar_products
  FOR DELETE USING (auth.role() = 'authenticated');
```

Atau gunakan UI Supabase:

1. Klik **Create a new table**
2. Nama tabel: `dinar_products`
3. Tambahkan columns:
   - `id` (UUID, Primary Key, Default: gen_random_uuid())
   - `jenisDinar` (text, required)
   - `harga_konsumen` (int8/bigint, required)
   - `harga_buyback` (int8/bigint, required)
   - `created_at` (timestamp, default: now())
   - `updated_at` (timestamp, default: now())

### 2. Setup Authentication di Supabase

1. Buka menu **Authentication** → **Providers**
2. Enable provider yang ingin digunakan:
   - Email/Password (default: sudah enabled)
   - Google (optional)
   - GitHub (optional)

### 3. Konfigurasi .env

File `.env` sudah ada dengan konfigurasi:

```
NEXT_PUBLIC_SUPABASE_URL=https://ftyujqzlftihllqgssbp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Pastikan tidak menambahkan file `.env` ke git!

## Testing

### Test Landing Page

```bash
npm run dev
# Buka http://localhost:3000
```

### Test Login Page

```bash
# Goto http://localhost:3000/login
# Sign up dengan email dan password apapun
# Atau gunakan credential yang sudah terdaftar
```

### Test Dashboard & CRUD

```bash
# Setelah login, akan redirect ke http://localhost:3000/dashboard
# Tambah, edit, dan hapus produk
```

## Feature Yang Sudah Dibuat

✅ Landing Page dengan:

- Navbar responsive
- Header section
- Product table (fetch dari Supabase)
- Why section (kenapa pilih kami)
- Footer

✅ Login Page dengan:

- Email & password field
- Sign up & sign in
- Form validation
- Error handling

✅ Dashboard CRUD:

- List semua produk
- Tambah produk baru
- Edit produk
- Hapus produk
- Logout

✅ Desain:

- Tema warna: Putih, Kuning (#FFD700 / #FCD34D), Hijau (#10B981), Biru (#3B82F6)
- Responsive (mobile, tablet, desktop)
- Smooth transitions & animations

## Struktur File

```
app/
├── layout.tsx           # Root layout
├── page.tsx             # Landing page
├── globals.css          # Styling global
├── login/
│   └── page.tsx         # Login page
└── dashboard/
    └── page.tsx         # Admin dashboard

components/
├── Navbar.tsx           # Navigation bar
├── Header.tsx           # Hero section
├── ProductTable.tsx     # Product table untuk landing page
├── ProductForm.tsx      # Form add/edit produk
├── ProductList.tsx      # Product list untuk dashboard
├── WhySection.tsx       # Why section
└── Footer.tsx           # Footer

lib/
├── supabase.ts          # Supabase client
└── types.ts             # TypeScript types
```

## Troubleshooting

### Products tidak muncul di landing page

**Penyebab & Solusi:**

1. **Tabel tidak ada di Supabase**
   - Login ke Supabase Dashboard
   - Buka SQL Editor
   - Jalankan SQL script di bagian "Buat Tabel Products"
   - Tunggu sampai selesai

2. **URL atau API Key salah**
   - Verifikasi `.env` file
   - Buka Supabase Settings → API
   - Copy `Project URL` dan `anon` key
   - Pastikan sesuai di `.env`

3. **CORS atau Network Error**
   - Check browser console (F12 → Console)
   - Cari error messages
   - Pastikan internet connection stabil
   - Clear browser cache dan reload

### Login tidak bekerja

**Penyebab & Solusi:**

1. **Authentication belum enabled**
   - Login ke Supabase Dashboard
   - Buka Authentication → Settings
   - Pastikan Email/Password provider enabled

2. **User belum terdaftar**
   - Coba sign up dulu di http://localhost:3000/login
   - Atau buat user manual di Supabase dashboard

3. **Session expired**
   - Clear browser cookies
   - Atau clear localStorage
   - Refresh page dan login ulang

### RLS Error saat CRUD

**Penyebab & Solusi:**

1. **RLS Policies tidak benar**
   - Buka Supabase Dashboard
   - Buka Table Editor → products
   - Klik "RLS" untuk lihat policies
   - Pastikan policies sudah sesuai script di atas

2. **User tidak authenticated**
   - Pastikan sudah login dulu
   - Check Session di dashboard
   - Coba logout lalu login ulang

### WhatsApp button error

**Solusi:**

Edit `href` di `components/ProductTable.tsx`:

```jsx
// BEFORE
href = "https://wa.me";

// AFTER - Ganti dengan nomor WhatsApp Anda
href = "https://wa.me/6281234567890";
```

Format: `https://wa.me/62XXXXXXXXXX`

- 62 = country code Indonesia
- XXXXXXXXXX = nomor WhatsApp (tanpa 0 di depan)

---

## Customization

### Ubah WhatsApp Number

Edit di `components/ProductTable.tsx` (baris ~84):

```jsx
<a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
  // Ganti 6281234567890 dengan nomor Anda
</a>
```

### Ubah Warna Theme

Tema sudah menggunakan Tailwind CSS. Edit class names di components:

- **Kuning**: `yellow-400`, `yellow-500` → ubah ke `amber-400`, dll
- **Hijau**: `green-500`, `green-600` → ubah ke `emerald-500`, dll
- **Biru**: `blue-400`, `blue-500`

Contoh di `components/Header.tsx`:

```jsx
// FROM
<span className="bg-gradient-to-r from-yellow-400 to-yellow-600">

// TO (Ganti warna)
<span className="bg-gradient-to-r from-amber-400 to-amber-600">
```

### Tambah Field Produk di Tabel

Jika ingin tambah field baru (misal: berat):

1. **Update Supabase Table**
   - SQL Editor: `ALTER TABLE products ADD COLUMN berat TEXT;`

2. **Update `lib/types.ts`**

   ```ts
   export interface Product {
     id: string;
     jenisDinar: string;
     hargaKonsumen: number;
     hargaBuyback: number;
     berat?: string; // <-- NEW
     created_at?: string;
     updated_at?: string;
   }
   ```

3. **Update `components/ProductForm.tsx`**
   - Tambah input field untuk `berat`
   - Tambah ke state dan handleSubmit

4. **Update `components/ProductTable.tsx`**
   - Tambah column di table header
   - Tambah data di table body

5. **Update `components/ProductList.tsx`**
   - Sama seperti ProductTable

---

## Deploy

Untuk production:

```bash
# 1. Build
npm run build

# 2. Deploy ke Vercel (recommended)
npm install -g vercel
vercel

# 3. Atau deploy manual ke server lain
# - Docker: gunakanext/with-docker
# - Traditional server: npm start
```

### Environment Variables untuk Production

1. Buka Supabase Settings → API
2. Copy Production URL dan Key
3. Set environment variable:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```

---

## ✅ FINAL CHECKLIST

Sebelum launch ke production:

- [ ] Setup Supabase table `products`
- [ ] Test landing page (semua komponen tampil)
- [ ] Test login/signup
- [ ] Test CRUD di dashboard
- [ ] Test WhatsApp button
- [ ] Test responsive design di mobile
- [ ] Setup WhatsApp number
- [ ] Update branding (logo, nama, warna jika perlu)
- [ ] Security: pastikan `.env` tidak di-commit ke git
- [ ] Test di 2-3 browser berbeda
- [ ] Performance: check loading time

---

## 📞 QUICK HELP

**ERROR: "Cannot read property 'supabase'"**
→ Restart dev server: `Ctrl+C` lalu `npm run dev`

**ERROR: "Table 'dinar_products' does not exist'"**
→ Buat tabel menggunakan SQL Editor di Supabase

**ERROR: "Invalid login credentials'"**
→ Pastikan email sudah verified atau clear cookies

**Landing page blank/error**
→ Check browser console (F12) untuk error messages

**Warna tidak berubah**
→ Tailwind needs rebuild. Restart dev server
