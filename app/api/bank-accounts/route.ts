import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Publik: rekening tujuan transfer toko (dikelola admin).
export async function GET() {
  try {
    const rows = await query("SELECT bank, account_number, holder FROM bank_accounts ORDER BY created_at");
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/bank-accounts", err);
    return NextResponse.json({ error: "Gagal memuat rekening" }, { status: 500 });
  }
}
