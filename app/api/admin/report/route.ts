import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parsePeriod } from "@/lib/period";

// Tanggal transaksi dihitung dari completed_at dalam WIB.
const JKT_DATE = (col: string) => `(${col} AT TIME ZONE 'Asia/Jakarta')::date`;

// Admin: laporan keuangan per periode.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const period = parsePeriod(req.nextUrl.searchParams);
  if (!period) return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });
  const p = [period.from, period.to];

  try {
    const [sales, salesBy, buyback, buybackBy, cashOpening, cashTotals, cashBy, stock, open, profit] = await Promise.all([
      queryOne(
        `SELECT count(*)::int AS transaksi, COALESCE(SUM(quantity), 0)::int AS keping,
                COALESCE(SUM(quantity * v.weight), 0) AS gram,
                COALESCE(SUM(total_bayar), 0) AS nilai,
                COALESCE(SUM(COALESCE(kode_unik, 0)), 0) AS kode_unik,
                COALESCE(SUM(COALESCE(ongkir, 0)), 0) AS ongkir
           FROM orders o JOIN product_variants v ON v.id = o.variant_id
          WHERE o.status = 'completed' AND ${JKT_DATE("o.completed_at")} BETWEEN $1 AND $2`,
        p,
      ),
      query(
        `SELECT p.name AS product_name, v.type_name, b.name AS brand_name,
                SUM(o.quantity)::int AS keping, SUM(o.total_bayar) AS nilai
           FROM orders o
           JOIN product_variants v ON v.id = o.variant_id JOIN products p ON p.id = v.product_id
           JOIN brands b ON b.id = o.brand_id
          WHERE o.status = 'completed' AND ${JKT_DATE("o.completed_at")} BETWEEN $1 AND $2
          GROUP BY p.name, v.type_name, v.weight, b.name ORDER BY p.name, v.weight, b.name`,
        p,
      ),
      queryOne(
        `SELECT count(*)::int AS transaksi, COALESCE(SUM(quantity), 0)::int AS keping,
                COALESCE(SUM(quantity * v.weight), 0) AS gram,
                COALESCE(SUM(COALESCE(total_final, total_estimasi)), 0) AS nilai
           FROM buyback_requests r JOIN product_variants v ON v.id = r.variant_id
          WHERE r.status = 'completed' AND ${JKT_DATE("r.completed_at")} BETWEEN $1 AND $2`,
        p,
      ),
      query(
        `SELECT p.name AS product_name, v.type_name, b.name AS brand_name,
                SUM(r.quantity)::int AS keping, SUM(COALESCE(r.total_final, r.total_estimasi)) AS nilai
           FROM buyback_requests r
           JOIN product_variants v ON v.id = r.variant_id JOIN products p ON p.id = v.product_id
           JOIN brands b ON b.id = r.brand_id
          WHERE r.status = 'completed' AND ${JKT_DATE("r.completed_at")} BETWEEN $1 AND $2
          GROUP BY p.name, v.type_name, v.weight, b.name ORDER BY p.name, v.weight, b.name`,
        p,
      ),
      queryOne<{ saldo: number }>(
        `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS saldo
           FROM cash_entries WHERE entry_date < $1`,
        [period.from],
      ),
      queryOne<{ masuk: number; keluar: number }>(
        `SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0) AS masuk,
                COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS keluar
           FROM cash_entries WHERE entry_date BETWEEN $1 AND $2`,
        p,
      ),
      query(
        `SELECT direction, category, SUM(amount) AS total, count(*)::int AS entri
           FROM cash_entries WHERE entry_date BETWEEN $1 AND $2
          GROUP BY direction, category ORDER BY direction, total DESC`,
        p,
      ),
      // Posisi stok saat ini (hanya yang dilacak): nilai buyback & nilai modal FIFO.
      queryOne(
        `SELECT COALESCE(SUM(stock), 0)::int AS keping, COALESCE(SUM(stock * v.weight), 0) AS gram,
                COALESCE(SUM(stock * harga_buyback), 0) AS nilai_buyback,
                count(*) FILTER (WHERE stock = 0)::int AS habis,
                (SELECT COALESCE(SUM(qty_remaining * unit_cost), 0) FROM stock_lots WHERE qty_remaining > 0) AS nilai_modal
           FROM prices pr JOIN product_variants v ON v.id = pr.variant_id WHERE pr.stock IS NOT NULL`,
      ),
      // Transaksi yang masih berjalan (belum masuk kas).
      queryOne(
        `SELECT (SELECT count(*) FROM orders WHERE status IN ('pending', 'confirmed'))::int AS pesanan,
                (SELECT COALESCE(SUM(total_bayar), 0) FROM orders WHERE status IN ('pending', 'confirmed')) AS nilai_pesanan,
                (SELECT count(*) FROM orders WHERE status IN ('pending', 'confirmed') AND delivery_method = 'delivery' AND ongkir IS NULL)::int AS menunggu_ongkir,
                (SELECT count(*) FROM buyback_requests WHERE status IN ('pending', 'confirmed'))::int AS buyback,
                (SELECT COALESCE(SUM(amount), 0) FROM zakat_reserves WHERE payout_id IS NULL) AS zakat_belum`,
      ),
      // Laba kotor (FIFO): harga barang (tanpa ongkir & kode unik) − modal keping yang terjual.
      // Hanya pesanan yang modal seluruh kepingnya diketahui; sisanya dihitung terpisah.
      queryOne<{ pendapatan: number; hpp: number; transaksi: number; tanpa_modal: number }>(
        `WITH sold AS (
           SELECT o.order_number, o.total_harga,
                  SUM(a.qty * a.unit_cost) AS hpp,
                  bool_and(a.unit_cost IS NOT NULL) AS lengkap,
                  count(a.id) AS alokasi
             FROM orders o
             LEFT JOIN stock_allocations a ON a.ref_type = 'order' AND a.ref = o.order_number
            WHERE o.status = 'completed' AND ${JKT_DATE("o.completed_at")} BETWEEN $1 AND $2
            GROUP BY o.order_number, o.total_harga
         )
         SELECT COALESCE(SUM(total_harga) FILTER (WHERE alokasi > 0 AND lengkap), 0) AS pendapatan,
                COALESCE(SUM(hpp) FILTER (WHERE alokasi > 0 AND lengkap), 0) AS hpp,
                count(*) FILTER (WHERE alokasi > 0 AND lengkap)::int AS transaksi,
                count(*) FILTER (WHERE alokasi = 0 OR NOT lengkap)::int AS tanpa_modal
           FROM sold`,
        p,
      ),
    ]);

    const saldoAwal = cashOpening?.saldo ?? 0;
    const masuk = cashTotals?.masuk ?? 0;
    const keluar = cashTotals?.keluar ?? 0;
    return NextResponse.json({
      ...period,
      sales, sales_by: salesBy, buyback, buyback_by: buybackBy,
      cash: { saldo_awal: saldoAwal, masuk, keluar, saldo_akhir: saldoAwal + masuk - keluar, by_category: cashBy },
      stock, open,
      profit: { ...profit, laba_kotor: (profit?.pendapatan ?? 0) - (profit?.hpp ?? 0) },
    });
  } catch (err) {
    console.error("GET /api/admin/report", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
