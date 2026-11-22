-- Stok per brand x pecahan, riwayat stok, kas, dan nilai final buyback (22 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/006_stock_cash.sql

-- NULL = stok tidak dilacak (tidak dibatasi). Angka = stok tersedia.
ALTER TABLE prices ADD COLUMN IF NOT EXISTS stock integer CHECK (stock >= 0);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id    uuid NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
  change      integer NOT NULL,          -- + masuk, - keluar
  stock_after integer NOT NULL,
  reason      text NOT NULL CHECK (reason IN ('order', 'order_cancel', 'buyback', 'buyback_cancel', 'adjust', 'set')),
  ref         text,                      -- no. pesanan / no. pengajuan buyback
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_price_idx ON stock_movements (price_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cash_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date  date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
  direction   text NOT NULL CHECK (direction IN ('in', 'out')),
  amount      numeric NOT NULL CHECK (amount > 0),
  category    text NOT NULL,             -- penjualan, buyback, koreksi, modal, operasional, ...
  description text,
  ref         text,                      -- no. pesanan / pengajuan untuk entri otomatis
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_entries_date_idx ON cash_entries (entry_date, created_at);

-- Nilai final buyback setelah barang dicek (NULL = pakai estimasi).
ALTER TABLE buyback_requests ADD COLUMN IF NOT EXISTS total_final numeric;
