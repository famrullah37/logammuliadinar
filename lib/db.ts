import "server-only";
import { Pool, types } from "pg";

// pg mengembalikan numeric & bigint sebagai string; ubah ke number agar
// bentuk data sama dengan yang dipakai UI (harga, berat).
types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));
types.setTypeParser(types.builtins.INT8, (v) => parseInt(v, 10));

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum di-set");
  }
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
}

function getPool(): Pool {
  if (!globalForPg.pgPool) globalForPg.pgPool = createPool();
  return globalForPg.pgPool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Kode error Postgres yang perlu ditangani khusus. */
export const PG = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  INVALID_TEXT: "22P02", // mis. uuid tidak valid
} as const;

export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

export interface Tx {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | null>;
}

/** Jalankan beberapa query dalam satu transaksi (BEGIN/COMMIT, ROLLBACK bila error). */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const tx: Tx = {
    query: async <R,>(text: string, params: unknown[] = []) => (await client.query(text, params)).rows as R[],
    queryOne: async <R,>(text: string, params: unknown[] = []) => ((await client.query(text, params)).rows[0] as R) ?? null,
  };
  try {
    await client.query("BEGIN");
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Error bisnis yang diteruskan ke klien apa adanya (mis. stok tidak cukup). */
export class BusinessError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}
