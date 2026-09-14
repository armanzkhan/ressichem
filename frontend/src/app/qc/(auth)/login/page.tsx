"use client";

import React, { useState } from "react";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";

export default function QCLoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/qc/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.message || "QC login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userType", "qc");
      localStorage.setItem("userRole", "qc");

      window.location.href = "/qc/admin";
    } catch (err) {
      console.error("QC login error:", err);
      setMessage("QC login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] dark:opacity-20" />

      <div className="fixed top-4 right-4 z-50">
        <ThemeToggleSwitch />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/20 p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-sky-600 rounded-2xl blur-lg opacity-30" />
                <div className="relative w-16 h-16 bg-gradient-to-r from-emerald-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 3a3.75 3.75 0 00-3.75 3.75v.75A3.75 3.75 0 002.25 11.25v5.25A3.75 3.75 0 006 20.25h12A3.75 3.75 0 0021.75 16.5v-5.25A3.75 3.75 0 0018 7.5v-.75A3.75 3.75 0 0014.25 3h-4.5z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
              Quality Control Login
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">QC Site Area &amp; QC Hub access</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm py-4 px-4 text-sm font-medium text-gray-900 placeholder-gray-500 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-emerald-400 dark:focus:bg-gray-700"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm py-4 px-4 text-sm font-medium text-gray-900 placeholder-gray-500 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-emerald-400 dark:focus:bg-gray-700"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {message && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800 shadow-sm">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 p-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                If you see “QC access denied”, ask admin to assign permission: <span className="font-mono">qc.access</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


