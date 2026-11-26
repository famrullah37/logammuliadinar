import { NextRequest, NextResponse } from "next/server";
import { BusinessError, queryOne, withTransaction } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { UUID_RE } from "@/lib/queries";

interface Item {
  id?: unknown;
  harga_beli?: unknown;
  harga_buyback?: unknown;
}

const validPrice = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1e12;

/**
 * Admin: perbarui harga harian (harga beli & buyback) banyak baris sekaligus dalam satu transaksi.
 * Kolom updated_at diisi otomatis oleh trigger database bila harga berubah.
 * { confirm: true } = harga hari ini sama dengan sebelumnya: semua harga ditandai dikonfirmasi
 * (updated_at = sekarang) tanpa mengubah angkanya.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { items?: Item[]; confirm?: unknown };
  if (body.confirm === true) {
    try {
      const row = await queryOne<{ n: number }>(
        "WITH u AS (UPDATE prices SET updated_at = now() RETURNING 1) SELECT count(*)::int AS n FROM u",
      );
      return NextResponse.json({ success: true, confirmed: row?.n ?? 0 });
    } catch (err) {
      console.error("POST /api/admin/daily-prices (confirm)", err);
      return NextResponse.json({ error: "Gagal mengonfirmasi harga" }, { status: 500 });
    }
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > 500) {
    return NextResponse.json({ error: "Tidak ada perubahan harga" }, { status: 400 });
  }

  const parsed: { id: string; beli: number; buyback: number }[] = [];
  for (const it of items) {
    const beli = Number(it.harga_beli);
    const buyback = Number(it.harga_buyback);
    if (typeof it.id !== "string" || !UUID_RE.test(it.id) || !validPrice(beli) || beli <= 0 || !validPrice(buyback)) {
      return NextResponse.json({ error: "Data harga tidak valid" }, { status: 400 });
    }
    parsed.push({ id: it.id, beli, buyback });
  }

  try {
    const updated = await withTransaction(async (tx) => {
      let count = 0;
      for (const p of parsed) {
        const row = await tx.queryOne("UPDATE prices SET harga_beli = $1, harga_buyback = $2 WHERE id = $3 RETURNING id", [p.beli, p.buyback, p.id]);
        if (!row) throw new BusinessError("Sebagian harga tidak ditemukan (mungkin sudah dihapus). Muat ulang halaman.", 404);
        count++;
      }
      return count;
    });
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("POST /api/admin/daily-prices", err);
    return NextResponse.json({ error: "Gagal menyimpan harga" }, { status: 500 });
  }
}
