import "server-only";
import { randomBytes } from "node:crypto";
import { BusinessError, queryOne, withTransaction, type Tx } from "./db";
import { addAutoCash, changeStock, lockPriceRow, syncZakatReserve } from "./ledger";

export type TxStatus = "pending" | "confirmed" | "completed" | "cancelled";
export const TX_STATUSES: TxStatus[] = ["pending", "confirmed", "completed", "cancelled"];

/** Token link nota: 24 byte acak → 32 karakter base64url, tidak bisa ditebak. */
const newToken = () => randomBytes(24).toString("base64url");
export const RECEIPT_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

/**
 * Ubah status transaksi. Saat pertama kali menjadi 'completed', nota diterbitkan dalam
 * UPDATE yang sama: nomor urut dari sequence, waktu selesai, dan token link.
 * Nomor nota tidak pernah berubah/hilang walau status diubah lagi (mis. dibatalkan).
 */
function completionUpdate(table: "orders" | "buyback_requests") {
  const numberCol = table === "orders" ? "invoice_number" : "receipt_number";
  const prefix = table === "orders" ? "LMD/INV/" : "LMD/BB/";
  const seq = table === "orders" ? "invoice_seq" : "buyback_receipt_seq";
  return `
    UPDATE ${table} SET
      status = $1::text,
      completed_at = CASE WHEN $1::text = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
      ${numberCol} = CASE WHEN $1::text = 'completed' AND ${numberCol} IS NULL
        THEN '${prefix}' || to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY') || '/' || lpad(nextval('${seq}')::text, 6, '0')
        ELSE ${numberCol} END,
      receipt_token = CASE WHEN $1::text = 'completed' AND receipt_token IS NULL THEN $3::text ELSE receipt_token END
    WHERE id = $2
    RETURNING id, status, ${numberCol} AS receipt_number, receipt_token`;
}

export interface StatusResult {
  id: string;
  status: TxStatus;
  receipt_number: string | null;
  receipt_token: string | null;
}

const isActive = (s: TxStatus) => s !== "cancelled";

/**
 * Ubah status pesanan + efek sampingnya dalam satu transaksi:
 * - batal  → stok dikembalikan; aktif lagi dari batal → stok dipotong lagi
 * - masuk 'completed'  → nota terbit + kas masuk (total transfer termasuk kode unik)
 * - keluar 'completed' → kas keluar sebagai koreksi
 */
export function setOrderStatus(id: string, status: TxStatus): Promise<StatusResult | null> {
  return withTransaction((tx) => applyOrderStatus(tx, id, status));
}

/** Versi setOrderStatus di dalam transaksi yang sudah berjalan (dipakai juga oleh transaksi toko). */
export async function applyOrderStatus(tx: Tx, id: string, status: TxStatus): Promise<StatusResult | null> {
  const old = await tx.queryOne<{
    status: TxStatus; order_number: string; variant_id: string; brand_id: string;
    quantity: number; total_bayar: number; total_harga: number; delivery_method: string; ongkir: number | null;
  }>(
    "SELECT status, order_number, variant_id, brand_id, quantity, total_bayar, total_harga, delivery_method, ongkir FROM orders WHERE id = $1 FOR UPDATE",
    [id],
  );
  if (!old) return null;

  if (old.status !== status) {
    if (status === "completed" && old.delivery_method === "delivery" && old.ongkir === null) {
      throw new BusinessError("Isi ongkos kirim terlebih dahulu sebelum menyelesaikan pesanan (isi 0 bila gratis ongkir).");
    }
    if (isActive(old.status) !== isActive(status)) {
      const row = await lockPriceRow(tx, old.variant_id, old.brand_id);
      await changeStock(tx, row, isActive(status) ? -old.quantity : old.quantity,
        isActive(status) ? "order" : "order_cancel", old.order_number);
    }
    const amount = old.total_bayar;
    if (status === "completed") {
      await addAutoCash(tx, "in", amount, "penjualan", `Penjualan ${old.order_number}`, old.order_number);
    } else if (old.status === "completed") {
      await addAutoCash(tx, "out", amount, "koreksi", `Koreksi penjualan ${old.order_number} (${status})`, old.order_number);
    }
    // Penyisihan zakat 2,5% dari harga jual mengikuti status selesai.
    if (status === "completed" || old.status === "completed") {
      await syncZakatReserve(tx, { id, order_number: old.order_number, total_harga: old.total_harga }, status === "completed");
    }
  }
  return tx.queryOne<StatusResult>(completionUpdate("orders"), [status, id, newToken()]);
}

/**
 * Ubah status buyback + efek sampingnya dalam satu transaksi:
 * - masuk 'completed'  → nilai final disimpan, stok bertambah, kas keluar, nota terbit
 * - keluar 'completed' → stok dikurangi kembali, kas masuk sebagai koreksi
 */
export function setBuybackStatus(id: string, status: TxStatus, totalFinal?: number): Promise<StatusResult | null> {
  return withTransaction((tx) => applyBuybackStatus(tx, id, status, totalFinal));
}

/** Versi setBuybackStatus di dalam transaksi yang sudah berjalan (dipakai juga oleh transaksi toko). */
export async function applyBuybackStatus(
  tx: Tx, id: string, status: TxStatus, totalFinal?: number,
): Promise<StatusResult | null> {
  const old = await tx.queryOne<{
    status: TxStatus; request_number: string; variant_id: string; brand_id: string;
    quantity: number; total_estimasi: number; total_final: number | null;
  }>(
    "SELECT status, request_number, variant_id, brand_id, quantity, total_estimasi, total_final FROM buyback_requests WHERE id = $1 FOR UPDATE",
    [id],
  );
  if (!old) return null;

  if (old.status !== status) {
    if (status === "completed") {
      const final = totalFinal ?? old.total_final ?? old.total_estimasi;
      await tx.query("UPDATE buyback_requests SET total_final = $1 WHERE id = $2", [final, id]);
      const row = await lockPriceRow(tx, old.variant_id, old.brand_id);
      await changeStock(tx, row, old.quantity, "buyback", old.request_number, null, final / old.quantity);
      await addAutoCash(tx, "out", final, "buyback", `Buyback ${old.request_number}`, old.request_number);
    } else if (old.status === "completed") {
      const final = old.total_final ?? old.total_estimasi;
      const row = await lockPriceRow(tx, old.variant_id, old.brand_id);
      await changeStock(tx, row, -old.quantity, "buyback_cancel", old.request_number);
      await addAutoCash(tx, "in", final, "koreksi", `Koreksi buyback ${old.request_number} (${status})`, old.request_number);
    }
  }
  return tx.queryOne<StatusResult>(completionUpdate("buyback_requests"), [status, id, newToken()]);
}

// ── Data nota ──────────────────────────────────────────────────────
interface ReceiptBase {
  receipt_number: string;
  status: TxStatus;
  completed_at: string;
  created_at: string;
  reference: string; // nomor pesanan / nomor pengajuan
  customer_name: string;
  customer_phone: string | null;
  channel: "online" | "store";
  customer_email: string | null;
  product_name: string;
  type_name: string;
  weight: number;
  purity: string;
  brand_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
}

export type Receipt =
  | (ReceiptBase & {
      kind: "order";
      kode_unik: number | null;
      ongkir: number | null;
      total_bayar: number;
      payment_method: "transfer" | "cod" | "cash";
      delivery_method: "pickup" | "delivery";
      delivery_address: string | null;
      delivery_city: string | null;
      delivery_postal_code: string | null;
    })
  | (ReceiptBase & {
      kind: "buyback";
      handover_method: "store" | "shipping";
      has_certificate: boolean;
      has_packaging: boolean;
      payout_method: "cash" | "transfer" | null;
      seller_bank: string | null;
      seller_account_number: string | null;
      seller_account_holder: string | null;
    });

export async function getReceiptByToken(token: string): Promise<Receipt | null> {
  if (!RECEIPT_TOKEN_RE.test(token)) return null;

  const order = await queryOne<Receipt>(
    `SELECT 'order' AS kind, o.invoice_number AS receipt_number, o.status, o.completed_at, o.created_at,
            o.order_number AS reference, o.buyer_name AS customer_name, o.buyer_phone AS customer_phone,
            o.buyer_email AS customer_email, o.channel, p.name AS product_name, v.type_name, v.weight, v.purity,
            b.name AS brand_name, o.quantity, o.harga_beli AS unit_price, o.total_harga AS total, o.notes,
            o.kode_unik, o.ongkir, o.total_bayar, o.payment_method, o.delivery_method, o.delivery_address, o.delivery_city, o.delivery_postal_code
       FROM orders o
       JOIN product_variants v ON v.id = o.variant_id
       JOIN products p ON p.id = v.product_id
       JOIN brands b ON b.id = o.brand_id
      WHERE o.receipt_token = $1 AND o.invoice_number IS NOT NULL`,
    [token],
  );
  if (order) return order;

  return queryOne<Receipt>(
    `SELECT 'buyback' AS kind, r.receipt_number, r.status, r.completed_at, r.created_at,
            r.request_number AS reference, r.seller_name AS customer_name, r.seller_phone AS customer_phone,
            r.seller_email AS customer_email, r.channel, p.name AS product_name, v.type_name, v.weight, v.purity,
            b.name AS brand_name, r.quantity, r.harga_buyback AS unit_price, COALESCE(r.total_final, r.total_estimasi) AS total, r.notes,
            r.handover_method, r.has_certificate, r.has_packaging,
            r.payout_method, r.seller_bank, r.seller_account_number, r.seller_account_holder
       FROM buyback_requests r
       JOIN product_variants v ON v.id = r.variant_id
       JOIN products p ON p.id = v.product_id
       JOIN brands b ON b.id = r.brand_id
      WHERE r.receipt_token = $1 AND r.receipt_number IS NOT NULL`,
    [token],
  );
}
