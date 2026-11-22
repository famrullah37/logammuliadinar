// Token sesi admin: "<userId>.<pwdVersion>.<expiresAtMs>.<hmac>" ditandatangani HMAC-SHA256.
// pwdVersion = sidik hash password; ganti password (atau hapus akun) → semua sesi lama tidak berlaku
// (dicek di requireAdmin terhadap database). File ini tidak bergantung pada next/headers agar
// bisa dipakai di proxy.ts (proxy hanya memeriksa tanda tangan & masa berlaku).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "lmd_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 hari

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum di-set atau kurang dari 32 karakter");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Sidik pendek dari hash password (bukan password-nya) untuk mengikat sesi ke password saat ini. */
export const passwordVersion = (passwordHash: string) =>
  createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);

export function createSessionToken(userId: string, passwordHash: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${passwordVersion(passwordHash)}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Mengembalikan { userId, pwdVersion } bila tanda tangan valid & belum kedaluwarsa, selain itu null. */
export function verifySessionToken(token: string | undefined | null): { userId: string; pwdVersion: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, pwdVersion, expiresAt, signature] = parts;

  let expected: string;
  try {
    expected = sign(`${userId}.${pwdVersion}.${expiresAt}`);
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return null;
  return { userId, pwdVersion };
}
