"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { ProcurementNotificationBell } from "@/components/procurement/ProcurementNotificationBell";
import { Power } from "lucide-react";
import { clearAuthSession, hasValidProcurementSession } from "@/lib/portalSession";
import { isProcurementAdmin } from "@/lib/procurementAccess";
import {
  DASHBOARD_LINK,
  DEPARTMENT_APPROVERS_LINK,
  findProcurementBreadcrumbs,
  PROCUREMENT_NAV_GROUPS,
  USERS_LINK,
  type NavGroup,
} from "@/lib/procurementNav";
import {
  accessLevelFromRole,
  canAccessModule,
  defaultProcurementLandingPath,
  getProcurementSessionArea,
  procurementSectionsForUser,
  setProcurementSessionArea,
} from "@/lib/procurementRoles";
import type { TradeSection } from "@/lib/procurementScope";

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [authOk, setAuthOk] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [procurementDepartment, setProcurementDepartment] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    local: true,
    import: false,
    export: false,
  });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    if (hasValidProcurementSession()) {
      if (localStorage.getItem("procurementIsAdmin") !== "1" && isProcurementAdmin()) {
        localStorage.setItem("procurementIsAdmin", "1");
      }
      setAuthOk(true);
      setUserRole(localStorage.getItem("userRole") || "");
      setProcurementDepartment(getProcurementSessionArea());
      return;
    }
    clearAuthSession();
    setAuthOk(false);
    const nextPath =
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search || ""}` : pathname || "/procurement";
    const safeNext =
      nextPath.startsWith("/procurement") && !nextPath.startsWith("/procurement/login") ? nextPath : "/procurement";
    router.replace(`/procurement/login?next=${encodeURIComponent(safeNext)}`);
  }, [isClient, pathname, router]);

  useEffect(() => {
    const section = pathname.split("/")[2];
    if (section === "local" || section === "import" || section === "export") {
      setOpenGroups((prev) => ({ ...prev, [section]: true }));
    }
  }, [pathname]);

  const allowedSections = useMemo(
    () => procurementSectionsForUser(userRole, procurementDepartment),
    [userRole, procurementDepartment]
  );

  const accessLevel = useMemo(() => accessLevelFromRole(userRole), [userRole]);

  const visibleNavGroups = useMemo(
    () =>
      PROCUREMENT_NAV_GROUPS.filter((group) => allowedSections.includes(group.id))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            const moduleKey = item.href.split("/").pop() || "";
            return canAccessModule(accessLevel, moduleKey);
          }),
        }))
        .filter((group) => group.items.length > 0),
    [allowedSections, accessLevel]
  );

  useEffect(() => {
    if (!authOk) return;
    const section = pathname.split("/")[2] as TradeSection | undefined;
    const moduleKey = pathname.split("/")[3];
    if (!section || !["local", "import", "export"].includes(section)) return;
    if (!allowedSections.includes(section)) {
      router.replace(defaultProcurementLandingPath(userRole, procurementDepartment));
      return;
    }
    if (moduleKey && !canAccessModule(accessLevel, moduleKey)) {
      router.replace(defaultProcurementLandingPath(userRole, procurementDepartment));
    }
  }, [authOk, pathname, allowedSections, accessLevel, userRole, procurementDepartment, router]);

  const breadcrumbs = findProcurementBreadcrumbs(pathname);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navLinkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return [
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      active ? "bg-blue-600 text-white" : "text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-slate-800",
    ].join(" ");
  };

  const groupIsActive = (group: NavGroup) => group.items.some((item) => pathname === item.href);

  if (!isClient || !authOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <p className="text-sm text-blue-700 dark:text-blue-200">Loading procurement...</p>
      </div>
    );
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("procurementDepartment");
    localStorage.removeItem("procurementIsAdmin");
    window.location.href = "/procurement/login";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={[
          "fixed lg:static inset-y-0 left-0 z-50 w-72 h-screen bg-white text-blue-800 border-r border-blue-100 flex flex-col shadow-sm transition-transform duration-300 overflow-hidden relative dark:bg-slate-900 dark:text-blue-100 dark:border-slate-800",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.07]">
            <Image
              src="/images/logo/logo.png"
              alt=""
              width={220}
              height={220}
              className="h-auto w-[78%] max-w-[220px] object-contain select-none"
              priority
            />
          </div>
        </div>

        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          <div className="p-6 border-b border-blue-100 flex flex-col items-center text-center dark:border-slate-800">
            <Image
              src="/images/logo/logo.png"
              alt="Ressichem"
              width={160}
              height={160}
              className="h-20 w-auto max-w-[200px] object-contain"
              priority
            />
            <h1 className="mt-3 text-sm font-bold tracking-wide text-blue-800 dark:text-blue-100">PROCUREMENT SYSTEM</h1>
          </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link
            href={DASHBOARD_LINK.href}
            onClick={() => setSidebarOpen(false)}
            className={navLinkClass(DASHBOARD_LINK.href)}
          >
            <span>{DASHBOARD_LINK.icon}</span>
            {DASHBOARD_LINK.name}
          </Link>

          {visibleNavGroups.map((group) => {
            const expanded = openGroups[group.id] ?? false;
            const active = groupIsActive(group);
            return (
              <div key={group.id} className="pt-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={[
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold",
                    active ? "bg-blue-50 text-blue-800 dark:bg-slate-800 dark:text-blue-100" : "text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span>{group.icon}</span>
                    {group.label}
                  </span>
                  <span className="text-xs opacity-80">{expanded ? "▲" : "▼"}</span>
                </button>
                {expanded ? (
                  <div className="mt-1 ml-2 pl-2 border-l border-blue-200 space-y-0.5 dark:border-slate-700">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={navLinkClass(item.href)}
                      >
                        <span className="text-base leading-none">{item.icon}</span>
                        <span className="truncate">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="pt-2 mt-2 border-t border-blue-100 dark:border-slate-800">
            {isProcurementAdmin() ? (
              <>
                <Link href={USERS_LINK.href} onClick={() => setSidebarOpen(false)} className={navLinkClass(USERS_LINK.href)}>
                  <span>{USERS_LINK.icon}</span>
                  {USERS_LINK.name}
                </Link>
                <Link
                  href={DEPARTMENT_APPROVERS_LINK.href}
                  onClick={() => setSidebarOpen(false)}
                  className={navLinkClass(DEPARTMENT_APPROVERS_LINK.href)}
                >
                  <span>{DEPARTMENT_APPROVERS_LINK.icon}</span>
                  {DEPARTMENT_APPROVERS_LINK.name}
                </Link>
              </>
            ) : null}
          </div>
        </nav>
        <div className="p-4 border-t border-blue-100 dark:border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-sm font-medium text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-blue-200"
          >
            <Power className="w-4 h-4" />
            Logout
          </button>
        </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-blue-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg bg-blue-50 text-blue-800 border border-blue-100 dark:bg-slate-800 dark:text-blue-100 dark:border-slate-700"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm min-w-0">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-2 min-w-0">
                  {index > 0 ? <span className="text-blue-300 dark:text-slate-500">/</span> : null}
                  {crumb.href && index < breadcrumbs.length - 1 ? (
                    <Link href={crumb.href} className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 truncate">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-blue-800 dark:text-blue-100 truncate">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggleSwitch />
            <ProcurementNotificationBell />
            <button
              type="button"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:border-blue-500"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto bg-white text-blue-800 dark:bg-slate-950 dark:text-blue-100">{children}</main>
      </div>
    </div>
  );
}
