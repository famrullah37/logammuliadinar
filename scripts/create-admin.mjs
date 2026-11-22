// Membuat atau mengganti password akun admin (mengganti password otomatis mencabut sesi lama).
// Pemakaian (disarankan — password diketik, tidak tersimpan di riwayat shell / daftar proses):
//   DATABASE_URL=postgresql://... node scripts/create-admin.mjs admin@contoh.com
//   docker compose exec app node scripts/create-admin.mjs admin@contoh.com
// Non-interaktif: ADMIN_PASSWORD="..." node scripts/create-admin.mjs admin@contoh.com
// (Masih didukung, tidak disarankan: password sebagai argumen ke-2.)
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";
import pg from "pg";

/** Baca password dari terminal tanpa menampilkannya. */
function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.output.write("\n"); rl.close(); resolve(answer); });
  });
}

const [email, argPassword] = process.argv.slice(2);
if (!email) {
  console.error("Pemakaian: node scripts/create-admin.mjs <email>   (password akan ditanyakan)");
  process.exit(1);
}
if (argPassword) console.warn("Peringatan: password sebagai argumen tersimpan di riwayat shell. Lebih aman tanpa argumen ini.");
let password = argPassword || process.env.ADMIN_PASSWORD;
if (!password) {
  if (!process.stdin.isTTY) {
    console.error("Tidak ada terminal: isi ADMIN_PASSWORD atau jalankan dengan `docker compose exec` (tanpa -T).");
    process.exit(1);
  }
  password = await promptHidden("Password baru: ");
  const again = await promptHidden("Ulangi password: ");
  if (password !== again) {
    console.error("Password tidak sama");
    process.exit(1);
  }
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
