"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Role = "admin" | "kasir";
export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", kasir: "Kasir" };

// Satu permintaan /api/auth/me per halaman, dipakai bersama semua komponen.
let cached: Promise<Me | null> | null = null;
const load = () => (cached ??= api<Me>("/api/auth/me").catch(() => null));

/** Pengguna yang sedang login (null selama memuat atau bila belum login). */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let ignore = false;
    load().then((m) => { if (!ignore) setMe(m); });
    return () => { ignore = true; };
  }, []);
  return me;
}

/** Lupakan data pengguna (dipanggil saat logout). */
export const resetMe = () => { cached = null; };
