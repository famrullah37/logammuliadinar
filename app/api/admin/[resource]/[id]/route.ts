import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dbErrorResponse, parseBody, RESOURCES } from "@/lib/admin-resources";
import { UUID_RE } from "@/lib/queries";

type Ctx = { params: Promise<{ resource: string; id: string }> };

async function resolve(ctx: Ctx) {
  const { resource: key, id } = await ctx.params;
  const resource = RESOURCES[key];
  if (!resource || !UUID_RE.test(id)) return null;
  return { resource, id };
}

// Admin: ubah data.
export async function PUT(req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const target = await resolve(ctx);
  if (!target) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const parsed = parseBody(target.resource, await req.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const sets = parsed.columns.map((c, i) => `${c} = $${i + 1}`).join(", ");
  try {
    const row = await queryOne(
      `UPDATE ${target.resource.table} SET ${sets} WHERE id = $${parsed.values.length + 1} RETURNING *`,
      [...parsed.values, target.id],
    );
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return dbErrorResponse(err, `PUT /api/admin/${target.resource.table}`);
  }
}

// Admin: hapus data.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const target = await resolve(ctx);
  if (!target) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  try {
    const row = await queryOne(`DELETE FROM ${target.resource.table} WHERE id = $1 RETURNING id`, [target.id]);
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return dbErrorResponse(err, `DELETE /api/admin/${target.resource.table}`);
  }
}
