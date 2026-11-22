import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PRICE_SELECT } from "@/lib/queries";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Publik: data tabel harga di landing page, termasuk link detail per brand × pecahan.
export async function GET() {
  try {
    const [rows, catalog] = await Promise.all([query<{ id: string }>(PRICE_SELECT), getCatalog()]);
    const hrefByPrice = new Map(catalog.map((e) => [e.price_id, e.href]));
    return NextResponse.json(rows.map((r) => ({ ...r, href: hrefByPrice.get(r.id) ?? null })));
  } catch (err) {
    console.error("GET /api/prices", err);
    return NextResponse.json({ error: "Gagal memuat data harga" }, { status: 500 });
  }
}
