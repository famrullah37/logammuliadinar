import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { BusinessError, PG, pgErrorCode, query, queryOne } from "@/lib/db";
import { isRole, parseEmail, parseName, parsePassword, USER_SELECT } from "@/lib/users";

// Admin: daftar pengguna panel admin.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(await query(`${USER_SELECT} ORDER BY role, created_at`));
  } catch (err) {
    console.error("GET /api/admin/users", err);
    return NextResponse.json({ error: "Gagal memuat pengguna" }, { status: 500 });
  }
}

// Admin: tambah pengguna (admin / kasir).
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const email = parseEmail(body.email);
    const name = parseName(body.name);
    const password = parsePassword(body.password);
    if (!isRole(body.role)) throw new BusinessError("Role tidak valid", 400);
    const row = await queryOne(
      `INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, active, created_at`,
      [email, name, body.role, await hashPassword(password)],
    );
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (pgErrorCode(err) === PG.UNIQUE_VIOLATION) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }
    console.error("POST /api/admin/users", err);
    return NextResponse.json({ error: "Gagal menambah pengguna" }, { status: 500 });
  }
}
