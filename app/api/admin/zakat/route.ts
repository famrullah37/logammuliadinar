import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * Admin: data untuk kalkulator zakat perdagangan, per hari ini (dijalankan pada hari haul).
 * - Stok dinilai dengan HARGA JUAL hari ini (harga_beli = harga jual ke pembeli).
 * - Barang dari pesanan yang belum selesai masih milik toko (stoknya sudah dipotong saat pesan),
 *   jadi ditampilkan terpisah agar bisa ikut dihitung.
 * - Saldo kas dari Buku Kas.
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [items, untracked, cash, pending, lastZakat, reserves, reserveTotals, payouts] = await Promise.all([
      query(
        `SELECT pr.id, b.name AS brand_name, p.name AS product_name, v.type_name, v.weight,
                pr.stock, pr.harga_beli AS harga_jual, pr.stock * pr.harga_beli AS nilai
           FROM prices pr
           JOIN brands b ON b.id = pr.brand_id
           JOIN product_variants v ON v.id = pr.variant_id
           JOIN products p ON p.id = v.product_id
          WHERE pr.stock > 0
          ORDER BY p.name, v.weight, b.name`,
      ),
      queryOne<{ n: number }>("SELECT count(*)::int AS n FROM prices WHERE stock IS NULL"),
      queryOne<{ saldo: number }>(
        "SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS saldo FROM cash_entries",
      ),
      // Barang dipesan tapi pesanan belum selesai: dinilai dengan harga jual hari ini.
      queryOne<{ keping: number; nilai: number; pesanan: number }>(
        `SELECT COALESCE(SUM(o.quantity), 0)::int AS keping,
                COALESCE(SUM(o.quantity * pr.harga_beli), 0) AS nilai,
                count(*)::int AS pesanan
           FROM orders o
           JOIN prices pr ON pr.variant_id = o.variant_id AND pr.brand_id = o.brand_id
          WHERE o.status IN ('pending', 'confirmed') AND pr.stock IS NOT NULL`,
      ),
      queryOne(
        `SELECT to_char(entry_date, 'YYYY-MM-DD') AS entry_date, amount, description
           FROM cash_entries WHERE category = 'zakat' ORDER BY entry_date DESC, created_at DESC LIMIT 1`,
      ),
      // Penyisihan 2,5% dari penjualan: semua yang belum dikeluarkan + 100 terakhir yang sudah.
      query(
        `(SELECT z.id, z.order_number, z.kind, z.base_amount, z.amount, z.created_at, NULL::text AS paid_date
            FROM zakat_reserves z WHERE z.payout_id IS NULL)
         UNION ALL
         (SELECT z.id, z.order_number, z.kind, z.base_amount, z.amount, z.created_at, to_char(zp.paid_date, 'YYYY-MM-DD')
            FROM zakat_reserves z JOIN zakat_payouts zp ON zp.id = z.payout_id
           ORDER BY z.created_at DESC LIMIT 100)
         ORDER BY created_at DESC`,
      ),
      queryOne<{ belum: number; sudah: number; transaksi_belum: number }>(
        `SELECT COALESCE(SUM(amount) FILTER (WHERE payout_id IS NULL), 0) AS belum,
                COALESCE(SUM(amount) FILTER (WHERE payout_id IS NOT NULL), 0) AS sudah,
                count(*) FILTER (WHERE payout_id IS NULL)::int AS transaksi_belum
           FROM zakat_reserves`,
      ),
      query(
        `SELECT zp.id, to_char(zp.paid_date, 'YYYY-MM-DD') AS paid_date, zp.amount, zp.note,
                (SELECT count(*)::int FROM zakat_reserves z WHERE z.payout_id = zp.id) AS transaksi
           FROM zakat_payouts zp ORDER BY zp.created_at DESC LIMIT 50`,
      ),
    ]);

    return NextResponse.json({
      items,
      untracked: untracked?.n ?? 0,
      saldo_kas: cash?.saldo ?? 0,
      pending,
      last_zakat: lastZakat,
      reserves,
      reserve_totals: reserveTotals,
      payouts,
    });
  } catch (err) {
    console.error("GET /api/admin/zakat", err);
    return NextResponse.json({ error: "Gagal memuat data zakat" }, { status: 500 });
  }
}
