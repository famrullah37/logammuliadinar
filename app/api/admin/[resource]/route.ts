import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dbErrorResponse, getResource, parseBody } from "@/lib/admin-resources";

// Admin: tambah brand / produk / varian / harga.
export async function POST(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const resource = getResource((await params).resource);
  if (!resource) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const parsed = parseBody(resource, await req.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const placeholders = parsed.values.map((_, i) => `$${i + 1}`).join(", ");
  try {
    const row = await queryOne(
      `INSERT INTO ${resource.table} (${parsed.columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      parsed.values,
    );
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return dbErrorResponse(err, `POST /api/admin/${resource.table}`);
  }
}
