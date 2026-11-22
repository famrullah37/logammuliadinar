-- Ongkos kirim dikonfirmasi admin + total bayar otomatis (22 Nov 2026).
-- ongkir NULL = belum dikonfirmasi (pesanan 'delivery'); pickup tetap NULL.
--   psql "$DATABASE_URL" -f db/migrations/007_ongkir.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ongkir numeric CHECK (ongkir >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_bayar numeric
  GENERATED ALWAYS AS (total_harga + COALESCE(ongkir, 0) + COALESCE(kode_unik, 0)) STORED;
