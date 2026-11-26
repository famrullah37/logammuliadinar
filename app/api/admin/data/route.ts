import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PRICE_SELECT } from "@/lib/queries";

// Admin: semua data master + harga untuk panel admin.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [brands, products, variants, prices, bank_accounts] = await Promise.all([
      query("SELECT id, name FROM brands ORDER BY name"),
      query("SELECT id, name FROM products ORDER BY name"),
      query("SELECT id, product_id, type_name, weight, purity, image_url, description FROM product_variants ORDER BY weight"),
      query(`${PRICE_SELECT} ORDER BY p.name, v.weight, b.name`),
      query("SELECT id, bank, account_number, holder FROM bank_accounts ORDER BY created_at"),
    ]);
    return NextResponse.json({ brands, products, variants, prices, bank_accounts });
  } catch (err) {
    console.error("GET /api/admin/data", err);
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
