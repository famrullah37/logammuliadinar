"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api<{ role: string }>("/api/auth/login", { method: "POST", body: { email, password } });
      router.push(res.role === "admin" ? "/admin" : "/admin/toko");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logolmd.png"
              alt="Logam Mulia Dinar"
              width={120}
              height={38}
            />
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl border-2 border-[#908974]/40 p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Logam Mulia Dinar
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {isSignUp ? "Buat akun baru" : "Masuk ke akun Anda"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-[#908974]/40 rounded-lg focus:outline-none focus:border-[#1c424f] focus:ring-2 focus:ring-[#1c424f]/20 transition"
                placeholder="nama@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 border-2 border-[#908974]/40 rounded-lg focus:outline-none focus:border-[#1c424f] focus:ring-2 focus:ring-[#1c424f]/20 transition"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1c424f] hover:bg-[#15323c] disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  {isSignUp ? "Membuat akun..." : "Masuk..."}
                </span>
              ) : (
                <span>{isSignUp ? "Daftar" : "Masuk"}</span>
              )}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-[#1c424f] font-medium transition"
          >
            ← Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
