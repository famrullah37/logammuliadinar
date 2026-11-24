import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// Pengguna panel admin yang sedang login (untuk menu & tampilan sesuai role).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  return NextResponse.json(user);
}
