"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { procurementApi } from "@/lib/procurementApi";
import { isProcurementAdmin } from "@/lib/procurementAccess";
import { buildDashboardCards, type DashboardStatsBySection } from "@/lib/procurementDashboard";
import { PROCUREMENT_NAV_GROUPS } from "@/lib/procurementNav";
import {
  accessLevelFromRole,
  accessLevelLabel,
  areaLabel,
  canAccessModule,
  effectiveProcurementDepartment,
  getProcurementSessionArea,
  procurementSectionsForUser,
  setProcurementSessionArea,
  userProcurementArea,
  type ProcurementAccessLevel,
} from "@/lib/procurementRoles";
import type { TradeSection } from "@/lib/procurementScope";

type DashboardResponse = {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    roles?: string[];
    department?: string;
    accessLevel?: ProcurementAccessLevel;
    allowedSections?: TradeSection[];
  };
  statsBySection?: DashboardStatsBySection;
};

export default function ProcurementDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [sessionRole, setSessionRole] = useState("");
  const [sessionDepartment, setSessionDepartment] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setSessionRole(localStorage.getItem("userRole") || "");
    setSessionDepartment(getProcurementSessionArea());
    setIsAdmin(isProcurementAdmin());
  }, []);

  useEffect(() => {
    procurementApi
      .getDashboard()
      .then((res) => setData(res as DashboardResponse))
      .catch((err: Error) => {
        const msg = err.message || "";
        if (/invalid or expired token|no token provided/i.test(msg)) return;
        setError(msg || "Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  const user = data?.user;
  const roleName = user?.role || user?.roles?.[0] || sessionRole || "Procurement user";
  const department = user?.department || sessionDepartment;
  const accessLevel = user?.accessLevel || accessLevelFromRole(roleName);
  const areaKey = userProcurementArea(roleName, department);

  useEffect(() => {
    if (!roleName) return;
    const effective = effectiveProcurementDepartment(roleName, department);
    if (effective && effective !== getProcurementSessionArea()) {
      setProcurementSessionArea(effective);
      setSessionDepartment(effective);
    }
  }, [roleName, department]);
  const allowedSections = useMemo(
    () => user?.allowedSections || procurementSectionsForUser(roleName, department),
    [user?.allowedSections, roleName, department]
  );

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

  const cards = useMemo(
    () => buildDashboardCards(allowedSections, data?.statsBySection || {}, accessLevel),
    [allowedSections, data?.statsBySection, accessLevel]
  );

  if (loading) return <p className="text-blue-700 dark:text-blue-200">Loading dashboard...</p>;
  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 text-blue-800 dark:text-blue-100 w-full min-w-0">
      <article className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-5 sm:p-6 text-white shadow-lg shadow-blue-900/20 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-sky-300/25" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/90">Ressichem</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">Procurement</h1>
          <p className="text-sm text-blue-50/95 mt-2">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}.
          </p>
          <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
            <span>{accessLevelLabel(accessLevel)}</span>
            <span className="opacity-60">·</span>
            <span>{areaKey !== "all" ? areaLabel(areaKey) : "All areas"}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-90">{roleName}</span>
          </p>
        </div>
      </article>

      {cards.length ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => (
            <StatCard
              key={card.id}
              title={card.title}
              value={card.value}
              href={card.href}
              emphasis={card.emphasis}
            />
          ))}
        </section>
      ) : (
        <p className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-blue-200">
          No dashboard metrics are available for your account. Contact an administrator if this looks wrong.
        </p>
      )}

      <article className="rounded-2xl border border-blue-100/80 bg-white/95 p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-sm shadow-blue-900/5 dark:bg-slate-900 dark:border-slate-700">
        <h2 className="font-semibold text-blue-900 dark:text-blue-100">Modules</h2>
        {visibleNavGroups.map((group) => (
          <section key={group.id}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-2.5 flex items-center gap-2">
              <span>{group.icon}</span>
              {group.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {group.items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-white to-blue-50/40 p-3.5 shadow-sm shadow-blue-900/5 transition active:scale-[0.99] hover:border-blue-200 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800 dark:hover:border-slate-600"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm">
                    {link.icon}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-blue-900 dark:text-blue-100 truncate">
                    {link.name}
                  </span>
                  <span className="text-blue-300 dark:text-slate-500">›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {isAdmin ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-2.5">
              Administration
            </h3>
            <Link
              href="/procurement/users"
              className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3.5 text-blue-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">👥</span>
              <span className="font-medium">Users</span>
            </Link>
          </section>
        ) : null}
      </article>
    </section>
  );
}

function StatCard({
  title,
  value,
  href,
  emphasis,
}: {
  title: string;
  value: number;
  href?: string;
  emphasis?: "approval" | "draft";
}) {
  const accentClass =
    emphasis === "approval"
      ? "from-amber-500 to-orange-400"
      : emphasis === "draft"
        ? "from-sky-500 to-cyan-400"
        : "from-blue-600 to-sky-400";

  const inner = (
    <>
      <div className={`mb-3 h-1 w-10 rounded-full bg-gradient-to-r ${accentClass}`} />
      <p className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-300 leading-snug break-words">
        {title}
      </p>
      <p className="text-3xl font-bold tracking-tight text-blue-950 dark:text-blue-50 mt-1.5">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block min-w-0 rounded-2xl border border-blue-100/90 bg-white/95 p-4 sm:p-5 shadow-md shadow-blue-900/5 ring-1 ring-blue-50 transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-800"
      >
        {inner}
      </Link>
    );
  }

  return (
    <article className="min-w-0 rounded-2xl border border-blue-100/90 bg-white/95 p-4 sm:p-5 shadow-md shadow-blue-900/5 ring-1 ring-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-800">
      {inner}
    </article>
  );
}
