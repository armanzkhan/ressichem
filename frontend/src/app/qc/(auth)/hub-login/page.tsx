"use client";

import React, { useEffect, useState } from "react";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  clearAuthSession,
  getStoredQcToken,
  hasQcPortalSession,
  hasValidQcSession,
  isPortalUserType,
  persistQcSession,
  repairQcSessionIfNeeded,
} from "@/lib/portalSession";

function QCHubLoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    repairQcSessionIfNeeded();
    if (hasQcPortalSession() || hasValidQcSession()) {
      const next = searchParams?.get("next");
      const safeNext = next && next.startsWith("/qc/hub") ? next : "/qc/hub";
      window.location.replace(safeNext);
      return;
    }
    const userType = localStorage.getItem("userType");
    if (userType?.trim().toLowerCase() === "qc") return;
    if (isPortalUserType(userType) && userType?.trim().toLowerCase() === "procurement") return;
    if (getStoredQcToken() || localStorage.getItem("qcPortal")) return;
    if (localStorage.getItem("token")) clearAuthSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/qc/auth/hub-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.message || "QC Hub login failed");
        return;
      }
      if (!data?.token) {
        setMessage("Login succeeded but no session token was returned. Please try again.");
        return;
      }

      try {
        persistQcSession({
          token: data.token,
          refreshToken: data.refreshToken,
          portal: "hub",
          user: data.user,
        });
      } catch {
        setMessage("Could not save login session in this browser. Check storage/cookie settings.");
        return;
      }

      if (!hasQcPortalSession()) {
        setMessage("Login saved but session was blocked. Allow site data/storage for this address.");
        return;
      }

      const next = searchParams?.get("next");
      const safeNext = next && next.startsWith("/qc/hub") ? next : "/qc/hub";
      window.location.replace(safeNext);
    } catch (err) {
      console.error("QC Hub login error:", err);
      setMessage("QC Hub login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] dark:opacity-20"></div>
      
      {/* Blue gradient orbs - subtle */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob dark:opacity-5"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 dark:opacity-5"></div>
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 dark:opacity-5"></div>

      {/* Ressichem Logo Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 dark:opacity-[0.03] pointer-events-none">
        <div className="relative w-[800px] h-[800px] max-w-[90vw] max-h-[90vh]">
          <Image
            src="/images/logo/logo.png"
            alt="Ressichem"
            fill
            className="object-contain"
            priority
            quality={100}
          />
        </div>
      </div>

      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <ThemeToggleSwitch />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/20 p-6 sm:p-8">
          {/* Logo at Top */}
          <div className="flex justify-center mb-6">
            <div className="relative h-12 w-auto">
              <Image
                src="/images/logo/logo.png"
                alt="Ressichem"
                width={200}
                height={35}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-300 mb-3">
              QC Hub Login
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-900 dark:text-blue-300 flex-wrap">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full font-medium">QC Plans</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full font-medium">Raw Data</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full font-medium">Exports</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 bg-white/80 dark:bg-gray-700/80 dark:border-gray-600 py-4 px-5 text-sm font-medium text-blue-900 dark:text-blue-300 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 dark:focus:border-blue-400 focus:outline-none hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border-2 border-gray-200 bg-white/80 dark:bg-gray-700/80 dark:border-gray-600 py-4 px-5 text-sm font-medium text-blue-900 dark:text-blue-300 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 dark:focus:border-blue-400 focus:outline-none hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {message && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800 animate-shake">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-4 text-sm font-semibold text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In to QC Hub"
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>

            <div className="text-center space-y-3 text-xs text-blue-900 dark:text-blue-300 pt-2">
              <div>
                Need QC Site?{" "}
                <Link
                  href="/qc/site-login"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                >
                  Go to QC Site Login
                </Link>
              </div>
              <div>
                New user?{" "}
                <Link href="/qc/hub-signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">
                  Create QC Hub Account
                </Link>
              </div>
              <div className="text-blue-900 dark:text-blue-300">
                Creating QC users requires QC Admin permissions. After login, open{" "}
                <Link href="/qc/users" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">
                  QC Users (Admin)
                </Link>
                .
              </div>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}

export default function QCHubLoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-gray-100 dark:bg-gray-900" />}>
      <QCHubLoginContent />
    </React.Suspense>
  );
}


