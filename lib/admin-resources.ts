import "server-only";
import { NextResponse } from "next/server";
import { PG, pgErrorCode } from "./db";
import { UUID_RE } from "./queries";

type Field =
  | { name: string; kind: "text"; optional?: boolean; maxLength?: number }
  | { name: string; kind: "image" } // opsional: path lokal "/..." atau URL https
  | { name: string; kind: "uuid" }
  | { name: string; kind: "number"; min: number; exclusiveMin?: boolean };

interface Resource {
  table: string;
  fields: Field[];
}

// Whitelist tabel & kolom yang boleh diubah lewat /api/admin/[resource].
export const RESOURCES: Record<string, Resource> = {
  brands: { table: "brands", fields: [{ name: "name", kind: "text" }] },
  products: { table: "products", fields: [{ name: "name", kind: "text" }] },
  variants: {
    table: "product_variants",
    fields: [
      { name: "product_id", kind: "uuid" },
      { name: "type_name", kind: "text" },
      { name: "weight", kind: "number", min: 0, exclusiveMin: true },
      { name: "purity", kind: "text", maxLength: 20 },
      { name: "image_url", kind: "image" },
      { name: "description", kind: "text", optional: true, maxLength: 5000 },
    ],
  },
  prices: {
    table: "prices",
    fields: [
      { name: "brand_id", kind: "uuid" },
      { name: "variant_id", kind: "uuid" },
      { name: "harga_beli", kind: "number", min: 0 },
      { name: "harga_buyback", kind: "number", min: 0 },
      { name: "image_url", kind: "image" },
      { name: "description", kind: "text", optional: true, maxLength: 5000 },
    ],
  },
  // Rekening tujuan transfer toko (tampil ke pembeli).
  bank_accounts: {
    table: "bank_accounts",
    fields: [
      { name: "bank", kind: "text", maxLength: 50 },
      { name: "account_number", kind: "text", maxLength: 30 },
      { name: "holder", kind: "text", maxLength: 120 },
    ],
  },
};

/** Ambil konfigurasi resource dari whitelist; abaikan properti bawaan objek (constructor, __proto__, ...). */
export const getResource = (key: string): Resource | undefined =>
  Object.hasOwn(RESOURCES, key) ? RESOURCES[key] : undefined;

/** Path lokal di /public (tanpa ".." atau "//") atau URL https. */
export function isSafeImageUrl(v: string): boolean {
  if (v.length > 500) return false;
  if (v.startsWith("/")) return !v.startsWith("//") && !v.includes("..") && !/[\\\s]/.test(v);
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/** Validasi body sesuai field resource. Field wajib kecuali ditandai optional / image. */
export function parseBody(
  resource: Resource,
  body: Record<string, unknown>,
): { columns: string[]; values: unknown[] } | { error: string } {
  const columns: string[] = [];
  const values: unknown[] = [];
  for (const f of resource.fields) {
    const raw = body[f.name];
    if (f.kind === "text") {
      const v = typeof raw === "string" ? raw.trim() : "";
      const max = f.maxLength ?? 200;
      if (!v) {
        if (!f.optional) return { error: `${f.name} wajib diisi` };
        values.push(null);
      } else {
        if (v.length > max) return { error: `${f.name} maksimal ${max} karakter` };
        values.push(v);
      }
    } else if (f.kind === "image") {
      const v = typeof raw === "string" ? raw.trim() : "";
      if (!v) {
        values.push(null);
      } else if (!isSafeImageUrl(v)) {
        return { error: "Gambar harus path lokal (mis. /1-DINAR.png) atau URL https://" };
      } else {
        values.push(v);
      }
    } else if (f.kind === "uuid") {
      if (typeof raw !== "string" || !UUID_RE.test(raw)) return { error: `${f.name} tidak valid` };
      values.push(raw);
    } else {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n) || n > 1e12 || n < f.min || (f.exclusiveMin && n === f.min)) {
        return { error: `${f.name} harus angka ${f.exclusiveMin ? ">" : "≥"} ${f.min}` };
      }
      values.push(n);
    }
    columns.push(f.name);
  }
  return { columns, values };
}

/** Ubah error Postgres umum menjadi pesan yang bisa dibaca admin. */
export function dbErrorResponse(err: unknown, context: string): NextResponse {
  const code = pgErrorCode(err);
  if (code === PG.UNIQUE_VIOLATION) {
    return NextResponse.json({ error: "Data sudah ada (duplikat)" }, { status: 409 });
  }
  if (code === PG.FOREIGN_KEY_VIOLATION) {
    return NextResponse.json(
      { error: "Data masih dipakai oleh data lain (mis. pesanan), atau referensinya tidak ada" },
      { status: 409 },
    );
  }
  console.error(context, err);
  return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
}
