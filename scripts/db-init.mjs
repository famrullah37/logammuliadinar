// Membuat / memperbarui seluruh tabel aplikasi dari db/schema.sql di database DATABASE_URL.
// Aman dijalankan berulang (semua perintah memakai IF NOT EXISTS / pengecekan), jadi juga dipakai
// setelah update aplikasi untuk menerapkan perubahan skema.
// Pemakaian:
//   docker compose exec app node scripts/db-init.mjs
//   DATABASE_URL=postgresql://... node scripts/db-init.mjs      (di luar Docker)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "schema.sql");
const sql = readFileSync(schemaPath, "utf8");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("SELECT current_database() AS db, current_user AS usr, version() AS v");
  console.log(`Database: ${rows[0].db} (user ${rows[0].usr})`);
  console.log(rows[0].v.split(",")[0]);
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  const t = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  console.log(`Skema siap: ${t.rows[0].n} tabel.`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Gagal menerapkan skema:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
