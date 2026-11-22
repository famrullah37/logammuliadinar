import { NextRequest, NextResponse } from "next/server";
import { BusinessError, withTransaction } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addAutoCash, changeStock } from "@/lib/ledger";
import { UUID_RE } from "@/lib/queries";

type Body = { mode?: "set" | "adjust" | "purchase" | "untrack"; value?: unknown; unit_cost?: unknown; note?: unknown };

/**
 * Admin: ubah stok satu baris harga (brand × pecahan).
 * - purchase: stok masuk dari pusat (jumlah + harga beli per keping) → lot FIFO baru + kas keluar otomatis
 * - set: tetapkan jumlah stok (stock opname / mulai melacak); selisih + jadi lot, selisih − diambil FIFO
 * - adjust: tambah/kurangi (±); tambah jadi lot, kurang diambil FIFO
 * - untrack: berhenti melacak stok (tidak dibatasi)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Body;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  const value = Number(body.value);
  const hasCost = body.unit_cost !== undefined && body.unit_cost !== null && body.unit_cost !== "";
  const unitCost = hasCost ? Number(body.unit_cost) : undefined;

  if (body.mode !== "untrack" && (!Number.isInteger(value) || Math.abs(value) > 1_000_000)) {
    return NextResponse.json({ error: "Jumlah harus bilangan bulat" }, { status: 400 });
  }
  if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 1e12)) {
    return NextResponse.json({ error: "Harga modal tidak valid" }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (tx) => {
      const row = await tx.queryOne<{ id: string; stock: number | null; label: string }>(
        `SELECT pr.id, pr.stock, b.name || ' ' || p.name || ' ' || v.type_name AS label
           FROM prices pr JOIN brands b ON b.id = pr.brand_id
           JOIN product_variants v ON v.id = pr.variant_id JOIN products p ON p.id = v.product_id
          WHERE pr.id = $1 FOR UPDATE OF pr`,
        [id],
      );
      if (!row) throw new BusinessError("Tidak ditemukan", 404);
      const tracked = { id: row.id, stock: row.stock };

      switch (body.mode) {
        case "untrack":
          await tx.query("UPDATE prices SET stock = NULL WHERE id = $1", [id]);
          await tx.query("UPDATE stock_lots SET qty_remaining = 0 WHERE price_id = $1 AND qty_remaining > 0", [id]);
          return { stock: null };

        case "purchase": {
          if (value <= 0) throw new BusinessError("Jumlah stok masuk harus lebih dari 0", 400);
          if (unitCost === undefined || unitCost <= 0) throw new BusinessError("Harga beli dari pusat per keping wajib diisi", 400);
          if (tracked.stock === null) {
            await tx.query("UPDATE prices SET stock = 0 WHERE id = $1", [id]); // mulai dilacak
            tracked.stock = 0;
          }
          const stock = await changeStock(tx, tracked, value, "purchase", null, note, unitCost);
          await addAutoCash(
            tx, "out", value * unitCost, "pembelian_stok",
            `Pembelian dari pusat: ${row.label} × ${value} @ ${unitCost.toLocaleString("id-ID")}${note ? ` (${note})` : ""}`,
            `STOK-${id.slice(0, 8)}`,
          );
          return { stock };
        }

        case "set": {
          if (value < 0) throw new BusinessError("Stok tidak boleh negatif", 400);
          if (tracked.stock === null) {
            await tx.query("UPDATE prices SET stock = 0 WHERE id = $1", [id]);
            tracked.stock = 0;
          }
          const diff = value - tracked.stock;
          if (diff === 0) return { stock: value };
          return { stock: await changeStock(tx, tracked, diff, "set", null, note ?? "Set stok", unitCost) };
        }

        case "adjust": {
          if (tracked.stock === null) throw new BusinessError("Stok belum dilacak. Tetapkan jumlah stok terlebih dahulu.", 400);
          if (value === 0) throw new BusinessError("Jumlah penyesuaian tidak boleh 0", 400);
          return { stock: await changeStock(tx, tracked, value, "adjust", null, note, unitCost) };
        }

        default:
          throw new BusinessError("Mode tidak valid", 400);
      }
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BusinessError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("PATCH /api/admin/stock/[id]", err);
    return NextResponse.json({ error: "Gagal mengubah stok" }, { status: 500 });
  }
}
