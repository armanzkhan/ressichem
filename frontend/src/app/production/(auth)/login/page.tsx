"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { clearAuthSession, hasValidProductionSession, isPortalUserType } from "@/lib/portalSession";

function ProductionLoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasValidProductionSession()) {
      const next = searchParams?.get("next");
      const safeNext = next && next.startsWith("/production") && !next.startsWith("/production/login") ? next : "/production";
      window.location.replace(safeNext);
      return;
    }
    const userType = localStorage.getItem("userType");
    if (isPortalUserType(userType)) return;
    if (localStorage.getItem("token")) clearAuthSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/production/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, company_id: "RESSICHEM" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) {
        setMessage(data?.message || "Production login failed");
        return;
      }
      localStorage.setItem("token", data.token);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userType", "production");
      localStorage.setItem("userRole", data.user?.role || "production");
      localStorage.setItem("company_id", data.user?.company_id || "RESSICHEM");
      if (data.user?._id) localStorage.setItem("userId", data.user._id);
      if (data.user?.email) localStorage.setItem("userEmail", data.user.email);
      const departments = Array.isArray(data.user?.departments) ? data.user.departments : ["zrs", "lms", "bfs"];
      localStorage.setItem("productionDepartments", JSON.stringify(departments));
      const next = searchParams?.get("next");
      const safeNext = next && next.startsWith("/production") && !next.startsWith("/production/login") ? next : "/production";
      window.location.replace(safeNext);
    } catch {
      setMessage("Production login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 p-4 dark:bg-slate-950">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggleSwitch />
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-blue-100 bg-white/90 p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex justify-center">
          <Image src="/images/logo/logo.png" alt="Ressichem" width={200} height={48} className="h-12 w-auto object-contain" priority />
        </div>
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-blue-900 dark:text-blue-50">Production Site Login</h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">Reactor Area</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">LMS</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium dark:border dark:border-slate-600 dark:bg-slate-800">BFS</span>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-sm font-medium text-blue-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-sm font-medium text-blue-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          {message ? <p className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{message}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 p-4 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in to Production Site"}
          </button>
          <p className="text-center text-sm text-blue-800 dark:text-blue-200">
            <Link href="/production/signup" className="font-semibold text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
          <p className="text-center text-xs">
            <Link href="/auth/sign-in" className="font-semibold text-blue-600 hover:underline">
              Back to main sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ProductionLoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-100 dark:bg-slate-950" />}>
      <ProductionLoginContent />
    </React.Suspense>
  );
}
