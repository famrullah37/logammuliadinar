-- Penyisihan zakat 2.5% dari harga jual setiap penjualan selesai + penandaan yang sudah dikeluarkan (22 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/009_zakat_reserve.sql

CREATE TABLE IF NOT EXISTS zakat_payouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_date  date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
  amount     numeric NOT NULL CHECK (amount > 0),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- kind 'sale' = penyisihan dari penjualan; 'reversal' = koreksi (minus) bila penjualan dibatalkan
-- setelah penyisihannya terlanjur dikeluarkan. payout_id NULL = belum dikeluarkan.
CREATE TABLE IF NOT EXISTS zakat_reserves (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('sale', 'reversal')),
  base_amount  numeric NOT NULL,          -- harga jual barang (nilai nota, tanpa ongkir & kode unik)
  amount       numeric NOT NULL,          -- 2.5% x base_amount (negatif untuk koreksi)
  payout_id    uuid REFERENCES zakat_payouts(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zakat_reserves_order_idx ON zakat_reserves (order_id);
CREATE INDEX IF NOT EXISTS zakat_reserves_unpaid_idx ON zakat_reserves (created_at) WHERE payout_id IS NULL;

-- Penjualan yang sudah selesai sebelum fitur ini: sisihkan juga (status belum dikeluarkan).
INSERT INTO zakat_reserves (order_id, order_number, kind, base_amount, amount, created_at)
SELECT o.id, o.order_number, 'sale', o.total_harga, round(o.total_harga * 0.025), COALESCE(o.completed_at, now())
  FROM orders o
 WHERE o.status = 'completed' AND NOT EXISTS (SELECT 1 FROM zakat_reserves z WHERE z.order_id = o.id);
