-- Role pengguna panel admin: 'admin' (semua akses) dan 'kasir' (transaksi toko,
-- pesanan, buyback, lihat stok). Akun bisa dinonaktifkan tanpa dihapus (25 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/012_roles.sql

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'kasir'));
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name text;
