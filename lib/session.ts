// Token sesi admin: "<userId>.<expiresAtMs>.<hmac>" ditandatangani HMAC-SHA256.
// File ini tidak bergantung pada next/headers agar bisa dipakai di proxy.ts.
import { createHmac, timingSafeEqual } from "node:crypto";

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

export function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Mengembalikan userId bila token valid & belum kedaluwarsa, selain itu null. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;

  let expected: string;
  try {
    expected = sign(`${userId}.${expiresAt}`);
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return null;
  return userId;
}
