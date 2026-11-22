import { NextRequest, NextResponse } from "next/server";
import { getVariantPageData } from "@/lib/catalog";

// Publik: detail varian + harga per brand (dipakai halaman checkout).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await getVariantPageData(id);
    if (!data) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/variants/[id]", err);
    return NextResponse.json({ error: "Gagal memuat produk" }, { status: 500 });
  }
}
