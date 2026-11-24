import "server-only";
import { BusinessError, type Tx } from "./db";
import { isValidEmail } from "./validate";
import { ROLES, type Role } from "./auth";

export const USER_SELECT = "SELECT id, email, name, role, active, created_at FROM admin_users";

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as string[]).includes(v);

export function parseEmail(raw: unknown): string {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || !isValidEmail(email)) throw new BusinessError("Email tidak valid", 400);
  return email;
}

export function parseName(raw: unknown): string | null {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length > 120) throw new BusinessError("Nama maksimal 120 karakter", 400);
  return name || null;
}

export function parsePassword(raw: unknown): string {
  const pw = typeof raw === "string" ? raw : "";
  if (pw.length < 8) throw new BusinessError("Password minimal 8 karakter", 400);
  if (pw.length > 200) throw new BusinessError("Password terlalu panjang", 400);
  return pw;
}

/** Harus selalu ada minimal satu admin aktif agar panel tidak terkunci. */
export async function assertActiveAdminRemains(tx: Tx) {
  const row = await tx.queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM admin_users WHERE role = 'admin' AND active",
  );
  if (!row || row.n < 1) throw new BusinessError("Minimal harus ada satu admin aktif", 409);
}
