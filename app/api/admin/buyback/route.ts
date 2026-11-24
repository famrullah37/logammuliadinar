import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const SELECT = `
  SELECT r.*,
         json_build_object('type_name', v.type_name, 'weight', v.weight,
                           'products', json_build_object('name', p.name)) AS product_variants,
         json_build_object('name', b.name) AS brands
    FROM buyback_requests r
    JOIN product_variants v ON v.id = r.variant_id
    JOIN products p ON p.id = v.product_id
    JOIN brands b ON b.id = r.brand_id
`;

// Admin: daftar pengajuan buyback, opsional ?status=...
export async function GET(req: NextRequest) {
  const denied = await requireStaff();
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status");
  try {
    const rows =
      status && STATUSES.includes(status)
        ? await query(`${SELECT} WHERE r.status = $1 ORDER BY r.created_at DESC`, [status])
        : await query(`${SELECT} ORDER BY r.created_at DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/admin/buyback", err);
    return NextResponse.json({ error: "Gagal memuat pengajuan buyback" }, { status: 500 });
  }
}
