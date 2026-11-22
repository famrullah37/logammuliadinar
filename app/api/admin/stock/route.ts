import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { UUID_RE } from "@/lib/queries";

// Admin: daftar stok per brand × pecahan (dengan nilai modal FIFO),
// atau riwayat + lot tersisa satu baris (?price_id=).
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const priceId = req.nextUrl.searchParams.get("price_id");
  try {
    if (priceId) {
      if (!UUID_RE.test(priceId)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
      const [movements, lots] = await Promise.all([
        query(
          `SELECT id, change, stock_after, reason, ref, note, created_at
             FROM stock_movements WHERE price_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [priceId],
        ),
        query(
          `SELECT id, source, unit_cost, qty_in, qty_remaining, ref, note, created_at
             FROM stock_lots WHERE price_id = $1 AND qty_remaining > 0 ORDER BY created_at, id`,
          [priceId],
        ),
      ]);
      return NextResponse.json({ movements, lots });
    }
    const rows = await query(
      `SELECT pr.id, pr.stock, pr.harga_beli, pr.harga_buyback,
              b.name AS brand_name, p.name AS product_name, v.type_name, v.weight,
              (SELECT max(created_at) FROM stock_movements m WHERE m.price_id = pr.id) AS last_movement,
              (SELECT COALESCE(SUM(qty_remaining * unit_cost), 0) FROM stock_lots l
                WHERE l.price_id = pr.id AND l.qty_remaining > 0) AS nilai_modal,
              (SELECT unit_cost FROM stock_lots l WHERE l.price_id = pr.id AND l.qty_remaining > 0
                ORDER BY created_at, id LIMIT 1) AS modal_berikutnya
         FROM prices pr
         JOIN brands b ON b.id = pr.brand_id
         JOIN product_variants v ON v.id = pr.variant_id
         JOIN products p ON p.id = v.product_id
        ORDER BY p.name, v.weight, b.name`,
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/admin/stock", err);
    return NextResponse.json({ error: "Gagal memuat stok" }, { status: 500 });
  }
}
