"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";
import ProductForm from "@/components/ProductForm";
import ProductList from "@/components/ProductList";
import Link from "next/link";
import Image from "next/image";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => subscription?.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f1ea] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ce9233] mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* Header */}
      <header className="bg-white border-b-4 border-[#908974] shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Image
                src="/logolmd.png"
                alt="Logam Mulia Dinar"
                width={100}
                height={45}
              />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Admin
              </h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "list"
                ? "bg-[#1c424f] text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-[#908974]/40 hover:border-[#1c424f]"
            }`}
          >
            Daftar Produk
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === "add"
                ? "bg-[#1c424f] text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-[#908974]/40 hover:border-[#1c424f]"
            }`}
          >
            Tambah Produk Baru
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-xl border-2 border-[#908974]/40 p-8">
          {activeTab === "list" ? (
            <ProductList onTabChange={() => setActiveTab("add")} />
          ) : (
            <ProductForm onSuccess={() => setActiveTab("list")} />
          )}
        </div>
      </main>
    </div>
  );
}
