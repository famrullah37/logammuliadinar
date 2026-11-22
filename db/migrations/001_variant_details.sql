-- Detail produk per varian (22 Nov 2026).
-- Untuk database yang dibuat sebelum kolom ini ada di db/schema.sql:
--   psql "$DATABASE_URL" -f db/migrations/001_variant_details.sql
-- Di Docker:
--   docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < db/migrations/001_variant_details.sql
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS purity text NOT NULL DEFAULT '999.9';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS description text;
