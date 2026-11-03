"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { procurementApi } from "@/lib/procurementApi";
import { formatProcurementAmount } from "@/lib/procurementMoney";

type CostTotal = { currency: string; amount: number };

type DayRow = {
  date: string;
  requisitionCount: number;
  requisitions: {
    _id: string;
    requisitionNumber: string;
    title: string;
    purchaseType?: "local" | "foreign";
    currency: string;
    estimatedCost: number;
  }[];
  totals: CostTotal[];
};

type Report = {
  days: DayRow[];
  totals: CostTotal[];
  requisitionCount: number;
  unpricedCount: number;
};

function formatMoney(totals: CostTotal[]) {
  if (!totals.length) return "0.00";
  return totals
    .map((row) => `${row.currency} ${formatProcurementAmount(row.amount)}`)
    .join(" · ");
}

function formatDay(isoDate: string) {
  if (!isoDate || isoDate === "unknown") return "No approval date";
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function requisitionHref(row: DayRow["requisitions"][number]) {
  const section = row.purchaseType === "foreign" ? "import" : "local";
  return `/procurement/${section}/pr?open=${encodeURIComponent(row._id)}`;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ApprovedPrDailyCost() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const today = todayKey();

  useEffect(() => {
    procurementApi
      .approvedDailyCost()
      .then((res) => setReport(res.data))
      .catch((err: Error) => setError(err.message || "Could not load the daily cost total"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <article className="rounded-2xl border border-blue-100/80 bg-white/95 p-4 sm:p-6 shadow-sm shadow-blue-900/5 dark:bg-slate-900 dark:border-slate-700">
      <h2 className="font-semibold text-blue-900 dark:text-blue-100">Approved requisition cost</h2>
      <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
        Daily estimated cost of Lahore purchase requisitions that are already approved. Each day is
        the sum of those requisitions, and the total adds every day together.
      </p>

      {loading ? <p className="mt-4 text-sm text-blue-700 dark:text-blue-200">Loading cost total…</p> : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {report ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-blue-600 px-4 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Total estimated cost</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{formatMoney(report.totals)}</p>
            <p className="mt-1 text-xs text-blue-100">
              {report.requisitionCount} approved requisition{report.requisitionCount === 1 ? "" : "s"}
              {report.unpricedCount
                ? ` · ${report.unpricedCount} still have no price`
                : ""}
            </p>
          </div>

          {report.days.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-blue-100 text-xs uppercase tracking-wide text-blue-500 dark:border-slate-700 dark:text-blue-300">
                    <th className="py-2 pr-3 font-semibold">Day</th>
                    <th className="py-2 pr-3 font-semibold">Requisitions</th>
                    <th className="py-2 font-semibold">Estimated cost</th>
                  </tr>
                </thead>
                <tbody>
                  {report.days.map((day) => (
                    <tr
                      key={day.date}
                      className={`border-b border-blue-50 align-top dark:border-slate-800 ${
                        day.date === today ? "bg-amber-50/80 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="py-3 pr-3 font-medium text-blue-950 dark:text-blue-50">
                        {formatDay(day.date)}
                        {day.date === today ? (
                          <span className="ml-2 text-xs font-semibold text-amber-700 dark:text-amber-200">Today</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-blue-800 dark:text-blue-100">
                        <p>{day.requisitionCount}</p>
                        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-blue-700 dark:text-blue-200">
                          {day.requisitions.map((row) => (
                            <Link
                              key={row._id}
                              href={requisitionHref(row)}
                              className="font-medium underline decoration-blue-300 underline-offset-2 hover:text-blue-950 dark:hover:text-white"
                              title={row.title || row.requisitionNumber}
                            >
                              {row.requisitionNumber}
                              {row.estimatedCost > 0
                                ? ` ${row.currency} ${formatProcurementAmount(row.estimatedCost)}`
                                : " (no price)"}
                            </Link>
                          ))}
                        </p>
                      </td>
                      <td className="py-3 font-semibold text-blue-950 dark:text-blue-50">{formatMoney(day.totals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-blue-700 dark:text-blue-200">No approved Lahore requisitions yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
