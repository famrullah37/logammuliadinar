import "server-only";
import Redis from "ioredis";
import { NextRequest, NextResponse } from "next/server";

/** Batas per IP. windowSec = panjang jendela dalam detik. */
export const RATE_LIMITS = {
  order: { limit: 5, windowSec: 60 * 60, message: "Terlalu banyak pesanan dari perangkat ini. Coba lagi nanti." },
  lookup: { limit: 20, windowSec: 15 * 60, message: "Terlalu banyak percobaan cek pesanan. Coba lagi beberapa menit lagi." },
  login: { limit: 10, windowSec: 15 * 60, message: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi." },
  loginEmail: { limit: 20, windowSec: 60 * 60, message: "Terlalu banyak percobaan login untuk akun ini. Coba lagi nanti." },
  buyback: { limit: 5, windowSec: 60 * 60, message: "Terlalu banyak pengajuan buyback dari perangkat ini. Coba lagi nanti." },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

interface Result {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

// ── Redis ─────────────────────────────────────────────────────────
// Fixed window: INCR, set EXPIRE saat hit pertama. Atomik lewat Lua.
const INCR_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local t = redis.call('TTL', KEYS[1])
if t < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]); t = tonumber(ARGV[1]) end
return {c, t}
`;

const globalForRedis = globalThis as unknown as { rlRedis?: Redis | null };

function getRedis(): Redis | null {
  if (globalForRedis.rlRedis !== undefined) return globalForRedis.rlRedis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.rlRedis = null;
    return null;
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    commandTimeout: 500, // jangan sampai Redis lambat menahan checkout
    lazyConnect: false,
  });
  client.on("error", (err: NodeJS.ErrnoException) =>
    console.error("[rate-limit] redis:", err.message || err.code || String(err)),
  );
  globalForRedis.rlRedis = client;
  return client;
}

// ── Fallback in-memory (dev tanpa REDIS_URL; hanya untuk satu proses) ──
const memory = new Map<string, { count: number; resetAt: number }>();

function hitMemory(key: string, windowSec: number): [number, number] {
  const now = Date.now();
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowSec * 1000 };
    memory.set(key, entry);
  }
  entry.count++;
  return [entry.count, Math.ceil((entry.resetAt - now) / 1000)];
}

export async function hit(name: RateLimitName, identifier: string): Promise<Result> {
  const { limit, windowSec } = RATE_LIMITS[name];
  // Awalan lmd: — Redis di VPS dipakai bersama aplikasi lain.
  const key = `lmd:rl:${name}:${identifier}`;
  let count: number;
  let ttl: number;

  const redis = getRedis();
  if (redis) {
    try {
      const res = (await redis.eval(INCR_SCRIPT, 1, key, windowSec)) as [number, number];
      [count, ttl] = res;
    } catch (err) {
      // Fail-open: Redis bermasalah tidak boleh menghentikan penjualan.
      console.error(`[rate-limit] gagal cek ${name}, request diloloskan:`, (err as Error).message);
      return { allowed: true, remaining: limit, retryAfterSec: 0 };
    }
  } else {
    [count, ttl] = hitMemory(key, windowSec);
  }

  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec: ttl };
}

/**
 * IP klien. Di produksi request lewat Traefik, yang membuang X-Forwarded-For
 * kiriman klien (forwardedHeaders tidak di-trust) lalu mengisi X-Real-IP sendiri.
 * Ambil entri paling kanan X-Forwarded-For (ditambahkan proxy terdekat) sebagai cadangan.
 */
export function clientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

/** Dipakai di awal route handler. Mengembalikan response 429 bila melewati batas. */
export async function rateLimit(
  name: RateLimitName,
  req: NextRequest,
  identifier: string = clientIp(req),
): Promise<NextResponse | null> {
  const result = await hit(name, identifier);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: RATE_LIMITS[name].message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(RATE_LIMITS[name].limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
