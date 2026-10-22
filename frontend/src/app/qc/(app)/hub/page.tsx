"use client";

import { useEffect, useState } from "react";
import { qcHubAnalyticsApi, qcHubBatchApi } from "@/lib/qcApi";
import { getAllModules } from "@/lib/qcHubDryMortarSrs";
import Link from "next/link";

type DueItem = {
  _id: string;
  module: string;
  moduleLabel: string;
  moduleSlug: string;
  productName: string;
  grade?: string;
  batchNo: string;
  trackingNo?: string;
  castDate: string;
  dueDate: string;
  pendingLabels: string[];
  daysOverdue: number;
};

function fmtDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function QCHubHomePage() {
  const [stats, setStats] = useState<any>(null);
  const [dueToday, setDueToday] = useState<DueItem[]>([]);
  const [overdue, setOverdue] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      qcHubAnalyticsApi.getDashboard().then((r) => setStats(r.data)).catch(() => {}),
      qcHubBatchApi
        .get28DayDue()
        .then((r) => {
          setDueToday(r.data?.dueToday || []);
          setOverdue(r.data?.overdue || []);
        })
        .catch(() => {
          setDueToday([]);
          setOverdue([]);
        }),
    ]).finally(() => setLoading(false));
  }, []);

  const modules = getAllModules();
  const reminderTotal = dueToday.length + overdue.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QC Hub — Dry Mortar Division</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Batch QC, QA records, R&amp;D trials, predictive analytics &amp; Power BI exports per Dry Mortar SRS.
        </p>
      </div>

      {!loading && reminderTotal > 0 ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/40 space-y-3">
          <div>
            <h3 className="text-base font-bold text-amber-950 dark:text-amber-100">
              28-day testing reminders
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
              Flexural / compressive / adhesion due = sample cast date + 28 days. Enter results on the
              batch when tested.
            </p>
          </div>

          {dueToday.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200 mb-2">
                Due today ({dueToday.length})
              </p>
              <ul className="space-y-2">
                {dueToday.map((item) => (
                  <li key={item._id}>
                    <Link
                      href={item.moduleSlug ? `/qc/hub/qc/${item.moduleSlug}` : "/qc/hub"}
                      className="block rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-sm hover:border-amber-400 dark:border-amber-900 dark:bg-gray-900/80"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.batchNo}
                      </span>
                      {item.trackingNo ? (
                        <span className="ml-2 text-xs text-sky-700 dark:text-sky-300">
                          Track {item.trackingNo}
                        </span>
                      ) : null}
                      <span className="block text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        {item.moduleLabel} · {item.productName}
                        {item.grade ? ` (${item.grade})` : ""} · cast {fmtDate(item.castDate)}
                      </span>
                      <span className="block text-xs text-amber-800 dark:text-amber-200 mt-0.5">
                        Pending: {item.pendingLabels.join(", ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {overdue.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300 mb-2">
                Overdue ({overdue.length})
              </p>
              <ul className="space-y-2">
                {overdue.slice(0, 12).map((item) => (
                  <li key={item._id}>
                    <Link
                      href={item.moduleSlug ? `/qc/hub/qc/${item.moduleSlug}` : "/qc/hub"}
                      className="block rounded-xl border border-red-200 bg-white/90 px-3 py-2 text-sm hover:border-red-400 dark:border-red-900 dark:bg-gray-900/80"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.batchNo}
                      </span>
                      <span className="ml-2 text-xs font-medium text-red-700 dark:text-red-300">
                        {item.daysOverdue}d overdue
                      </span>
                      <span className="block text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        {item.moduleLabel} · {item.productName}
                        {item.grade ? ` (${item.grade})` : ""} · due {fmtDate(item.dueDate)}
                      </span>
                      <span className="block text-xs text-red-700 dark:text-red-300 mt-0.5">
                        Pending: {item.pendingLabels.join(", ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {overdue.length > 12 ? (
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  +{overdue.length - 12} more overdue
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {!loading && reminderTotal === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          No 28-day flexural / compressive tests due today.
        </p>
      ) : null}

      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Batches", value: stats.totalBatches },
            { label: "Approved", value: stats.approvedBatches },
            { label: "Open NCRs", value: stats.openNcrs },
            { label: "Approval Rate", value: `${stats.approvalRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/80 dark:bg-gray-800/80 border shadow p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">QC Product Modules (SRS 3.1)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modules.map((m) => (
            <Link
              key={m.key}
              href={`/qc/hub/qc/${m.slug}`}
              className="rounded-xl border bg-white/80 dark:bg-gray-800/80 p-4 hover:border-sky-400 transition"
            >
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.label}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{m.categories.join(", ")}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/qc/hub/raw-materials" className="rounded-xl border p-4 bg-white/80 dark:bg-gray-800/80 hover:border-emerald-400">
          <p className="font-semibold text-gray-900 dark:text-white">Raw Material QC</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">SRS 3.1.9 — arrival testing & supplier comparison</p>
        </Link>
        <Link href="/qc/hub/packaging-materials" className="rounded-xl border p-4 bg-white/80 dark:bg-gray-800/80 hover:border-emerald-400">
          <p className="font-semibold text-gray-900 dark:text-white">Packaging Material QC</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">SRS 3.1.10 — bags, labels, cartons</p>
        </Link>
        <Link href="/qc/hub/predictive-analytics" className="rounded-xl border p-4 bg-white/80 dark:bg-gray-800/80 hover:border-sky-400">
          <p className="font-semibold text-gray-900 dark:text-white">Predictive Analytics</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">SRS 3.4 — trends & abnormality alerts</p>
        </Link>
      </div>
    </div>
  );
}
