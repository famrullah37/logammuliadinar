-- Modal stok FIFO (lot & alokasi), pembelian dari pusat, waktu update harga (22 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/008_fifo_daily_price.sql

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reason_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reason_check
  CHECK (reason IN ('order', 'order_cancel', 'buyback', 'buyback_cancel', 'adjust', 'set', 'purchase'));

-- Satu lot = satu kali stok masuk dengan harga modal per keping.
CREATE TABLE IF NOT EXISTS stock_lots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id      uuid NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
  source        text NOT NULL CHECK (source IN ('pusat', 'buyback', 'koreksi', 'awal', 'retur')),
  unit_cost     numeric CHECK (unit_cost >= 0),        -- NULL = modal tidak diketahui
  qty_in        integer NOT NULL CHECK (qty_in > 0),
  qty_remaining integer NOT NULL CHECK (qty_remaining >= 0),
  ref           text,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_lots_fifo_idx ON stock_lots (price_id, created_at, id) WHERE qty_remaining > 0;

-- Keping yang diambil dari lot (penjualan, koreksi kurang, buyback batal) beserta modalnya.
CREATE TABLE IF NOT EXISTS stock_allocations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id     uuid REFERENCES stock_lots(id) ON DELETE SET NULL,  -- NULL = tidak ada lot (modal tak diketahui)
  price_id   uuid NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
  ref_type   text NOT NULL CHECK (ref_type IN ('order', 'adjust', 'set', 'buyback_cancel')),
  ref        text,                                              -- no. pesanan / pengajuan
  qty        integer NOT NULL CHECK (qty > 0),
  unit_cost  numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_allocations_ref_idx ON stock_allocations (ref_type, ref);

-- Stok yang sudah dilacak sebelum FIFO aktif: jadikan lot saldo awal (modal = harga buyback saat ini).
INSERT INTO stock_lots (price_id, source, unit_cost, qty_in, qty_remaining, note)
SELECT pr.id, 'awal', pr.harga_buyback, pr.stock, pr.stock, 'Saldo awal saat FIFO diaktifkan (modal = harga buyback)'
  FROM prices pr
 WHERE pr.stock > 0 AND NOT EXISTS (SELECT 1 FROM stock_lots l WHERE l.price_id = pr.id);

-- Waktu harga terakhir diubah (ditampilkan di website).
ALTER TABLE prices ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE OR REPLACE FUNCTION prices_touch_updated_at() RETURNS trigger AS $fn$
BEGIN
  IF NEW.harga_beli IS DISTINCT FROM OLD.harga_beli OR NEW.harga_buyback IS DISTINCT FROM OLD.harga_buyback THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS prices_touch_updated_at ON prices;
CREATE TRIGGER prices_touch_updated_at BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION prices_touch_updated_at();
