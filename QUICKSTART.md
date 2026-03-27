# Quick Start - Logam Mulia Dinar

## Setup Project

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Supabase Database

Ikuti panduan di `SETUP_GUIDE.md` untuk membuat tabel `products` di Supabase.

### 3. Run Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di: http://localhost:3000

## URLs

- **Landing Page**: http://localhost:3000
- **Login Page**: http://localhost:3000/login
- **Dashboard (Admin)**: http://localhost:3000/dashboard

## Test Credentials

Untuk testing, daftarkan akun baru:

1. Buka http://localhost:3000/login
2. Klik "Daftar"
3. Isi email dan password
4. Verifikasi email (atau skip untuk development)
5. Masuk dengan akun yang sudah dibuat

## Default Demo Data (Optional)

Untuk menambah data demo, buka http://localhost:3000/dashboard dan tambah beberapa produk:

**Contoh Produk:**

1. Dinar Murni 1 Gram - Rp850.000 (konsumen), Rp820.000 (buyback)
2. Dinar Murni 2.5 Gram - Rp2.125.000 (konsumen), Rp2.050.000 (buyback)
3. Dinar Murni 5 Gram - Rp4.250.000 (konsumen), Rp4.100.000 (buyback)

## Fitur yang Tersedia

### Landing Page

- Navbar dengan logo dan menu
- Hero section yang menarik
- Tabel produk dari Supabase
- Section "Kenapa Memilih Kami"
- Footer dengan contact info
- WhatsApp integration untuk pembelian

### Authentication

- Sign up dengan email & password
- Sign in dengan email & password
- Session management
- Logout

### Admin Dashboard - CRUD Produk

- **Read**: Lihat semua produk
- **Create**: Tambah produk baru
- **Update**: Edit detail produk
- **Delete**: Hapus produk

## Customization

### Warna Theme

Edit file component untuk mengubah warna:

- **Kuning**: `from-yellow-400 to-yellow-500`
- **Hijau**: `from-green-500 to-green-600`
- **Biru**: `from-blue-400 to-blue-500`
- **Putih**: `bg-white`

### WhatsApp Number

Edit di `components/ProductTable.tsx`:

```jsx
href = "https://wa.me/62XXXXXXXXXX";
```

Ganti `62XXXXXXXXXX` dengan nomor WhatsApp Anda (format: country code + number, tanpa +)

### Logo & Branding

Edit di `components/Navbar.tsx` dan `components/Footer.tsx`

## Build untuk Production

```bash
npm run build
npm start
```

## Troubleshooting

**Q: Products tidak muncul di landing page?**
A: Pastikan:

1. Tabel `products` sudah dibuat di Supabase
2. Ada data di tabel tersebut
3. Check browser console untuk error

**Q: Login redirect ke login page?**
A: Cek apakah email address sudah verified di Supabase authentication

**Q: Error "Table products not found"?**
A: Ikuti `SETUP_GUIDE.md` untuk membuat tabel di Supabase

## File Structure

```
logammuliadinar/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles
│   ├── login/page.tsx          # Login page
│   └── dashboard/page.tsx      # Admin dashboard
├── components/
│   ├── Navbar.tsx
│   ├── Header.tsx
│   ├── ProductTable.tsx        # Landing page products
│   ├── ProductForm.tsx         # Add/Edit form
│   ├── ProductList.tsx         # Dashboard products
│   ├── WhySection.tsx
│   └── Footer.tsx
├── lib/
│   ├── supabase.ts             # Supabase client
│   └── types.ts                # TypeScript types
├── public/                      # Static files
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.mjs          # Tailwind config
├── postcss.config.mjs           # PostCSS config
├── SETUP_GUIDE.md              # Detailed setup guide
└── .env                        # Environment variables
```

## Support

Jika ada pertanyaan atau error, check:

1. `SETUP_GUIDE.md` - Panduan setup lengkap
2. Browser console - Untuk error details
3. Supabase dashboard → Logs - Untuk backend errors

---

Happy coding! 🚀
