"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AdminNav from "@/components/admin/AdminNav";
import PasswordInput from "@/components/PasswordInput";
import UserManager from "@/components/admin/UserManager";
import { ROLE_LABEL, useMe } from "@/components/admin/useMe";
import { api, ApiError } from "@/lib/api";

const inputCls =
  "w-full px-4 py-3 border border-[#908974]/40 rounded-xl bg-white focus:outline-none focus:border-[#1c424f] focus:ring-2 focus:ring-[#1c424f]/20";

export default function AdminAccountPage() {
  const router = useRouter();
  const me = useMe();
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [saving, setSaving] = useState(false);
  const mismatch = form.again.length > 0 && form.next !== form.again;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next.length < 8) { toast.error("Password baru minimal 8 karakter"); return; }
    if (form.next !== form.again) { toast.error("Ulangi password baru belum sama"); return; }
    try {
      setSaving(true);
      await api("/api/auth/password", { method: "POST", body: { current: form.current, next: form.next } });
      toast.success("Password berhasil diganti. Perangkat lain otomatis keluar.");
      setForm({ current: "", next: "", again: "" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push("/login"); return; }
      toast.error(err instanceof Error ? err.message : "Gagal mengganti password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      <header className="bg-white border-b border-[#908974]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Akun <span className="text-[#1c424f]">& Pengguna</span></h1>
          <p className="text-sm text-gray-500">
            {me ? <>{me.email} · {ROLE_LABEL[me.role]}</> : "Ganti password login."}
          </p>
        </div>
      </header>
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-[28rem_1fr] lg:items-start">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#908974]/30 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Ganti password</h2>
          <label className="block text-sm font-semibold text-gray-700">
            Password lama
            <div className="mt-1.5">
              <PasswordInput required autoComplete="current-password" maxLength={200} value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} className={inputCls} />
            </div>
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Password baru <span className="font-normal text-gray-400">(minimal 8 karakter)</span>
            <div className="mt-1.5">
              <PasswordInput required minLength={8} maxLength={200} autoComplete="new-password" value={form.next}
                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))} className={inputCls} />
            </div>
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Ulangi password baru
            <div className="mt-1.5">
              <PasswordInput required minLength={8} maxLength={200} autoComplete="new-password" value={form.again}
                onChange={(e) => setForm((f) => ({ ...f, again: e.target.value }))} className={inputCls} />
            </div>
            {mismatch && <span className="mt-1 block text-xs font-normal text-red-600">Belum sama dengan password baru</span>}
          </label>
          <button type="submit" disabled={saving || mismatch}
            className="w-full py-3 rounded-xl font-semibold bg-[#1c424f] hover:bg-[#15323c] text-white disabled:opacity-60">
            {saving ? "Menyimpan..." : "Simpan password baru"}
          </button>
          <p className="text-xs text-gray-500">
            Setelah diganti, sesi login di perangkat lain otomatis berakhir. Perangkat ini tetap masuk.
          </p>
        </form>
        {me?.role === "admin" && <UserManager meId={me.id} />}
      </main>
    </div>
  );
}
