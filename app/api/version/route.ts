import { NextResponse } from "next/server";
import { APP_COMMIT, APP_VERSION } from "@/lib/version";

// Publik: versi aplikasi yang sedang berjalan (untuk cek setelah deploy).
export function GET() {
  return NextResponse.json({ version: APP_VERSION, commit: APP_COMMIT || null });
}
