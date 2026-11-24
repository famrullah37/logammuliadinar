"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resetMe } from "./useMe";

/** Harus sama dengan SESSION_IDLE_SECONDS di lib/session.ts. */
const IDLE_MS = 15 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;
/** Detak ke server saat pengguna aktif, agar sesi server ikut diperpanjang. */
const HEARTBEAT_MS = 4 * 60 * 1000;
const STORAGE_KEY = "lmd:lastActivity";
const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

const now = () => Date.now();
const readShared = () => Number(localStorage.getItem(STORAGE_KEY)) || 0;

/**
 * Logout otomatis setelah 15 menit tanpa aktivitas (mouse, keyboard, sentuh) di semua tab admin.
 * Satu menit sebelumnya muncul peringatan dengan tombol "Tetap masuk".
 */
export default function IdleLogout() {
  const router = useRouter();
  const lastActivity = useRef(0);
  const lastBeat = useRef(0);
  const loggingOut = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    resetMe();
    router.replace("/login?reason=idle");
  }, [router]);

  const beat = useCallback(() => {
    lastBeat.current = now();
    // Memperpanjang cookie sesi (proxy). 401 = sesi sudah habis di server.
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => { if (r.status === 401) logout(); })
      .catch(() => undefined);
  }, [logout]);

  const markActive = useCallback(() => {
    const t = now();
    // Hemat: catat paling sering tiap 5 detik.
    if (t - lastActivity.current < 5000) return;
    lastActivity.current = t;
    localStorage.setItem(STORAGE_KEY, String(t));
    if (t - lastBeat.current > HEARTBEAT_MS) beat();
  }, [beat]);

  useEffect(() => {
    lastActivity.current = now();
    lastBeat.current = now();
    localStorage.setItem(STORAGE_KEY, String(lastActivity.current));

    for (const e of EVENTS) window.addEventListener(e, markActive, { passive: true });
    // Aktivitas di tab lain juga dihitung.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) lastActivity.current = Math.max(lastActivity.current, Number(e.newValue) || 0);
    };
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      const last = Math.max(lastActivity.current, readShared());
      const left = IDLE_MS - (now() - last);
      if (left <= 0) { logout(); return; }
      setSecondsLeft(left <= WARN_BEFORE_MS ? Math.ceil(left / 1000) : null);
    }, 1000);

    return () => {
      for (const e of EVENTS) window.removeEventListener(e, markActive);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [markActive, logout]);

  const stay = () => {
    lastActivity.current = 0; // paksa markActive mencatat
    lastBeat.current = 0; // dan langsung detak ke server
    markActive();
    setSecondsLeft(null);
  };

  if (secondsLeft === null) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <p id="idle-title" className="text-lg font-bold text-gray-900">Tidak ada aktivitas</p>
        <p id="idle-desc" className="mt-2 text-sm text-gray-600">
          Demi keamanan, Anda akan keluar otomatis dalam{" "}
          <span className="font-bold tabular-nums text-red-600">{secondsLeft} detik</span>.
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={logout}
            className="flex-1 rounded-xl border border-[#908974]/40 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#f7f4ed]">
            Keluar
          </button>
          <button type="button" onClick={stay} autoFocus
            className="flex-1 rounded-xl bg-[#1c424f] py-2.5 text-sm font-semibold text-white hover:bg-[#15323c]">
            Tetap masuk
          </button>
        </div>
      </div>
    </div>
  );
}
