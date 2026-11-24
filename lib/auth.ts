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

export type Role = "admin" | "kasir";
export const ROLES: Role[] = ["admin", "kasir"];

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

/**
 * Pengguna panel admin yang sedang login, atau null.
 * Selain tanda tangan token, dicek ke database: akun masih ada, aktif, dan password belum diganti.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await queryOne<SessionUser & { password_hash: string; active: boolean }>(
    "SELECT id, email, name, role, active, password_hash FROM admin_users WHERE id = $1",
    [session.userId],
  ).catch(() => null); // id bukan uuid / DB error → anggap tidak terautentikasi
  if (!user || !user.active || passwordVersion(user.password_hash) !== session.pwdVersion) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** id pengguna yang sedang login (role apa pun), atau null. */
export async function getAdminId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}

const UNAUTHENTICATED = () => NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
const FORBIDDEN = () => NextResponse.json({ error: "Anda tidak punya akses untuk fitur ini" }, { status: 403 });

/**
 * Dipakai di awal route handler khusus admin (pemilik): 401 bila belum login, 403 bila role lain.
 * Ini bawaan untuk semua API admin; hanya endpoint yang memang untuk kasir memakai requireStaff.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return UNAUTHENTICATED();
  return user.role === "admin" ? null : FORBIDDEN();
}

/** Endpoint yang boleh dipakai admin maupun kasir (transaksi toko, pesanan, buyback, lihat stok). */
export async function requireStaff(): Promise<NextResponse | null> {
  return (await getSessionUser()) ? null : UNAUTHENTICATED();
}
