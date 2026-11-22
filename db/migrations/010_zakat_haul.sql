-- Tabungan zakat vs kewajiban haul (22 Nov 2026).
--   psql "$DATABASE_URL" -f db/migrations/010_zakat_haul.sql

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
