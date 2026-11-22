-- Nota pesanan otomatis saat status 'completed' (22 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/004_order_receipts.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_token text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
CREATE SEQUENCE IF NOT EXISTS invoice_seq;
