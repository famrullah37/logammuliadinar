import "server-only";
import { BusinessError, type Tx } from "./db";

// ── Stok ────────────────────────────────────────────────────────────
export type StockReason = "order" | "order_cancel" | "buyback" | "buyback_cancel" | "adjust" | "set" | "purchase";

interface PriceStockRow {
  id: string;
  stock: number | null;
}

/** Kunci baris harga (brand × varian) untuk perubahan stok yang aman dari balapan. */
export async function lockPriceRow(tx: Tx, variantId: string, brandId: string) {
  return tx.queryOne<PriceStockRow & { harga_beli: number; harga_buyback: number }>(
    "SELECT id, stock, harga_beli, harga_buyback FROM prices WHERE variant_id = $1 AND brand_id = $2 FOR UPDATE",
    [variantId, brandId],
  );
}

// ── Modal FIFO ──────────────────────────────────────────────────────
// Setiap stok masuk = satu lot (jumlah + modal/keping). Stok keluar mengambil lot tertua
// lebih dulu dan mencatat alokasinya, sehingga HPP per pesanan diketahui dan pembatalan
// mengembalikan keping ke lot asalnya.

type LotSource = "pusat" | "buyback" | "koreksi" | "awal" | "retur";
type AllocationType = "order" | "adjust" | "set" | "buyback_cancel";

/** Modal per keping dari lot terakhir yang diketahui; cadangan: harga buyback saat ini. */
export async function lastUnitCost(tx: Tx, priceId: string): Promise<number | null> {
  const lot = await tx.queryOne<{ unit_cost: number }>(
    "SELECT unit_cost FROM stock_lots WHERE price_id = $1 AND unit_cost IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1",
    [priceId],
  );
  if (lot) return lot.unit_cost;
  const price = await tx.queryOne<{ harga_buyback: number }>("SELECT harga_buyback FROM prices WHERE id = $1", [priceId]);
  return price?.harga_buyback ?? null;
}

async function addLot(tx: Tx, priceId: string, qty: number, unitCost: number | null, source: LotSource, ref: string | null, note: string | null) {
  await tx.query(
    `INSERT INTO stock_lots (price_id, source, unit_cost, qty_in, qty_remaining, ref, note)
     VALUES ($1, $2, $3, $4, $4, $5, $6)`,
    [priceId, source, unitCost, qty, ref, note],
  );
}

/** Ambil `qty` keping dari lot tertua (FIFO); kembalikan total modalnya (null bila sebagian tak diketahui). */
async function consumeFifo(tx: Tx, priceId: string, qty: number, refType: AllocationType, ref: string | null) {
  const lots = await tx.query<{ id: string; qty_remaining: number; unit_cost: number | null }>(
    `SELECT id, qty_remaining, unit_cost FROM stock_lots
      WHERE price_id = $1 AND qty_remaining > 0 ORDER BY created_at, id FOR UPDATE`,
    [priceId],
  );
  let left = qty;
  for (const lot of lots) {
    if (left === 0) break;
    const take = Math.min(left, lot.qty_remaining);
    await tx.query("UPDATE stock_lots SET qty_remaining = qty_remaining - $1 WHERE id = $2", [take, lot.id]);
    await tx.query(
      "INSERT INTO stock_allocations (lot_id, price_id, ref_type, ref, qty, unit_cost) VALUES ($1, $2, $3, $4, $5, $6)",
      [lot.id, priceId, refType, ref, take, lot.unit_cost],
    );
    left -= take;
  }
  if (left > 0) {
    // Stok tercatat tanpa lot (data lama): tetap dialokasikan, modal tidak diketahui.
    await tx.query(
      "INSERT INTO stock_allocations (lot_id, price_id, ref_type, ref, qty, unit_cost) VALUES (NULL, $1, $2, $3, $4, NULL)",
      [priceId, refType, ref, left],
    );
  }
}

/** Kembalikan keping dari alokasi sebuah transaksi ke lot asalnya; hasil = jumlah keping yang dipulihkan. */
async function restoreAllocations(tx: Tx, priceId: string, refType: AllocationType, ref: string): Promise<number> {
  const rows = await tx.query<{ id: string; lot_id: string | null; qty: number }>(
    "SELECT id, lot_id, qty FROM stock_allocations WHERE price_id = $1 AND ref_type = $2 AND ref = $3 FOR UPDATE",
    [priceId, refType, ref],
  );
  let restored = 0;
  for (const a of rows) {
    if (a.lot_id) await tx.query("UPDATE stock_lots SET qty_remaining = qty_remaining + $1 WHERE id = $2", [a.qty, a.lot_id]);
    else await addLot(tx, priceId, a.qty, null, "retur", ref, "Retur tanpa lot asal");
    restored += a.qty;
  }
  await tx.query("DELETE FROM stock_allocations WHERE price_id = $1 AND ref_type = $2 AND ref = $3", [priceId, refType, ref]);
  return restored;
}

const LOT_SOURCE: Partial<Record<StockReason, LotSource>> = {
  purchase: "pusat",
  buyback: "buyback",
  adjust: "koreksi",
  set: "koreksi",
};
const ALLOCATION_TYPE: Partial<Record<StockReason, AllocationType>> = {
  order: "order",
  adjust: "adjust",
  set: "set",
  buyback_cancel: "buyback_cancel",
};

/**
 * Ubah stok sebesar `change` (+/-), perbarui lot FIFO, dan catat riwayatnya.
 * Stok NULL (tidak dilacak) dilewati. Melempar BusinessError bila stok akan menjadi negatif.
 * `unitCost` dipakai untuk stok masuk (pusat/buyback/koreksi); bila kosong pakai modal terakhir.
 */
export async function changeStock(
  tx: Tx,
  row: PriceStockRow | null,
  change: number,
  reason: StockReason,
  ref: string | null,
  note: string | null = null,
  unitCost?: number | null,
): Promise<number | null> {
  if (!row || row.stock === null || change === 0) return row?.stock ?? null;
  const after = row.stock + change;
  if (after < 0) {
    throw new BusinessError(`Stok tidak cukup (tersisa ${row.stock})`);
  }

  if (change > 0) {
    let remaining = change;
    if (reason === "order_cancel" && ref) {
      remaining -= await restoreAllocations(tx, row.id, "order", ref);
    }
    if (remaining > 0) {
      const cost = unitCost !== undefined && unitCost !== null ? unitCost : await lastUnitCost(tx, row.id);
      await addLot(tx, row.id, remaining, cost, LOT_SOURCE[reason] ?? "retur", ref, note);
    }
  } else {
    await consumeFifo(tx, row.id, -change, ALLOCATION_TYPE[reason] ?? "adjust", ref);
  }

  await tx.query("UPDATE prices SET stock = $1 WHERE id = $2", [after, row.id]);
  await tx.query(
    "INSERT INTO stock_movements (price_id, change, stock_after, reason, ref, note) VALUES ($1, $2, $3, $4, $5, $6)",
    [row.id, change, after, reason, ref, note],
  );
  row.stock = after;
  return after;
}

// ── Kas ─────────────────────────────────────────────────────────────
export const MANUAL_CASH_CATEGORIES = {
  in: { modal: "Setoran modal", lainnya_masuk: "Pemasukan lain" },
  out: {
    operasional: "Biaya operasional",
    gaji: "Gaji",
    sewa: "Sewa",
    pembelian_stok: "Pembelian stok",
    prive: "Pengambilan pemilik",
    zakat: "Zakat",
    lainnya_keluar: "Pengeluaran lain",
  },
} as const;

export const CASH_CATEGORY_LABELS: Record<string, string> = {
  penjualan: "Penjualan",
  buyback: "Buyback",
  koreksi: "Koreksi (pembatalan)",
  ...MANUAL_CASH_CATEGORIES.in,
  ...MANUAL_CASH_CATEGORIES.out,
};

export async function addAutoCash(
  tx: Tx,
  direction: "in" | "out",
  amount: number,
  category: "penjualan" | "buyback" | "koreksi" | "pembelian_stok" | "zakat",
  description: string,
  ref: string,
) {
  if (!(amount > 0)) return;
  await tx.query(
    `INSERT INTO cash_entries (direction, amount, category, description, ref, source)
     VALUES ($1, $2, $3, $4, $5, 'auto')`,
    [direction, amount, category, description, ref],
  );
}

// ── Penyisihan zakat 2,5% dari harga jual ────────────────────────────
export const ZAKAT_RATE = 0.025;

/**
 * Selaraskan penyisihan zakat sebuah pesanan dengan statusnya.
 * - Selesai: harus ada penyisihan bersih = 2,5% × harga jual barang (total_harga).
 * - Tidak selesai: penyisihan bersih harus 0. Yang belum dikeluarkan dihapus; yang sudah
 *   dikeluarkan diimbangi baris koreksi (minus) sehingga mengurangi pengeluaran berikutnya.
 */
export async function syncZakatReserve(
  tx: Tx,
  order: { id: string; order_number: string; total_harga: number },
  completed: boolean,
) {
  const target = completed ? Math.round(order.total_harga * ZAKAT_RATE) : 0;
  const rows = await tx.query<{ id: string; amount: number; payout_id: string | null }>(
    "SELECT id, amount, payout_id FROM zakat_reserves WHERE order_id = $1 FOR UPDATE",
    [order.id],
  );
  // Buang penyisihan yang belum dikeluarkan; hitung ulang dari yang sudah dikeluarkan.
  const unpaid = rows.filter((r) => r.payout_id === null);
  if (unpaid.length) {
    await tx.query("DELETE FROM zakat_reserves WHERE id = ANY($1::uuid[])", [unpaid.map((r) => r.id)]);
  }
  const paidNet = rows.filter((r) => r.payout_id !== null).reduce((s, r) => s + r.amount, 0);
  const diff = target - paidNet;
  if (diff === 0) return;
  await tx.query(
    `INSERT INTO zakat_reserves (order_id, order_number, kind, base_amount, amount)
     VALUES ($1, $2, $3, $4, $5)`,
    [order.id, order.order_number, diff > 0 ? "sale" : "reversal", diff > 0 ? order.total_harga : -order.total_harga, diff],
  );
}
