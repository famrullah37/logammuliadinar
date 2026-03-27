"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setError("✓ Registrasi berhasil! Silahkan cek email untuk verifikasi.");
        setEmail("");
        setPassword("");
      } else {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/dashboard");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">₯</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl border-2 border-yellow-200 p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Logam Mulia Dinar
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {isSignUp ? "Buat akun baru" : "Masuk ke akun Anda"}
          </p>

          {error && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                error.includes("✓")
                  ? "bg-green-100 text-green-800 border-2 border-green-300"
                  : "bg-red-100 text-red-800 border-2 border-red-300"
              }`}
            >
              {error}
            </div>
          )}

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
                className="w-full px-4 py-3 border-2 border-yellow-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition"
                placeholder="nama@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-yellow-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 rounded-lg transition shadow-lg hover:shadow-xl disabled:shadow-none"
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

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isSignUp ? "Sudah punya akun? " : "Belum punya akun? "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setEmail("");
                  setPassword("");
                }}
                className="text-yellow-600 hover:text-yellow-700 font-bold transition"
              >
                {isSignUp ? "Masuk" : "Daftar"}
              </button>
            </p>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Demo:</strong> Gunakan email dan password apapun untuk
              test. Untuk fitur penuh, daftarkan akun resmi Anda.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-gray-600 hover:text-yellow-600 font-medium transition"
          >
            ← Kembali ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}
