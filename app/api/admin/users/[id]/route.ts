import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword, requireAdmin } from "@/lib/auth";
import { BusinessError, withTransaction } from "@/lib/db";
import { UUID_RE } from "@/lib/queries";
import { assertActiveAdminRemains, isRole, parseName, parsePassword } from "@/lib/users";

// Admin: ubah role, nama, status aktif, atau reset password pengguna.
// Menonaktifkan / reset password langsung mengakhiri sesi pengguna itu.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const me = await getSessionUser();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const sets: string[] = [];
    const values: unknown[] = [];
    const add = (col: string, v: unknown) => { values.push(v); sets.push(`${col} = $${values.length}`); };

    if (body.role !== undefined) {
      if (!isRole(body.role)) throw new BusinessError("Role tidak valid", 400);
      if (id === me?.id && body.role !== "admin") throw new BusinessError("Tidak bisa menurunkan role akun sendiri", 400);
      add("role", body.role);
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") throw new BusinessError("Status tidak valid", 400);
      if (id === me?.id && !body.active) throw new BusinessError("Tidak bisa menonaktifkan akun sendiri", 400);
      add("active", body.active);
    }
    if (body.name !== undefined) add("name", parseName(body.name));
    if (body.password !== undefined) add("password_hash", await hashPassword(parsePassword(body.password)));
    if (!sets.length) throw new BusinessError("Tidak ada perubahan", 400);

    const row = await withTransaction(async (tx) => {
      const updated = await tx.queryOne(
        `UPDATE admin_users SET ${sets.join(", ")} WHERE id = $${values.length + 1}
         RETURNING id, email, name, role, active, created_at`,
        [...values, id],
      );
      if (updated) await assertActiveAdminRemains(tx);
      return updated;
    });
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/admin/users/[id]", err);
    return NextResponse.json({ error: "Gagal mengubah pengguna" }, { status: 500 });
  }
}
