# 🗄️ PANDUAN SETUP SUPABASE LENGKAP

## STEP 1: Login ke Supabase Dashboard

1. Buka https://supabase.com
2. Klik **"Sign In"**
3. Login dengan akun Google atau email
4. Pilih project Anda: **logammuliadinar**

**Screenshot Guide:**

```
Supabase Home
    ↓
[Sign In] button (top right)
    ↓
Select Project atau [+ New Project]
    ↓
Project: logammuliadinar
```

---

## STEP 2: Membuat Tabel Products

### Opsi A: Menggunakan UI Table Editor (Recommended untuk pemula)

1. Di Supabase Dashboard, buka **"Database"** dari sidebar kiri
2. Klik **"Tables"**
3. Klik **"+ Create a new table"**
4. Isi form:
   - **Table Name**: `dinar_products`
   - **Enable RLS**: Centang ✓
   - Klik **"Create table"**

5. Sekarang tambah columns:

#### Tambah Column 1: `jenisDinar`

- Klik **"+ Add column"**
- Name: `jenisDinar`
- Type: `text`
- Constraints:
  - ☑️ NOT NULL
  - Leave others unchecked
- Klik **"Save"**

#### Tambah Column 2: `harga_konsumen`

- Klik **"+ Add column"**
- Name: `harga_konsumen`
- Type: `int8` (atau `bigint`)
- Constraints:
  - ☑️ NOT NULL
- Klik **"Save"**

#### Tambah Column 3: `harga_buyback`

- Klik **"+ Add column"**
- Name: `harga_buyback`
- Type: `int8` (atau `bigint`)
- Constraints:
  - ☑️ NOT NULL
- Klik **"Save"**

#### Tambah Column 4: `created_at`

- Klik **"+ Add column"**
- Name: `created_at`
- Type: `timestamp with time zone`
- Default value: `now()`
- Klik **"Save"**

#### Tambah Column 5: `updated_at`

- Klik **"+ Add column"**
- Name: `updated_at`
- Type: `timestamp with time zone`
- Default value: `now()`
- Klik **"Save"**

**Hasil Akhir:**

```
Column Name      | Type              | Constraints
-----------------|-------------------|-----------
id               | uuid              | PRIMARY KEY (auto)
jenisDinar       | text              | NOT NULL
harga_konsumen   | int8              | NOT NULL
harga_buyback    | int8              | NOT NULL
created_at       | timestamp tz      | DEFAULT now()
updated_at       | timestamp tz      | DEFAULT now()
```

---

### Opsi B: Menggunakan SQL Editor (Lebih cepat)

1. Di Supabase Dashboard, buka **"SQL Editor"** dari sidebar
2. Klik **"+ New Query"**
3. Salin & Paste SQL dibawah ini:

```sql
-- Drop existing table if exists (OPSIONAL - hanya jika sudah ada)
-- DROP TABLE IF EXISTS dinar_products CASCADE;

-- Create dinar_products table
CREATE TABLE dinar_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jenisDinar TEXT NOT NULL,
  harga_konsumen BIGINT NOT NULL,
  harga_buyback BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_dinar_products_created_at ON dinar_products(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE dinar_products ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Policy 1: Allow anyone to read (SELECT)
CREATE POLICY "Enable read access for all users" ON dinar_products
  FOR SELECT
  USING (true);

-- Policy 2: Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users" ON dinar_products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users to update
CREATE POLICY "Enable update for authenticated users" ON dinar_products
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to delete
CREATE POLICY "Enable delete for authenticated users" ON dinar_products
  FOR DELETE
  USING (auth.role() = 'authenticated');
```

4. Klik **"Run"** button (atau Ctrl+Enter)
5. Tunggu sampai proses selesai (hijau = success, merah = error)

---

## STEP 3: Setup Authentication

1. Buka **"Authentication"** dari sidebar
2. Klik **"Providers"**
3. Pastikan **"Email"** sudah enabled (biasanya enabled by default)
4. Klik toggle untuk enable atau setting lebih lanjut

**Pengaturan yang direkomendasikan:**

- ✅ Enable Email/Password
- ✅ Auto Confirm Users (untuk development/testing)
- ✅ Disable Email Verification (opsional, untuk development)

---

## STEP 4: Verifikasi .env File

File `.env` Anda sudah ada di project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://ftyujqzlftihllqgssbp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Untuk memverifikasi:** Sebagai backup atau jika berbeda:

1. Buka Supabase Dashboard
2. Klik **"Settings"** (icon gear) → **"API"**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** (Under "Project API keys") → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Paste ke `.env` file di project folder

**⚠️ PENTING:**

- Jangan share `.env` file
- Sudah di `.gitignore`, jadi aman
- Jangan commit `.env` ke git

---

## STEP 5: Test Koneksi

### 1. Pastikan dependencies sudah terinstall

```bash
npm install
```

### 2. Jalankan development server

```bash
npm run dev
```

Output seharusnya:

```
  ▲ Next.js 16.2.1
  ✓ Ready in 2.5s
  ➜  Local:        http://localhost:3000
  ➜  Network:      use --host to expose
```

### 3. Test Landing Page

- Buka http://localhost:3000
- Scroll ke bawah ke section "Produk"
- Jika tabel kosong = normal (belum ada data)
- Jika ada error = check browser console (F12)

**Error yang mungkin:**

```
Error: "Gagal memuat produk"
Solution: Tabel products belum dibuat atau credentials salah
```

### 4. Add Sample Data via Dashboard

1. Buka http://localhost:3000/login
2. Daftar akun baru (email & password apapun)
3. Redirect ke http://localhost:3000/dashboard
4. Klik tab **"Tambah Produk Baru"**
5. Isi form:
   - **Jenis Dinar**: "Dinar Murni 1 Gram"
   - **Harga Konsumen**: "850000"
   - **Harga Buyback**: "820000"
   - Klik **"Tambah Produk"**
6. Success! Data muncul di landing page

### 5. Test Landing Page Again

- Buka http://localhost:3000
- Scroll ke produk section
- Data seharusnya sudah muncul di tabel

---

## STEP 6: Verifikasi RLS Policies (Optional)

Untuk memastikan security setup benar:

1. Di Supabase, buka **"Database"** → **"Tables"** → **"dinar_products"\*\***
2. Klik **"RLS"** tab
3. Seharusnya ada 4 policies:
   - ✅ Enable read access for all users
   - ✅ Enable insert for authenticated users
   - ✅ Enable update for authenticated users
   - ✅ Enable delete for authenticated users

Jika kosong = jalankan SQL script dari Opsi B di STEP 2

---

## 🧪 TEST CHECKLIST

Setelah setup, pastikan semua ini berfungsi:

### Landing Page

- [ ] Navbar muncul dengan logo dan menu
- [ ] Header/hero section muncul
- [ ] Product table muncul (bisa kosong jika belum ada data)
- [ ] Why section muncul
- [ ] Footer muncul

### Login Page

- [ ] Bisa akses http://localhost:3000/login
- [ ] Form email & password muncul
- [ ] Bisa click "Daftar" untuk sign up
- [ ] Bisa sign up dengan email & password
- [ ] Bisa masuk dengan akun yang dibuat

### Dashboard

- [ ] Auto redirect ke /dashboard setelah login
- [ ] User name muncul di header
- [ ] Ada 2 tabs: "Daftar Produk" dan "Tambah Produk Baru"
- [ ] Bisa tambah produk baru
- [ ] Produk muncul di tabel landing page
- [ ] Bisa edit produk (klik di tabel)
- [ ] Bisa delete produk
- [ ] Bisa logout

### WhatsApp Button

- [ ] Button "Chat via WhatsApp" muncul di tabel produk
- [ ] Klik button → redirect ke WhatsApp (atau link wa.me)
- [ ] Link format: https://wa.me/62XXXXXXXXXX

---

## ❌ COMMON ERRORS & SOLUTIONS

### Error 1: "Cannot read property 'supabase'"

```
Cause: Module tidak terload dengan benar
Solution:
1. Ctrl+C di terminal (stop dev server)
2. npm run dev (restart)
3. Tunggu sampai "Ready in X.Xs"
```

### Error 2: "Table 'dinar_products' does not exist"

```
Cause: Tabel belum dibuat di Supabase
Solution:
1. Buka Supabase Dashboard
2. SQL Editor → Run script STEP 2 Opsi B
3. Atau gunakan UI Table Editor (STEP 2 Opsi A)
4. Restart dev server
```

### Error 3: "Invalid login credentials"

```
Cause: Email belum verified atau password salah
Solution:
1. Di Supabase Settings → Authentication → Disable "Confirm Email Required"
2. Atau cek email untuk verification link
3. Atau buat user baru
```

### Error 4: "CORS Error" atau "Failed to fetch"

```
Cause: Network atau Supabase URL salah
Solution:
1. Check .env file - pastikan credentials benar
2. Check internet connection
3. Clear browser cache (Ctrl+Shift+Delete)
4. Refresh page
5. Check browser console (F12) untuk detail error
```

### Error 5: "RLS violation"

```
Cause: Permission denied karena RLS policy
Solution:
1. Buka Supabase → Authentication → Users
2. Pastikan user sudah terdaftar
3. Setup RLS policies (STEP 2 Opsi B SQL script)
4. Logout & login ulang
```

---

## 📞 QUICK DEBUG CHECKLIST

Jika sesuatu tidak berfungsi, check:

- [ ] `.env` file ada di project root
- [ ] `.env` memiliki SUPABASE_URL dan ANON_KEY
- [ ] Credentials sesuai dengan Supabase Settings → API
- [ ] Tabel `products` sudah dibuat
- [ ] RLS Policies sudah setup
- [ ] Dev server running (`npm run dev`)
- [ ] Bukan error di browser (check F12 Console)
- [ ] Internet connection stabil
- [ ] Tidak ada firewall yang block Supabase

---

## 🎓 NEXT STEPS

Setelah semua running:

1. **Customize**
   - Ubah WhatsApp number di ProductTable.tsx
   - Update branding/colors sesuai keinginan

2. **Add More Features** (dari backlog)
   - Product search/filter
   - Product categories
   - Product images
   - Email notifications
   - Dashboard analytics

3. **Prepare Deployment**
   - Test build: `npm run build`
   - Setup Vercel account
   - Connect GitHub repo
   - Deploy dengan `vercel`

---

**Version**: 1.0
**Last Updated**: March 27, 2026
**Status**: ✅ Ready to implement
