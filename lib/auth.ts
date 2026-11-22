import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { passwordVersion, SESSION_COOKIE, verifySessionToken } from "./session";
import { queryOne } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LEN = 64;

// Format: scrypt$<salt hex>$<hash hex>. Harus sama dengan scripts/create-admin.mjs.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/**
 * userId admin yang sedang login, atau null.
 * Selain tanda tangan token, dicek ke database: akun masih ada dan password belum diganti.
 */
export async function getAdminId(): Promise<string | null> {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await queryOne<{ password_hash: string }>(
    "SELECT password_hash FROM admin_users WHERE id = $1",
    [session.userId],
  ).catch(() => null); // id bukan uuid / DB error → anggap tidak terautentikasi
  if (!user || passwordVersion(user.password_hash) !== session.pwdVersion) return null;
  return session.userId;
}

/** Dipakai di awal route handler admin: kembalikan response 401 bila belum login. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const id = await getAdminId();
  return id ? null : NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
}
