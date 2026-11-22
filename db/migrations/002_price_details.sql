-- Gambar & deskripsi khusus per brand x pecahan (22 Nov 2026).
-- Kosong (NULL) -> halaman memakai gambar/deskripsi varian.
--   psql "$DATABASE_URL" -f db/migrations/002_price_details.sql
ALTER TABLE prices ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS description text;
