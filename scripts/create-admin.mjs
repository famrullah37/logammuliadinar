// Membuat atau mengganti password akun admin.
// Pemakaian:
//   DATABASE_URL=postgresql://... node scripts/create-admin.mjs admin@contoh.com "password-kuat"
// Di Docker:
//   docker compose exec app node scripts/create-admin.mjs admin@contoh.com "password-kuat"
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Pemakaian: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password minimal 8 karakter");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}

// Format harus sama dengan hashPassword() di lib/auth.ts
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
const passwordHash = `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email.trim().toLowerCase(), passwordHash],
  );
  console.log(`Admin ${email} siap dipakai.`);
} finally {
  await client.end();
}
