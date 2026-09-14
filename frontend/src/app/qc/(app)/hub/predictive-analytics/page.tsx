"use client";

import { useEffect, useState } from "react";
import { qcHubAnalyticsApi } from "@/lib/qcApi";
import { QCHubTrendChart } from "@/components/qc-hub/QCHubTrendChart";

export default function QCHubPredictiveAnalyticsPage() {
  const [trends, setTrends] = useState<Record<string, any[]>>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      qcHubAnalyticsApi.getTrends(),
      qcHubAnalyticsApi.getAbnormalityAlerts(),
    ]).then(([t, a]) => {
      setTrends(t.data || {});
      setAlerts(a.data?.alerts || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-8 text-center text-sm">Loading analytics…</div>;

  const trendKeys = ["bulkDensity", "waterDemand", "tensileAdhesionInitial", "compressiveStrength", "waterRetention"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Predictive Analytics</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">SRS 3.4 — batch trend forecasting &amp; abnormality prediction for Dry Mortar data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {trendKeys.map((key) => (
          <QCHubTrendChart
            key={key}
            title={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            data={(trends[key] || []).map((p: any) => ({ date: p.date, batchNo: p.batchNo, value: p.value }))}
          />
        ))}
      </div>

      <div className="rounded-2xl border bg-white/80 dark:bg-gray-800/80 shadow p-5">
        <h3 className="text-lg font-bold mb-3">Abnormality &amp; Risk Alerts ({alerts.length})</h3>
        {!alerts.length ? (
          <p className="text-sm text-gray-500">No alerts — system needs at least 5 approved batches per parameter.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm border ${a.severity === "HIGH" ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                <p className="font-semibold">{a.type} — {a.parameter}</p>
                <p>{a.message}</p>
                {a.batchNo && <p className="text-xs text-gray-600 mt-1">Batch: {a.batchNo} · Product: {a.productName}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
