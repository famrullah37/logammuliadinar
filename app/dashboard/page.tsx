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
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ce9233] mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ed]">
      {/* Header */}
      <header className="bg-white border-b border-[#908974]/30 shadow-sm sticky top-0 z-50">
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
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                Dashboard
                <span className="text-[#1c424f]"> Admin</span>
              </h1>
              <p className="text-sm text-gray-600">{user?.email || "Admin"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#ce9233] hover:bg-[#b87f2d] text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-sm hover:shadow-md"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Tabs */}
        <div className="inline-flex gap-2 mb-8 p-2 rounded-xl bg-white border border-[#908974]/30 shadow-sm">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-5 sm:px-6 py-2.5 rounded-lg font-semibold transition ${
              activeTab === "list"
                ? "bg-[#1c424f] text-white shadow-sm"
                : "bg-transparent text-[#1c424f] hover:bg-[#f7f4ed]"
            }`}
          >
            Daftar Produk
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-5 sm:px-6 py-2.5 rounded-lg font-semibold transition ${
              activeTab === "add"
                ? "bg-[#1c424f] text-white shadow-sm"
                : "bg-transparent text-[#1c424f] hover:bg-[#f7f4ed]"
            }`}
          >
            Tambah Produk Baru
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-md border border-[#908974]/30 p-5 sm:p-8">
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
