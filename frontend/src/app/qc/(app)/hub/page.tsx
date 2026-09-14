"use client";

import { useEffect, useState } from "react";
import { qcHubAnalyticsApi } from "@/lib/qcApi";
import { getAllModules } from "@/lib/qcHubDryMortarSrs";
import Link from "next/link";

export default function QCHubHomePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qcHubAnalyticsApi.getDashboard().then((r) => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const modules = getAllModules();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QC Hub — Dry Mortar Division</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Batch QC, QA records, R&amp;D trials, predictive analytics &amp; Power BI exports per Dry Mortar SRS.
        </p>
      </div>

      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Batches", value: stats.totalBatches },
            { label: "Approved", value: stats.approvedBatches },
            { label: "Open NCRs", value: stats.openNcrs },
            { label: "Approval Rate", value: `${stats.approvalRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/80 dark:bg-gray-800/80 border shadow p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
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
              <p className="text-xs text-gray-500 mt-1">{m.categories.join(", ")}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/qc/hub/raw-materials" className="rounded-xl border p-4 bg-white/80 dark:bg-gray-800/80 hover:border-emerald-400">
          <p className="font-semibold">Raw Material QC</p>
          <p className="text-xs text-gray-500">SRS 3.1.9 — arrival testing & supplier comparison</p>
        </Link>
        <Link href="/qc/hub/packaging-materials" className="rounded-xl border p-4 bg-white/80 dark:bg-gray-800/80 hover:border-emerald-400">
          <p className="font-semibold">Packaging Material QC</p>
          <p className="text-xs text-gray-500">SRS 3.1.10 — bags, labels, cartons</p>
        </Link>
        <Link href="/qc/hub/predictive-analytics" className="rounded-xl border p-4 bg-white/80 dark:bg-gray-800/80 hover:border-sky-400">
          <p className="font-semibold">Predictive Analytics</p>
          <p className="text-xs text-gray-500">SRS 3.4 — trends & abnormality alerts</p>
        </Link>
      </div>
    </div>
  );
}
