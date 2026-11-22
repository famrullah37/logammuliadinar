-- Pengajuan buyback (jual kembali) dari pelanggan (22 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/003_buyback_requests.sql
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
