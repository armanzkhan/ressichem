"use client";

import React, { useMemo, useState } from "react";
import { qcHubAnalyticsApi } from "@/lib/qcApi";
import { getAllModules } from "@/lib/qcHubDryMortarSrs";

export default function QCHubExportsPage() {
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const modules = useMemo(() => getAllModules(), []);

  const download = async (format: "csv" | "xlsx" | "json") => {
    setLoading(true);
    setMessage("");
    try {
      await qcHubAnalyticsApi.downloadPowerBI(format, {
        module: module || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setMessage(`Downloaded ${format.toUpperCase()} export successfully.`);
    } catch (e: any) {
      setMessage(e?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dry Mortar Power BI Exports</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          SRS Section 6 — API, CSV &amp; XLSX exports of cleaned QC batch datasets, forms &amp; R&amp;D trials.
        </p>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.includes("success") ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Module</label>
            <select value={module} onChange={(e) => setModule(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900">
              <option value="">All modules</option>
              {modules.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button disabled={loading} onClick={() => download("csv")} className="px-5 py-3 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-60">Download CSV</button>
          <button disabled={loading} onClick={() => download("xlsx")} className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">Download XLSX</button>
          <button disabled={loading} onClick={() => download("json")} className="px-5 py-3 rounded-xl bg-gray-700 text-white text-sm font-semibold disabled:opacity-60">API JSON</button>
        </div>
      </div>
    </div>
  );
}
