import { NextRequest, NextResponse } from "next/server";
import { getAdminId, hashPassword, verifyPassword } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Admin: ganti password sendiri. Sesi lain (perangkat lain) otomatis keluar karena sidik
// password berubah; sesi di perangkat ini diperbarui agar tetap masuk.
export async function POST(req: NextRequest) {
  const userId = await getAdminId();
  if (!userId) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const limited = await rateLimit("login", req);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  const current = body.current ?? "";
  const next = body.next ?? "";
  if (!current || !next) return NextResponse.json({ error: "Isi password lama dan password baru" }, { status: 400 });
  if (next.length < 8) return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
  if (next.length > 200 || current.length > 200) return NextResponse.json({ error: "Password terlalu panjang" }, { status: 400 });
  if (next === current) return NextResponse.json({ error: "Password baru harus berbeda dari password lama" }, { status: 400 });

  try {
    const user = await queryOne<{ password_hash: string }>("SELECT password_hash FROM admin_users WHERE id = $1", [userId]);
    if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    if (!(await verifyPassword(current, user.password_hash))) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
    }

    const newHash = await hashPassword(next);
    await queryOne("UPDATE admin_users SET password_hash = $1 WHERE id = $2", [newHash, userId]);

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, createSessionToken(userId, newHash), sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("POST /api/auth/password", err);
    return NextResponse.json({ error: "Gagal mengganti password" }, { status: 500 });
  }
}
