import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MANUAL_CASH_CATEGORIES } from "@/lib/ledger";
import { parsePeriod, todayJakarta } from "@/lib/period";

// Admin: buku kas per periode (?from=YYYY-MM-DD&to=YYYY-MM-DD) dengan saldo awal & akhir.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const period = parsePeriod(req.nextUrl.searchParams);
  if (!period) return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });

  try {
    const [opening, totals, entries] = await Promise.all([
      queryOne<{ saldo: number }>(
        `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS saldo
           FROM cash_entries WHERE entry_date < $1`,
        [period.from],
      ),
      queryOne<{ masuk: number; keluar: number }>(
        `SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0) AS masuk,
                COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS keluar
           FROM cash_entries WHERE entry_date BETWEEN $1 AND $2`,
        [period.from, period.to],
      ),
      query(
        `SELECT id, to_char(entry_date, 'YYYY-MM-DD') AS entry_date, direction, amount, category, description, ref, source, created_at
           FROM cash_entries WHERE entry_date BETWEEN $1 AND $2
          ORDER BY entry_date DESC, created_at DESC`,
        [period.from, period.to],
      ),
    ]);
    const saldoAwal = opening?.saldo ?? 0;
    const masuk = totals?.masuk ?? 0;
    const keluar = totals?.keluar ?? 0;
    return NextResponse.json({ ...period, saldo_awal: saldoAwal, masuk, keluar, saldo_akhir: saldoAwal + masuk - keluar, entries });
  } catch (err) {
    console.error("GET /api/admin/cash", err);
    return NextResponse.json({ error: "Gagal memuat kas" }, { status: 500 });
  }
}

// Admin: catat entri kas manual (modal, biaya operasional, dll).
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    entry_date?: string; direction?: string; category?: string; amount?: unknown; description?: string;
  };
  const direction = body.direction === "in" || body.direction === "out" ? body.direction : null;
  if (!direction) return NextResponse.json({ error: "Jenis kas tidak valid" }, { status: 400 });
  if (!body.category || !(body.category in MANUAL_CASH_CATEGORIES[direction])) {
    return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
    return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 });
  }
  const date = body.entry_date || todayJakarta();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date > todayJakarta()) {
    return NextResponse.json({ error: "Tanggal tidak valid (tidak boleh di masa depan)" }, { status: 400 });
  }
  const description = body.description?.trim().slice(0, 300) || null;

  try {
    const row = await queryOne(
      `INSERT INTO cash_entries (entry_date, direction, amount, category, description, source)
       VALUES ($1, $2, $3, $4, $5, 'manual') RETURNING id`,
      [date, direction, amount, body.category, description],
    );
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/cash", err);
    return NextResponse.json({ error: "Gagal menyimpan kas" }, { status: 500 });
  }
}
