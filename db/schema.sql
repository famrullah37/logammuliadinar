-- Skema database Logam Mulia Dinar (PostgreSQL 13+)
-- Dijalankan otomatis oleh container postgres saat volume pertama kali dibuat
-- (lihat docker-compose.yml), atau manual: psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type_name   text NOT NULL,
  weight      numeric NOT NULL CHECK (weight > 0),
  purity      text NOT NULL DEFAULT '999.9',  -- kadar emas, mis. 999.9
  image_url   text,                           -- path di /public (mis. /1-DINAR.png) atau URL https
  description text
);

CREATE TABLE IF NOT EXISTS prices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  variant_id    uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  harga_beli    numeric NOT NULL CHECK (harga_beli >= 0),
  harga_buyback numeric NOT NULL CHECK (harga_buyback >= 0),
  image_url     text,  -- gambar khusus brand ini; NULL -> pakai gambar varian
  description   text,  -- deskripsi khusus brand ini; NULL -> pakai deskripsi varian
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, variant_id)
);

-- Pesanan menyimpan snapshot harga. FK memakai RESTRICT (default) agar
-- brand/varian yang sudah pernah dipesan tidak bisa terhapus diam-diam.
CREATE TABLE IF NOT EXISTS orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         text UNIQUE NOT NULL,
  variant_id           uuid NOT NULL REFERENCES product_variants(id),
  brand_id             uuid NOT NULL REFERENCES brands(id),
  quantity             integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  harga_beli           numeric NOT NULL,
  total_harga          numeric NOT NULL,
  buyer_name           text NOT NULL,
  buyer_phone          text NOT NULL,
  buyer_email          text,
  delivery_method      text NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  delivery_address     text,
  delivery_city        text,
  delivery_postal_code text,
  payment_method       text NOT NULL CHECK (payment_method IN ('transfer', 'cod')),
  notes                text,
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  kode_unik            integer CHECK (kode_unik BETWEEN 500 AND 999),  -- hanya transfer
  total_transfer       numeric,       -- total_harga + kode_unik (yang harus ditransfer)
  invoice_number       text UNIQUE,   -- nota, terbit otomatis saat status completed
  receipt_token        text UNIQUE,   -- token acak untuk link nota /nota/<token>
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS invoice_seq;
-- Dua transfer yang masih menunggu pembayaran tidak boleh punya kode unik sama.
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_kode_unik_uq
  ON orders (kode_unik) WHERE status = 'pending' AND kode_unik IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants (product_id);

-- Pengajuan buyback (jual kembali) dari pelanggan.
CREATE TABLE IF NOT EXISTS buyback_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number    text UNIQUE NOT NULL,              -- BB-YYYYMMDD-XXXX
  variant_id        uuid NOT NULL REFERENCES product_variants(id),
  brand_id          uuid NOT NULL REFERENCES brands(id),
  quantity          integer NOT NULL CHECK (quantity >= 1),
  harga_buyback     numeric NOT NULL,                  -- snapshot harga buyback saat pengajuan
  total_estimasi    numeric NOT NULL,                  -- harga_buyback x quantity (final setelah dicek admin)
  seller_name       text NOT NULL,
  seller_phone      text NOT NULL,
  seller_email      text,
  has_certificate   boolean NOT NULL DEFAULT false,
  has_packaging     boolean NOT NULL DEFAULT false,
  handover_method   text NOT NULL CHECK (handover_method IN ('store', 'shipping')),
  notes             text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  receipt_number    text UNIQUE,                       -- nota buyback, terbit saat status completed
  receipt_token     text UNIQUE,                       -- token acak untuk link nota /nota/<token>
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS buyback_receipt_seq;
CREATE INDEX IF NOT EXISTS buyback_requests_status_created_idx ON buyback_requests (status, created_at DESC);

-- Stok, riwayat stok, kas, nilai final buyback.

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

-- Ongkos kirim (dikonfirmasi admin) + total bayar otomatis.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ongkir numeric CHECK (ongkir >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_bayar numeric
  GENERATED ALWAYS AS (total_harga + COALESCE(ongkir, 0) + COALESCE(kode_unik, 0)) STORED;

-- Modal stok FIFO, pembelian dari pusat, waktu update harga.

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

-- Penyisihan zakat 2.5% dari penjualan.

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

-- Tabungan zakat vs kewajiban haul.

-- Sisa tabungan yang dibawa ke haul berikutnya tidak terkait pesanan.
ALTER TABLE zakat_reserves ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE zakat_reserves ALTER COLUMN order_number DROP NOT NULL;
ALTER TABLE zakat_reserves DROP CONSTRAINT IF EXISTS zakat_reserves_kind_check;
ALTER TABLE zakat_reserves ADD CONSTRAINT zakat_reserves_kind_check CHECK (kind IN ('sale', 'reversal', 'carryover'));

-- kind 'penyisihan' = pengeluaran lebih awal (ta'jil) dari tabungan; 'haul' = pembayaran kewajiban haul.
-- haul_year = tahun hijriah haul (1 Ramadhan) yang dibayar/dicicil.
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'penyisihan';
ALTER TABLE zakat_payouts DROP CONSTRAINT IF EXISTS zakat_payouts_kind_check;
ALTER TABLE zakat_payouts ADD CONSTRAINT zakat_payouts_kind_check CHECK (kind IN ('penyisihan', 'haul'));
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS haul_year integer;
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS harta_bersih numeric;
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS nisab numeric;
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS kewajiban numeric;           -- 2.5% x harta bersih
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS dibayar_sebelumnya numeric;  -- cicilan ta'jil haul ini
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS tabungan numeric;            -- tabungan terkumpul saat haul
ALTER TABLE zakat_payouts ADD COLUMN IF NOT EXISTS sisa_tabungan numeric;       -- kelebihan dibawa ke haul berikutnya
-- Haul yang sudah lunas lewat cicilan ta'jil tetap dicatat (nominal 0).
ALTER TABLE zakat_payouts DROP CONSTRAINT IF EXISTS zakat_payouts_amount_check;
ALTER TABLE zakat_payouts ADD CONSTRAINT zakat_payouts_amount_check CHECK (amount >= 0);
-- Zakat haul hanya sekali per tahun hijriah.
CREATE UNIQUE INDEX IF NOT EXISTS zakat_payouts_haul_uq ON zakat_payouts (haul_year) WHERE kind = 'haul';

-- Transaksi toko (offline), tunai, rekening toko & rekening penjual buyback.
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

-- Role pengguna panel admin (admin / kasir) dan status aktif.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'kasir'));
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name text;
