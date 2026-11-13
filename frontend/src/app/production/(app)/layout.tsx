"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Power } from "lucide-react";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { clearAuthSession, hasValidProductionSession } from "@/lib/portalSession";
import { productionApi, storedProductionDepartments, type ProductionDepartment } from "@/lib/productionApi";

function signedInProductionName() {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const decoded = jwtDecode<{ firstName?: string; lastName?: string; email?: string }>(token);
      const name = [decoded.firstName, decoded.lastName].filter(Boolean).join(" ").trim();
      if (name) return name;
      if (decoded.email) return decoded.email;
    } catch {
      /* use the stored email */
    }
  }
  return localStorage.getItem("userEmail") || "";
}

function formatProductionClock(date: Date) {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

const LINKS = [
  { href: "/production", name: "Dashboard" },
  { href: "/production/zrs", name: "Reactor Area" },
  { href: "/production/lms", name: "Liquid (LMS)" },
  { href: "/production/drymix", name: "Drymix" },
  { href: "/production/bfs", name: "BFS Packing" },
  { href: "/production/dpr", name: "Daily report" },
  { href: "/production/trace", name: "Traceability" },
  { href: "/production/reports", name: "Management reports" },
  { href: "/production/requirements", name: "SRS" },
];

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [departments, setDepartments] = useState<ProductionDepartment[]>(["zrs", "lms", "drymix", "bfs"]);
  const [userName, setUserName] = useState("");
  const [now, setNow] = useState(() => new Date());
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasValidProductionSession()) {
      clearAuthSession();
      const next = `${window.location.pathname}${window.location.search || ""}`;
      router.replace(`/production/login?next=${encodeURIComponent(next.startsWith("/production") ? next : "/production")}`);
      return;
    }
    setDepartments(storedProductionDepartments());
    setUserName(signedInProductionName());
    setReady(true);
    productionApi
      .me()
      .then((res) => {
        const nextDepartments = res.data?.departments || [];
        if (nextDepartments.length) {
          localStorage.setItem("productionDepartments", JSON.stringify(nextDepartments));
          setDepartments(nextDepartments);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Production access denied")) {
          clearAuthSession();
          router.replace("/production/login");
        }
      });
  }, [pathname, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const navClass = (href: string) => {
    const active = href === "/production" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return [
      "flex items-center rounded-lg px-3 py-2 text-sm",
      active ? "bg-blue-600 text-white" : "text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-slate-800",
    ].join(" ");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <p className="text-sm text-blue-700 dark:text-blue-200">Loading production...</p>
      </div>
    );
  }

  const logout = () => {
    clearAuthSession();
    window.location.href = "/production/login";
  };

  const nav = (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col items-center border-b border-blue-100 p-5 text-center dark:border-slate-800">
        <Image src="/images/logo/logo.png" alt="Ressichem" width={160} height={64} className="h-16 w-auto object-contain" priority />
        <h1 className="mt-3 text-sm font-bold tracking-wide text-blue-800 dark:text-blue-100">PRODUCTION SYSTEM</h1>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {LINKS.filter((link) => link.href !== "/production/drymix" || departments.includes("drymix")).map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setSidebarOpen(false)} className={navClass(link.href)}>
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="border-t border-blue-100 p-4 dark:border-slate-800">
        <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 dark:border-slate-600 dark:text-blue-200">
          <Power className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_#eff6ff_0%,_#ffffff_55%)] dark:bg-slate-950 lg:flex-row">
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-900/55" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex h-dvh w-[min(18rem,86vw)] flex-col overflow-hidden border-r border-blue-100 bg-white dark:border-slate-800 dark:bg-slate-900">
            {nav}
          </aside>
        </div>
      ) : null}
      <aside className="relative hidden h-full w-72 shrink-0 flex-col overflow-hidden border-r border-blue-100 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        {nav}
      </aside>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-blue-100 bg-white/85 px-3 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              ☰
            </button>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-50">Production</p>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-blue-950 dark:text-blue-50">{userName || "Signed in"}</p>
              <p className="text-xs tabular-nums text-blue-700 dark:text-blue-200">{formatProductionClock(now)}</p>
            </div>
            <ThemeToggleSwitch />
          </div>
        </header>
        <main className="production-print-main min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">{children}</main>
        <style jsx global>{`
          @media print {
            aside, header, .no-print { display: none !important; }
            .production-print-main { overflow: visible !important; padding: 0 !important; }
            body { background: white !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
