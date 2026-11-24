// Token sesi admin: "<userId>.<pwdVersion>.<expiresAtMs>.<hmac>" ditandatangani HMAC-SHA256.
// pwdVersion = sidik hash password; ganti password (atau hapus akun) → semua sesi lama tidak berlaku
// (dicek di requireAdmin terhadap database). File ini tidak bergantung pada next/headers agar
// bisa dipakai di proxy.ts (proxy hanya memeriksa tanda tangan & masa berlaku).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "lmd_admin_session";
/**
 * Sesi berakhir setelah 15 menit tanpa aktivitas. Setiap permintaan ke halaman/API admin
 * memperpanjangnya (proxy.ts), dan klien mengirim "detak" saat pengguna aktif (IdleLogout).
 */
export const SESSION_IDLE_SECONDS = 15 * 60;
export const SESSION_MAX_AGE_SECONDS = SESSION_IDLE_SECONDS;

/** Opsi cookie sesi; cookie ikut kedaluwarsa bersama token. */
export const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
});

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

function issueToken(userId: string, pwdVersion: string): string {
  const expiresAt = Date.now() + SESSION_IDLE_SECONDS * 1000;
  const payload = `${userId}.${pwdVersion}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function createSessionToken(userId: string, passwordHash: string): string {
  return issueToken(userId, passwordVersion(passwordHash));
}

/** Perpanjang sesi yang masih sah (aktivitas pengguna). Hak akses tetap dicek ke DB di setiap API. */
export function renewSessionToken(session: { userId: string; pwdVersion: string }): string {
  return issueToken(session.userId, session.pwdVersion);
}

export interface SessionInfo {
  userId: string;
  pwdVersion: string;
  expiresAt: number;
}

/** Mengembalikan data sesi bila tanda tangan valid & belum kedaluwarsa, selain itu null. */
export function verifySessionToken(token: string | undefined | null): SessionInfo | null {
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
  return { userId, pwdVersion, expiresAt: Number(expiresAt) };
}
