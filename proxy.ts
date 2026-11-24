import { NextRequest, NextResponse } from "next/server";
import {
  renewSessionToken, SESSION_COOKIE, SESSION_IDLE_SECONDS, sessionCookieOptions, verifySessionToken,
} from "@/lib/session";

/** Perpanjang sesi paling sering sekali per menit (cukup untuk batas 15 menit tanpa aktivitas). */
const RENEW_AFTER_MS = 60 * 1000;

const MAX_BODY_BYTES = 64 * 1024; // semua payload API kita kecil (form JSON)
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Request yang mengubah data harus datang dari situs ini sendiri (anti-CSRF). */
function isCrossSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // klien non-browser (curl, server) tidak mengirim Origin
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const mutating = !SAFE_METHODS.has(request.method);

  if (isApi && mutating) {
    const lengthHeader = request.headers.get("content-length");
    if (lengthHeader === null && /chunked/i.test(request.headers.get("transfer-encoding") ?? "")) {
      return NextResponse.json({ error: "Content-Length wajib" }, { status: 411 });
    }
    const length = Number(lengthHeader ?? 0);
    if (!Number.isFinite(length) || length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Data terlalu besar" }, { status: 413 });
    }
    // Endpoint yang memakai cookie sesi: tolak bila dipanggil dari situs lain.
    if ((pathname.startsWith("/api/admin/") || pathname.startsWith("/api/auth/")) && isCrossSite(request)) {
      return NextResponse.json({ error: "Permintaan ditolak" }, { status: 403 });
    }
  }

  // Lapisan pertama proteksi admin. Setiap API admin tetap memeriksa sesi sendiri
  // (requireAdmin) — jangan hanya mengandalkan proxy.
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin/");
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (isAdminArea && !session) {
    if (isApi) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    return NextResponse.redirect(new URL("/login?reason=expired", request.url));
  }

  const res = NextResponse.next();
  // Aktivitas di area admin (termasuk detak /api/auth/me) memperpanjang batas 15 menit.
  const renewable = isAdminArea || pathname === "/api/auth/me";
  if (session && renewable && session.expiresAt - Date.now() < SESSION_IDLE_SECONDS * 1000 - RENEW_AFTER_MS) {
    res.cookies.set(SESSION_COOKIE, renewSessionToken(session), sessionCookieOptions());
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
