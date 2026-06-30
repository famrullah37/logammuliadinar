import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CreateOrderPayload } from "@/lib/types";

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LMD-${date}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateOrderPayload = await req.json();

    // validate required fields
    const { variant_id, brand_id, quantity, buyer_name, buyer_phone, delivery_method, payment_method } = body;
    if (!variant_id || !brand_id || !quantity || !buyer_name || !buyer_phone || !delivery_method || !payment_method) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }
    if (!["pickup", "delivery"].includes(delivery_method)) {
      return NextResponse.json({ error: "Metode pengiriman tidak valid" }, { status: 400 });
    }
    if (!["transfer", "cod"].includes(payment_method)) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 });
    }
    if (delivery_method === "delivery" && !body.delivery_address) {
      return NextResponse.json({ error: "Alamat pengiriman wajib diisi" }, { status: 400 });
    }

    // fetch current price (snapshot)
    const { data: priceData, error: priceError } = await supabase
      .from("prices")
      .select("harga_beli")
      .eq("variant_id", variant_id)
      .eq("brand_id", brand_id)
      .single();

    if (priceError || !priceData) {
      return NextResponse.json({ error: "Harga tidak ditemukan untuk kombinasi produk dan brand ini" }, { status: 404 });
    }

    const harga_beli: number = (priceData as { harga_beli: number }).harga_beli;
    const total_harga = harga_beli * quantity;
    const order_number = generateOrderNumber();

    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert([{
        order_number,
        variant_id,
        brand_id,
        quantity,
        harga_beli,
        total_harga,
        buyer_name: buyer_name.trim(),
        buyer_phone: buyer_phone.trim(),
        buyer_email: body.buyer_email?.trim() || null,
        delivery_method,
        delivery_address: body.delivery_address?.trim() || null,
        delivery_city: body.delivery_city?.trim() || null,
        delivery_postal_code: body.delivery_postal_code?.trim() || null,
        payment_method,
        notes: body.notes?.trim() || null,
        status: "pending",
      }])
      .select("id,order_number,total_harga,status")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
