-- Transaksi langsung di toko (offline), pembayaran tunai, rekening toko,
-- dan rekening penjual buyback (23 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/011_store_bank.sql

-- Asal transaksi: 'online' (website) atau 'store' (diinput admin di toko).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'online'
  CHECK (channel IN ('online', 'store'));
ALTER TABLE buyback_requests ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'online'
  CHECK (channel IN ('online', 'store'));

-- Pembeli di toko bisa bayar tunai.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('transfer', 'cod', 'cash'));

-- Pelanggan yang datang langsung boleh tanpa nomor HP.
ALTER TABLE orders ALTER COLUMN buyer_phone DROP NOT NULL;
ALTER TABLE buyback_requests ALTER COLUMN seller_phone DROP NOT NULL;

-- Pembayaran buyback ke pelanggan: tunai atau transfer ke rekening penjual.
ALTER TABLE buyback_requests ADD COLUMN IF NOT EXISTS payout_method text
  CHECK (payout_method IN ('cash', 'transfer'));
ALTER TABLE buyback_requests ADD COLUMN IF NOT EXISTS seller_bank text;
ALTER TABLE buyback_requests ADD COLUMN IF NOT EXISTS seller_account_number text;
ALTER TABLE buyback_requests ADD COLUMN IF NOT EXISTS seller_account_holder text;

-- Rekening tujuan transfer toko, dikelola admin dan ditampilkan ke pembeli.
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank           text NOT NULL,
  account_number text NOT NULL,
  holder         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bank, account_number)
);
