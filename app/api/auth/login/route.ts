import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

// Hash acak (scrypt, format sama) untuk perbandingan saat email tidak ditemukan.
const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export async function POST(req: NextRequest) {
  const limited = await rateLimit("login", req);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }
  // Batas per akun (selain per IP) memperlambat tebak password dari banyak IP.
  const limitedEmail = await rateLimit("loginEmail", req, email);
  if (limitedEmail) return limitedEmail;

  try {
    const user = await queryOne<{ id: string; password_hash: string; role: string; active: boolean }>(
      "SELECT id, password_hash, role, active FROM admin_users WHERE email = $1",
      [email],
    );
    // Email tidak terdaftar tetap menjalankan scrypt agar waktu respons tidak membocorkan email admin.
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }
    // Dicek setelah password benar agar status akun tidak bocor ke penebak password.
    if (!user.active) {
      return NextResponse.json({ error: "Akun ini dinonaktifkan. Hubungi admin." }, { status: 403 });
    }

    const res = NextResponse.json({ success: true, role: user.role });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id, user.password_hash), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/login", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
