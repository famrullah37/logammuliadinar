"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PasswordInput from "@/components/PasswordInput";
import { api } from "@/lib/api";
import { ROLE_LABEL, type Role } from "./useMe";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
}

const inputCls =
  "mt-1 w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm focus:outline-none focus:border-[#1c424f]";
const labelCls = "block text-xs font-semibold text-gray-600";
const EMPTY = { email: "", name: "", role: "kasir" as Role, password: "" };

/** Admin: tambah pengguna, ubah role, nonaktifkan, reset password. */
export default function UserManager({ meId }: { meId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [resetFor, setResetFor] = useState<{ id: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    api<User[]>("/api/admin/users")
      .then((u) => { if (!ignore) setUsers(u); })
      .catch((err) => { if (!ignore) toast.error(err instanceof Error ? err.message : "Gagal memuat pengguna"); });
    return () => { ignore = true; };
  }, [reloadKey]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      setBusy(true);
      await fn();
      toast.success(ok);
      setReloadKey((k) => k + 1);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await run(() => api("/api/admin/users", { method: "POST", body: form }), `Pengguna ${form.email} ditambahkan`)) {
      setForm(EMPTY);
    }
  };
  const patch = (u: User, body: Record<string, unknown>, ok: string) =>
    run(() => api(`/api/admin/users/${u.id}`, { method: "PATCH", body }), ok);

  const toggleActive = (u: User) => {
    if (u.active && !window.confirm(`Nonaktifkan ${u.email}? Pengguna ini langsung keluar dan tidak bisa login.`)) return;
    patch(u, { active: !u.active }, u.active ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan");
  };
  const changeRole = (u: User, role: Role) => {
    if (!window.confirm(`Ubah role ${u.email} menjadi ${ROLE_LABEL[role]}?`)) return;
    patch(u, { role }, "Role diubah");
  };
  const resetPassword = async (u: User) => {
    if (!resetFor || resetFor.password.length < 8) { toast.error("Password minimal 8 karakter"); return; }
    if (await patch(u, { password: resetFor.password }, `Password ${u.email} direset. Sesi lamanya berakhir.`)) setResetFor(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-[#908974]/30 p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Pengguna</h2>
        <p className="text-sm text-gray-500">
          Admin: semua menu. Kasir: Transaksi Toko (harga hari ini), Pesanan, Buyback, lihat Stok, dan Akun.
        </p>
      </div>

      <ul className="divide-y divide-[#f2ece0]">
        {users.map((u) => (
          <li key={u.id} className="py-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`font-semibold ${u.active ? "text-gray-900" : "text-gray-400 line-through"}`}>
                  {u.name || u.email}
                  {u.id === meId && <span className="ml-2 text-xs font-normal text-gray-400">(Anda)</span>}
                </p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role === "admin" ? "bg-[#1c424f]/10 text-[#1c424f]" : "bg-[#ce9233]/15 text-[#b87f2d]"}`}>
                  {ROLE_LABEL[u.role]}
                </span>
                {!u.active && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Nonaktif</span>}
                {u.id !== meId && (
                  <>
                    <button type="button" disabled={busy} onClick={() => changeRole(u, u.role === "admin" ? "kasir" : "admin")}
                      className="rounded-lg border border-[#908974]/40 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-[#f7f4ed] disabled:opacity-50">
                      Jadikan {u.role === "admin" ? "kasir" : "admin"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setResetFor(resetFor?.id === u.id ? null : { id: u.id, password: "" })}
                      className="rounded-lg border border-[#908974]/40 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-[#f7f4ed] disabled:opacity-50">
                      Reset password
                    </button>
                    <button type="button" disabled={busy} onClick={() => toggleActive(u)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${u.active ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}>
                      {u.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {resetFor?.id === u.id && (
              <div className="flex flex-wrap items-end gap-2 rounded-xl bg-[#f7f4ed] p-3">
                <label className={`${labelCls} min-w-[220px] flex-1`}>
                  Password baru untuk {u.email}
                  <div className="mt-1">
                    <PasswordInput minLength={8} maxLength={200} autoComplete="new-password" value={resetFor.password}
                      onChange={(e) => setResetFor({ id: u.id, password: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm" />
                  </div>
                </label>
                <button type="button" disabled={busy} onClick={() => resetPassword(u)}
                  className="rounded-lg bg-[#1c424f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15323c] disabled:opacity-50">
                  Simpan
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="space-y-3 border-t border-[#f2ece0] pt-4">
        <h3 className="text-sm font-bold text-gray-900">Tambah pengguna</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelCls}>
            Email (untuk login)
            <input type="email" required maxLength={254} value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          </label>
          <label className={labelCls}>
            Nama <span className="font-normal text-gray-400">(opsional)</span>
            <input maxLength={120} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </label>
          <label className={labelCls}>
            Role
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className={labelCls}>
            Password awal <span className="font-normal text-gray-400">(minimal 8, bisa diganti pengguna di menu Akun)</span>
            <div className="mt-1">
              <PasswordInput required minLength={8} maxLength={200} autoComplete="new-password" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#908974]/40 rounded-lg bg-white text-sm" />
            </div>
          </label>
        </div>
        <button type="submit" disabled={busy}
          className="rounded-lg bg-[#1c424f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15323c] disabled:opacity-50">
          Tambah pengguna
        </button>
      </form>
    </section>
  );
}
