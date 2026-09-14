"use client";

import React, { useEffect, useMemo, useState } from "react";

type PlanItem = {
  _id: string;
  planGroup: string;
  productType: string;
  testName: string;
  frequency: string;
  methodRef: string;
  requirement: string;
  unit?: string;
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  TILE_ADHESIVE: "Tile Adhesive (EN 12004-1:2017 / EN 12004-2:2017)",
  GROUTS: "Grouts (EN 13888-1:2022 / EN 13888-2:2022)",
  PLASTER_RENDER_OTHER: "Plaster / Render / Other Mortar (EN 998-1:2010 / EN 1015)",
};

export default function QCHubPlanPage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/hub/plan?planGroup=DRY_MORTAR&active=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load QC plan");
      setItems(data.data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load QC plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, PlanItem[]>();
    for (const it of items) {
      const key = it.productType || "OTHER";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => a.testName.localeCompare(b.testName));
      m.set(k, arr);
    }
    return Array.from(m.entries());
  }, [items]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QC Hub — Dry Mortar QC Routine Testing Plan</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          This page follows your QC Plan document: <span className="font-semibold">Tests</span>,{" "}
          <span className="font-semibold">Frequency</span>, <span className="font-semibold">Methods</span>, and{" "}
          <span className="font-semibold">Requirements</span>.
        </p>
      </div>

      {message && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Permissions: <span className="font-mono">qc.hub.plan.read</span>
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {!grouped.length && !loading ? (
        <div className="rounded-2xl bg-white/70 dark:bg-gray-800/70 border border-white/30 dark:border-gray-700/50 shadow p-6 text-sm text-gray-600 dark:text-gray-400">
          No plan items found yet. Seed them with:{" "}
          <span className="font-mono">node backend/scripts/migrations/seed-qc-hub-dry-mortar-plan.js RESSICHEM</span>
        </div>
      ) : null}

      {grouped.map(([productType, arr]) => (
        <div key={productType} className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {PRODUCT_TYPE_LABELS[productType] || productType}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Default frequency in plan: <span className="font-semibold">Daily 1 batch of each product</span>
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  <th className="py-2 pr-4">Test</th>
                  <th className="py-2 pr-4">Frequency</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Requirement</th>
                </tr>
              </thead>
              <tbody>
                {arr.map((it) => (
                  <tr key={it._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                    <td className="py-3 pr-4 font-semibold">{it.testName}</td>
                    <td className="py-3 pr-4">{it.frequency || "—"}</td>
                    <td className="py-3 pr-4">{it.methodRef || "—"}</td>
                    <td className="py-3 pr-4">
                      <div className="text-gray-900 dark:text-gray-100">{it.requirement || "—"}</div>
                      {it.unit ? <div className="text-[11px] text-gray-500 dark:text-gray-400">Unit: {it.unit}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}


