"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { Power } from "lucide-react";
import {
  clearAuthSession,
  expireQcSessionAndRedirect,
  hasValidQcSession,
  repairQcSessionIfNeeded,
} from "@/lib/portalSession";

type NavItem = { name: string; href: string; icon: string };

export default function QCLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [authOk, setAuthOk] = useState(false);
  const [qcPortal, setQcPortal] = useState<"site" | "hub" | "qc">("qc");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;

    const finishAuth = () => {
      const storedPortal = (localStorage.getItem("qcPortal") || "").toLowerCase();
      const portalFromStorage = storedPortal === "site" || storedPortal === "hub" ? storedPortal : "qc";
      setQcPortal(portalFromStorage);
      sessionStorage.removeItem("qc_auth_ready");
      setAuthOk(true);

      if (portalFromStorage === "site" && pathname?.startsWith("/qc/hub")) {
        router.replace("/qc/site/results");
        return;
      }
      if (portalFromStorage === "hub" && pathname?.startsWith("/qc/site")) {
        router.replace("/qc/hub");
      }
    };

    const redirectToLogin = () => {
      setAuthOk(false);
      expireQcSessionAndRedirect(pathname || "/qc");
    };

    repairQcSessionIfNeeded();
    if (hasValidQcSession()) {
      finishAuth();
      return;
    }

    // Fresh login sets qc_auth_ready — allow storage to settle before redirecting back to login
    if (sessionStorage.getItem("qc_auth_ready") === "1") {
      const retryId = window.setTimeout(() => {
        repairQcSessionIfNeeded();
        if (hasValidQcSession()) finishAuth();
        else redirectToLogin();
      }, 150);
      return () => window.clearTimeout(retryId);
    }

    redirectToLogin();
  }, [isClient, pathname, router]);

  useEffect(() => {
    if (!isClient || !authOk) return;

    const checkSession = () => {
      repairQcSessionIfNeeded();
      if (!hasValidQcSession()) {
        setAuthOk(false);
        expireQcSessionAndRedirect(pathname || "/qc");
      }
    };

    checkSession();
    const intervalId = window.setInterval(checkSession, 15000);
    return () => window.clearInterval(intervalId);
  }, [isClient, authOk, pathname]);

  const effectivePortal = useMemo<"site" | "hub" | "qc">(() => {
    if (qcPortal !== "qc") return qcPortal;
    if (pathname?.startsWith("/qc/site")) return "site";
    if (pathname?.startsWith("/qc/hub")) return "hub";
    return "qc";
  }, [pathname, qcPortal]);

  const nav = useMemo<NavItem[]>(() => {
    const siteNav: NavItem[] = [
      { name: "Dashboard", href: "/qc/site/results", icon: "🏠" },
      { name: "QC Site - Standard Criteria", href: "/qc/site/standards", icon: "📏" },
      { name: "Resin QC", href: "/qc/site/resin", icon: "🧪" },
      { name: "Hardener QC", href: "/qc/site/hardener", icon: "⚗️" },
      { name: "LMS QC", href: "/qc/site/lms", icon: "🔬" },
      { name: "Raw Material QC", href: "/qc/site/raw-materials", icon: "🧱" },
      { name: "Packaging Material QC", href: "/qc/site/packaging-material", icon: "📦" },
      { name: "QA Bottle Filling", href: "/qc/site/qa-bottle-filling", icon: "🍾" },
      { name: "R&D Trials", href: "/qc/site/rnd-trials", icon: "🔬" },
      { name: "Predictive Analytics", href: "/qc/site/predictive-analytics", icon: "📊" },
      { name: "Reports", href: "/qc/site/reports", icon: "📈" },
      { name: "AI Assistant", href: "/qc/site/ai-assistant", icon: "🤖" },
      { name: "Power BI Export", href: "/qc/site/powerbi-export", icon: "⬇️" },
      { name: "Document Index", href: "/qc/site/document-index", icon: "📄" },
    ];

    const hubNav: NavItem[] = [
      { name: "Dashboard", href: "/qc/hub", icon: "🏠" },
      { name: "Tile Adhesive QC", href: "/qc/hub/qc/tile-adhesive", icon: "🧱" },
      { name: "Tile Grout QC", href: "/qc/hub/qc/tile-grout", icon: "🪨" },
      { name: "Premix Plaster QC", href: "/qc/hub/qc/premix-plaster", icon: "🏗️" },
      { name: "Skim Coat QC", href: "/qc/hub/qc/skim-coat", icon: "🎨" },
      { name: "Repair Mortar QC", href: "/qc/hub/qc/repair-mortar", icon: "🔧" },
      { name: "Waterproofing QC", href: "/qc/hub/qc/waterproofing", icon: "💧" },
      { name: "Crack Filler QC", href: "/qc/hub/qc/crack-filler", icon: "🩹" },
      { name: "Self Level & Sealers", href: "/qc/hub/qc/self-level-sealers", icon: "📐" },
      { name: "Raw Materials", href: "/qc/hub/raw-materials", icon: "🧱" },
      { name: "Packaging Materials", href: "/qc/hub/packaging-materials", icon: "📦" },
      { name: "Formulations", href: "/qc/hub/formulations", icon: "⚗️" },
      { name: "R&D Experiments", href: "/qc/hub/rnd-experiments", icon: "🔬" },
      { name: "Internal Audits", href: "/qc/hub/audits", icon: "📋" },
      { name: "Calibration", href: "/qc/hub/calibration", icon: "📏" },
      { name: "NCR", href: "/qc/hub/ncr", icon: "⚠️" },
      { name: "CAPA", href: "/qc/hub/capa", icon: "✅" },
      { name: "Complaints", href: "/qc/hub/complaints", icon: "📞" },
      { name: "MRM", href: "/qc/hub/mrm", icon: "📊" },
      { name: "Predictive Analytics", href: "/qc/hub/predictive-analytics", icon: "📈" },
      { name: "Reporting", href: "/qc/hub/reporting", icon: "📑" },
      { name: "Document Index", href: "/qc/hub/documents", icon: "📄" },
      { name: "QC Plan", href: "/qc/hub/plan", icon: "🗂️" },
      { name: "Raw Data Forms", href: "/qc/hub/forms", icon: "🧾" },
      { name: "Power BI Exports", href: "/qc/hub/exports", icon: "⬇️" },
    ];

    // Admin links are intentionally not shown in portal-specific sidebars
    // to keep QC Site / QC Hub experiences separated as requested.
    const adminNav: NavItem[] = [
      { name: "Dashboard", href: "/qc/admin", icon: "🏠" },
      { name: "QC Users", href: "/qc/users", icon: "👥" },
    ];

    if (effectivePortal === "site") return siteNav;
    if (effectivePortal === "hub") return hubNav;
    return [...adminNav, ...siteNav, ...hubNav];
  }, [effectivePortal]);

  const activeName = nav.find((n) => pathname === n.href)?.name || "Quality Control";

  const logout = () => {
    clearAuthSession();
    localStorage.removeItem("qcPortal");
    if (pathname?.startsWith("/qc/hub")) window.location.href = "/qc/hub-login";
    else window.location.href = "/qc/site-login";
  };

  if (!isClient || !authOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100/60 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading QC...</p>
      </div>
    );
  }

  return (
    <div className="qc-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100/60 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={[
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          !sidebarOpen ? "opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto" : "opacity-100",
          "bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl border-r border-white/30 dark:border-gray-700/50",
        ].join(" ")}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-sky-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">QC</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Quality Control</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {effectivePortal === "site" ? "QC Site Area" : effectivePortal === "hub" ? "QC Hub" : "Site Area & Hub"}
                </p>
              </div>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 px-4 py-5 space-y-2">
            {nav.map((item) => {
              const current = pathname === item.href || (item.href !== "/qc/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group",
                    current
                      ? "bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
                  ].join(" ")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Theme</span>
              <ThemeToggleSwitch />
            </div>
            <button
              onClick={logout}
              aria-label="Logout"
              title="Logout"
              className="w-full rounded-xl bg-blue-900 text-white py-3 shadow hover:bg-blue-800 flex items-center justify-center"
            >
              <Power className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={[
          "flex-1 flex flex-col min-w-0 transition-opacity duration-200",
          sidebarOpen ? "opacity-30 pointer-events-none lg:opacity-100 lg:pointer-events-auto" : "opacity-100",
        ].join(" ")}
      >
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-white/30 dark:border-gray-700/50 shadow-sm">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 text-white shadow"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                ☰
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{activeName}</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Quality Control module</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <ThemeToggleSwitch />
              </div>
              <button
                onClick={logout}
                aria-label="Logout"
                title="Logout"
                className="p-2.5 rounded-xl bg-blue-900 text-white shadow hover:bg-blue-800"
              >
                <Power className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
}


