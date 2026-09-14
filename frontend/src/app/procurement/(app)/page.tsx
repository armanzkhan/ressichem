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
    <section className="space-y-6 text-blue-800 dark:text-blue-100">
      <article className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-100">Procurement Dashboard</h1>
        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}.
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
          <span className="font-medium text-blue-700 dark:text-blue-200">{accessLevelLabel(accessLevel)}</span>
          {areaKey !== "all" ? (
            <>
              {" "}
              · <span className="font-medium text-blue-700 dark:text-blue-200">{areaLabel(areaKey)}</span>
            </>
          ) : (
            <>
              {" "}
              · <span className="font-medium text-blue-700 dark:text-blue-200">All areas</span>
            </>
          )}
          <span className="text-blue-500 dark:text-blue-400"> ({roleName})</span>
        </p>
      </article>

      {cards.length ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

      <article className="rounded-2xl bg-white border border-blue-100 p-6 space-y-6 dark:bg-slate-900 dark:border-slate-700">
        <h2 className="font-semibold text-blue-800 dark:text-blue-100">Modules</h2>
        {visibleNavGroups.map((group) => (
          <section key={group.id}>
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
              <span>{group.icon}</span>
              {group.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-blue-100 p-4 hover:bg-blue-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <p className="font-medium text-blue-800 dark:text-blue-100 flex items-center gap-2">
                    <span>{link.icon}</span>
                    {link.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {isAdmin ? (
          <section>
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Administration</h3>
            <Link
              href="/procurement/users"
              className="inline-flex rounded-xl border border-blue-100 px-4 py-3 text-blue-800 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-100 dark:hover:bg-slate-800"
            >
              👥 Users
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
  const borderClass =
    emphasis === "approval"
      ? "border-amber-200 hover:border-amber-400 dark:border-amber-800 dark:hover:border-amber-500"
      : emphasis === "draft"
        ? "border-sky-200 hover:border-sky-400 dark:border-sky-800 dark:hover:border-sky-500"
        : "border-blue-100 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-500";

  const inner = (
    <>
      <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">{title}</p>
      <p className="text-3xl font-bold text-blue-800 dark:text-blue-100 mt-2">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`rounded-xl bg-white border p-5 shadow-sm transition-colors block dark:bg-slate-900 ${borderClass}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <article className={`rounded-xl bg-white border p-5 shadow-sm dark:bg-slate-900 ${borderClass}`}>{inner}</article>
  );
}
