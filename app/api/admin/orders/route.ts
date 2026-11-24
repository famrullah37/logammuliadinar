import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { ORDER_SELECT } from "@/lib/queries";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

// Admin: daftar pesanan, opsional ?status=...
export async function GET(req: NextRequest) {
  const denied = await requireStaff();
  if (denied) return denied;

  const status = req.nextUrl.searchParams.get("status");
  try {
    const rows =
      status && STATUSES.includes(status)
        ? await query(`${ORDER_SELECT} WHERE o.status = $1 ORDER BY o.created_at DESC`, [status])
        : await query(`${ORDER_SELECT} ORDER BY o.created_at DESC`);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/admin/orders", err);
    return NextResponse.json({ error: "Gagal memuat pesanan" }, { status: 500 });
  }
}
