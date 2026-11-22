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

  // Baris harga yang terkait (langsung atau lewat cascade) dan masih punya stok tidak boleh ikut terhapus.
  const STOCK_GUARD: Record<string, string> = {
    prices: "SELECT count(*)::int AS n FROM prices WHERE id = $1 AND stock > 0",
    brands: "SELECT count(*)::int AS n FROM prices WHERE brand_id = $1 AND stock > 0",
    product_variants: "SELECT count(*)::int AS n FROM prices WHERE variant_id = $1 AND stock > 0",
    products: `SELECT count(*)::int AS n FROM prices pr JOIN product_variants v ON v.id = pr.variant_id
                WHERE v.product_id = $1 AND pr.stock > 0`,
  };
  try {
    const guard = STOCK_GUARD[target.resource.table];
    if (guard) {
      const withStock = await queryOne<{ n: number }>(guard, [target.id]);
      if (withStock && withStock.n > 0) {
        return NextResponse.json(
          { error: "Masih ada stok untuk data ini. Kosongkan stoknya dulu (menu Stok) agar modal & riwayat tidak hilang." },
          { status: 409 },
        );
      }
    }
    const row = await queryOne(`DELETE FROM ${target.resource.table} WHERE id = $1 RETURNING id`, [target.id]);
    if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return dbErrorResponse(err, `DELETE /api/admin/${target.resource.table}`);
  }
}
