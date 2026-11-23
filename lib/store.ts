import "server-only";
import { randomInt } from "node:crypto";
import { BusinessError, PG, pgErrorCode, withTransaction, type Tx } from "./db";
import { changeStock, lockPriceRow } from "./ledger";
import { applyBuybackStatus, applyOrderStatus, type StatusResult } from "./receipts";

/**
 * Transaksi langsung di toko (offline) yang diinput admin. Langsung berstatus selesai dalam
 * satu transaksi database: stok, kas, penyisihan zakat (penjualan), dan nota terbit sekaligus,
 * memakai logika yang sama dengan pesanan/buyback online.
 */

export interface StoreCustomer {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface StoreSaleInput extends StoreCustomer {
  priceId: string;
  quantity: number;
  unitPrice: number;
  paymentMethod: "cash" | "transfer";
}

export interface StoreBuybackInput extends StoreCustomer {
  priceId: string;
  quantity: number;
  unitPrice: number;
  payoutMethod: "cash" | "transfer";
  bank: { bank: string; number: string; holder: string } | null;
  hasCertificate: boolean;
  hasPackaging: boolean;
}

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const MAX_ATTEMPTS = 8;

async function priceRowById(tx: Tx, priceId: string) {
  const ids = await tx.queryOne<{ variant_id: string; brand_id: string }>(
    "SELECT variant_id, brand_id FROM prices WHERE id = $1",
    [priceId],
  );
  if (!ids) throw new BusinessError("Produk tidak ditemukan", 404);
  const row = await lockPriceRow(tx, ids.variant_id, ids.brand_id);
  if (!row) throw new BusinessError("Produk tidak ditemukan", 404);
  return { ...ids, row };
}

/** Sisipkan baris dengan nomor acak; ulangi bila nomor bentrok. */
async function insertWithNumber<T>(tx: Tx, prefix: string, sql: string, values: unknown[]): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    await tx.query("SAVEPOINT store_insert");
    try {
      const row = await tx.queryOne<T>(sql, [`${prefix}-${today()}-${randomInt(1000, 10000)}`, ...values]);
      await tx.query("RELEASE SAVEPOINT store_insert");
      return row!;
    } catch (err) {
      await tx.query("ROLLBACK TO SAVEPOINT store_insert");
      if (pgErrorCode(err) === PG.UNIQUE_VIOLATION && attempt < MAX_ATTEMPTS) continue;
      throw err;
    }
  }
}

export type StoreResult = StatusResult & { number: string; total: number };

export function createStoreSale(input: StoreSaleInput): Promise<StoreResult> {
  return withTransaction(async (tx) => {
    const { variant_id, brand_id, row } = await priceRowById(tx, input.priceId);
    if (row.stock !== null && row.stock < input.quantity) {
      throw new BusinessError(row.stock === 0 ? "Stok produk ini habis" : `Stok tidak cukup (tersisa ${row.stock})`);
    }
    const total = input.unitPrice * input.quantity;
    const order = await insertWithNumber<{ id: string; order_number: string }>(
      tx,
      "TK",
      `INSERT INTO orders (
         order_number, variant_id, brand_id, quantity, harga_beli, total_harga,
         buyer_name, buyer_phone, buyer_email, delivery_method, payment_method, notes, channel
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pickup',$10,$11,'store')
       RETURNING id, order_number`,
      [variant_id, brand_id, input.quantity, input.unitPrice, total,
        input.name, input.phone, input.email, input.paymentMethod, input.notes],
    );
    await changeStock(tx, row, -input.quantity, "order", order.order_number);
    const done = await applyOrderStatus(tx, order.id, "completed");
    return { ...done!, number: order.order_number, total };
  });
}

export function createStoreBuyback(input: StoreBuybackInput): Promise<StoreResult> {
  return withTransaction(async (tx) => {
    const { variant_id, brand_id } = await priceRowById(tx, input.priceId);
    const total = input.unitPrice * input.quantity;
    const req = await insertWithNumber<{ id: string; request_number: string }>(
      tx,
      "BB",
      `INSERT INTO buyback_requests (
         request_number, variant_id, brand_id, quantity, harga_buyback, total_estimasi,
         seller_name, seller_phone, seller_email, has_certificate, has_packaging, handover_method, notes,
         channel, payout_method, seller_bank, seller_account_number, seller_account_holder
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'store',$12,'store',$13,$14,$15,$16)
       RETURNING id, request_number`,
      [variant_id, brand_id, input.quantity, input.unitPrice, total,
        input.name, input.phone, input.email, input.hasCertificate, input.hasPackaging, input.notes,
        input.payoutMethod, input.bank?.bank ?? null, input.bank?.number ?? null, input.bank?.holder ?? null],
    );
    const done = await applyBuybackStatus(tx, req.id, "completed", total);
    return { ...done!, number: req.request_number, total };
  });
}
