import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PRICE_SELECT } from "@/lib/queries";

// Admin: semua data master + harga untuk panel admin.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [brands, products, variants, prices] = await Promise.all([
      query("SELECT id, name FROM brands ORDER BY name"),
      query("SELECT id, name FROM products ORDER BY name"),
      query("SELECT id, product_id, type_name, weight, purity, image_url, description FROM product_variants ORDER BY weight"),
      query(`${PRICE_SELECT} ORDER BY pr.created_at DESC`),
    ]);
    return NextResponse.json({ brands, products, variants, prices });
  } catch (err) {
    console.error("GET /api/admin/data", err);
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
