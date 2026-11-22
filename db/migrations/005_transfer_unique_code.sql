-- Kode unik 3 digit (500-999) untuk pembayaran transfer (22 Nov 2026).
-- total_transfer = total_harga + kode_unik; NULL untuk COD.
--   psql "$DATABASE_URL" -f db/migrations/005_transfer_unique_code.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kode_unik integer CHECK (kode_unik BETWEEN 500 AND 999);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_transfer numeric;
-- Dua transfer yang masih menunggu pembayaran tidak boleh punya kode sama.
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_kode_unik_uq
  ON orders (kode_unik) WHERE status = 'pending' AND kode_unik IS NOT NULL;
