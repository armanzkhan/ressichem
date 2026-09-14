"use client";

import { useMemo, useState } from "react";
import { getBackendUrl } from "@/lib/getBackendUrl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
};

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

const toKeyValueArray = (obj?: Record<string, number>) =>
  Object.entries(obj || {}).map(([key, value]) => ({ name: key, value }));

export default function QCReportsPage() {
  const apiUrl = useMemo(() => getBackendUrl(), []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [batchNo, setBatchNo] = useState("");
  const [productName, setProductName] = useState("");
  const [grade, setGrade] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  const [traceDate, setTraceDate] = useState("");
  const [traceOperator, setTraceOperator] = useState("");
  const [traceShift, setTraceShift] = useState("");
  const [traceMachine, setTraceMachine] = useState("");

  const [trialFolder, setTrialFolder] = useState("");
  const [trialProduct, setTrialProduct] = useState("");
  const [trialFrom, setTrialFrom] = useState("");
  const [trialTo, setTrialTo] = useState("");

  const [qcBatchReport, setQcBatchReport] = useState<ReportState<any>>({ data: null, loading: false, error: "" });
  const [qcProductReport, setQcProductReport] = useState<ReportState<any>>({ data: null, loading: false, error: "" });
  const [qaAuditReport, setQaAuditReport] = useState<ReportState<any>>({ data: null, loading: false, error: "" });
  const [traceReport, setTraceReport] = useState<ReportState<any[]>>({ data: null, loading: false, error: "" });
  const [trialReport, setTrialReport] = useState<ReportState<any>>({ data: null, loading: false, error: "" });
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});

  const recordUpdate = (key: string) => {
    setLastUpdated((prev) => ({ ...prev, [key]: new Date().toLocaleString() }));
  };

  const sectionNav = [
    { id: "qc-batch", label: "QC Summary by Batch" },
    { id: "qc-product", label: "QC Summary by Product" },
    { id: "qa-audit", label: "QA Audit Summary" },
    { id: "qa-trace", label: "Bottle Filling Traceability" },
    { id: "rd-trials", label: "R&D Trial History" },
  ];

  const chartCardClass =
    "group rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-5";
  const chartInnerClass =
    "rounded-xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 p-4";

  const qcBatchChartData = useMemo(() => {
    if (!qcBatchReport.data) return [];
    return [
      { name: "Resin", value: qcBatchReport.data.resin?.total || 0 },
      { name: "Hardener", value: qcBatchReport.data.hardener?.total || 0 },
      { name: "Other", value: qcBatchReport.data.other?.total || 0 },
    ];
  }, [qcBatchReport.data]);

  const qcProductChartData = useMemo(() => {
    if (!qcProductReport.data) return [];
    return [
      { name: "Total Batches", value: qcProductReport.data.totalBatches || 0 },
      { name: "Avg EEW", value: qcProductReport.data.resin?.avgEEW || 0 },
      { name: "Avg Resin Viscosity", value: qcProductReport.data.resin?.avgViscosity || 0 },
      { name: "Avg Amine Value", value: qcProductReport.data.hardener?.avgAmineValue || 0 },
      { name: "Avg Hardener Viscosity", value: qcProductReport.data.hardener?.avgViscosity || 0 },
    ];
  }, [qcProductReport.data]);

  const qaStatusChartData = useMemo(() => toKeyValueArray(qaAuditReport.data?.byStatus), [qaAuditReport.data]);
  const qaShiftChartData = useMemo(() => toKeyValueArray(qaAuditReport.data?.byShift), [qaAuditReport.data]);
  const qaOperatorChartData = useMemo(() => toKeyValueArray(qaAuditReport.data?.byOperator), [qaAuditReport.data]);
  const qaStatusStacked = useMemo(() => {
    if (!qaAuditReport.data?.byStatus) return [];
    return [
      {
        name: "Status Mix",
        ...qaAuditReport.data.byStatus,
      },
    ];
  }, [qaAuditReport.data]);

  const traceChartData = useMemo(() => {
    if (!traceReport.data?.length) return [];
    const byHour = traceReport.data.reduce((acc: Record<string, number>, row: any) => {
      const hourKey = row.hour !== undefined ? String(row.hour).padStart(2, "0") : "NA";
      acc[hourKey] = (acc[hourKey] || 0) + (row.weight || 0);
      return acc;
    }, {});
    return Object.keys(byHour)
      .sort((a, b) => Number(a) - Number(b))
      .map((hour) => ({ hour, totalWeight: byHour[hour] }));
  }, [traceReport.data]);
  const traceWeightUnit = useMemo(() => {
    if (!traceReport.data?.length) return "";
    const unit = traceReport.data.find((row: any) => row.weightUnit)?.weightUnit;
    return unit ? ` ${unit}` : "";
  }, [traceReport.data]);

  const trialStatusChartData = useMemo(() => toKeyValueArray(trialReport.data?.byStatus), [trialReport.data]);
  const trialFolderChartData = useMemo(() => toKeyValueArray(trialReport.data?.byProductFolder), [trialReport.data]);

  const request = async (path: string, params: Record<string, string>) => {
    if (!token) throw new Error("Missing auth token. Please log in.");
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) qs.append(key, value);
    });
    const res = await fetch(`${apiUrl}/api/qc/reporting/${path}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to load report");
    return data.data;
  };

  const loadBatchSummary = async () => {
    setQcBatchReport({ data: null, loading: true, error: "" });
    try {
      const data = await request("summary/batch", { batchNo, from, to });
      setQcBatchReport({ data, loading: false, error: "" });
      recordUpdate("qc-batch");
    } catch (e: any) {
      setQcBatchReport({ data: null, loading: false, error: e.message || "Failed" });
    }
  };

  const loadProductSummary = async () => {
    setQcProductReport({ data: null, loading: true, error: "" });
    try {
      const data = await request("summary/product", { productName, grade, from, to });
      setQcProductReport({ data, loading: false, error: "" });
      recordUpdate("qc-product");
    } catch (e: any) {
      setQcProductReport({ data: null, loading: false, error: e.message || "Failed" });
    }
  };

  const loadAuditSummary = async () => {
    setQaAuditReport({ data: null, loading: true, error: "" });
    try {
      const data = await request("qa/audit-summary", { from: auditFrom, to: auditTo });
      setQaAuditReport({ data, loading: false, error: "" });
      recordUpdate("qa-audit");
    } catch (e: any) {
      setQaAuditReport({ data: null, loading: false, error: e.message || "Failed" });
    }
  };

  const loadTraceability = async () => {
    setTraceReport({ data: null, loading: true, error: "" });
    try {
      const data = await request("qa/bottle-filling-traceability", {
        date: traceDate,
        operator: traceOperator,
        shift: traceShift,
        machineId: traceMachine,
      });
      setTraceReport({ data, loading: false, error: "" });
      recordUpdate("qa-trace");
    } catch (e: any) {
      setTraceReport({ data: null, loading: false, error: e.message || "Failed" });
    }
  };

  const loadTrialHistory = async () => {
    setTrialReport({ data: null, loading: true, error: "" });
    try {
      const data = await request("rd/trial-history", {
        productFolder: trialFolder,
        productName: trialProduct,
        from: trialFrom,
        to: trialTo,
      });
      setTrialReport({ data, loading: false, error: "" });
      recordUpdate("rd-trials");
    } catch (e: any) {
      setTrialReport({ data: null, loading: false, error: e.message || "Failed" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">QC / QA / R&D Reports</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Generate QC summaries, QA audit reports, traceability sheets, and R&D trial history.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 px-4 py-2">
              <div className="text-xs text-gray-500">Total Reports</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{sectionNav.length}</div>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 px-4 py-2">
              <div className="text-xs text-gray-500">Loaded</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{Object.keys(lastUpdated).length}</div>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 px-4 py-2">
              <div className="text-xs text-gray-500">Last Refresh</div>
              <div className="text-xs font-semibold text-gray-900 dark:text-white">
                {Object.values(lastUpdated).slice(-1)[0] || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
      <details id="qc-batch" className={chartCardClass}>
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-3">
            <div>
              <h4 className="text-md font-bold text-gray-900 dark:text-white">QC Summary by Batch</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Last updated: {lastUpdated["qc-batch"] || "—"}</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow transition group-open:rotate-180 dark:bg-gray-900/60 dark:text-gray-200">⌄</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
        {!qcBatchReport.data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">Set filters, then click Load to generate charts.</div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Batch No"
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <button onClick={loadBatchSummary} className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
            {qcBatchReport.loading ? "Loading..." : "Load"}
          </button>
        </div>
        {qcBatchReport.error && <div className="text-sm text-red-600">{qcBatchReport.error}</div>}
        {qcBatchReport.data && (
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={chartInnerClass}>
                <div className="text-xs text-gray-500">Resin Batches</div>
                <div className="text-lg font-bold">{qcBatchReport.data.resin?.total || 0}</div>
              </div>
              <div className={chartInnerClass}>
                <div className="text-xs text-gray-500">Hardener Batches</div>
                <div className="text-lg font-bold">{qcBatchReport.data.hardener?.total || 0}</div>
              </div>
              <div className={chartInnerClass}>
                <div className="text-xs text-gray-500">Other QC Results</div>
                <div className="text-lg font-bold">{qcBatchReport.data.other?.total || 0}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={chartInnerClass}>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-2">
                  {qcBatchChartData.map((item, idx) => (
                    <span key={item.name} className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 dark:bg-gray-900/60 px-2 py-0.5">
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Trend (Line)</div>
                <div className="h-52">
                  {qcBatchChartData.some((d) => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={qcBatchChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500">No chart data available.</div>
                  )}
                </div>
              </div>
              <div className={chartInnerClass}>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-2">
                  {qcBatchChartData.map((item, idx) => (
                    <span key={item.name} className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 dark:bg-gray-900/60 px-2 py-0.5">
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Distribution (Bar)</div>
                <div className="h-52">
                  {qcBatchChartData.some((d) => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qcBatchChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                        <Tooltip />
                        <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500">No chart data available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </details>

      <details id="qc-product" className={chartCardClass}>
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-3">
            <div>
              <h4 className="text-md font-bold text-gray-900 dark:text-white">QC Summary by Product</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Last updated: {lastUpdated["qc-product"] || "—"}</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow transition group-open:rotate-180 dark:bg-gray-900/60 dark:text-gray-200">⌄</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
        {!qcProductReport.data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">Set filters, then click Load to generate charts.</div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Product Name"
          />
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Grade"
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <button onClick={loadProductSummary} className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
            {qcProductReport.loading ? "Loading..." : "Load"}
          </button>
        </div>
        {qcProductReport.error && <div className="text-sm text-red-600">{qcProductReport.error}</div>}
        {qcProductReport.data && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Total Batches: <strong>{qcProductReport.data.totalBatches}</strong>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={chartInnerClass}>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-2">
                  {qcProductChartData.map((item, idx) => (
                    <span key={item.name} className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 dark:bg-gray-900/60 px-2 py-0.5">
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Trend (Line)</div>
                <div className="h-52">
                  {qcProductChartData.some((d) => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={qcProductChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500">No chart data available.</div>
                  )}
                </div>
              </div>
              <div className={chartInnerClass}>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-2">
                  {qcProductChartData.map((item, idx) => (
                    <span key={item.name} className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 dark:bg-gray-900/60 px-2 py-0.5">
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Distribution (Bar)</div>
                <div className="h-52">
                  {qcProductChartData.some((d) => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qcProductChartData} layout="vertical" margin={{ left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500">No chart data available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </details>

      <details id="qa-audit" className={chartCardClass}>
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-3">
            <div>
              <h4 className="text-md font-bold text-gray-900 dark:text-white">QA Audit Summary</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Last updated: {lastUpdated["qa-audit"] || "—"}</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow transition group-open:rotate-180 dark:bg-gray-900/60 dark:text-gray-200">⌄</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
        {!qaAuditReport.data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">Set filters, then click Load to generate charts.</div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <button onClick={loadAuditSummary} className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
            {qaAuditReport.loading ? "Loading..." : "Load"}
          </button>
        </div>
        {qaAuditReport.error && <div className="text-sm text-red-600">{qaAuditReport.error}</div>}
        {qaAuditReport.data && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Total Records: <strong>{qaAuditReport.data.totalRecords}</strong> • Approved: <strong>{qaAuditReport.data.approved}</strong>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={chartInnerClass}>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-2">
                  {qaStatusChartData.map((item, idx) => (
                    <span key={item.name} className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 dark:bg-gray-900/60 px-2 py-0.5">
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Status Mix (Stacked Bar)</div>
                <div className="h-52">
                  {qaStatusChartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qaStatusStacked}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                        <Tooltip />
                        {qaStatusChartData.map((item, idx) => (
                          <Bar key={item.name} dataKey={item.name} stackId="status" fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[6, 6, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500">No status data available.</div>
                  )}
                </div>
              </div>
              <div className={chartInnerClass}>
                <div className="text-xs font-semibold text-gray-500 mb-2">Shift Count (Bar)</div>
                <div className="h-52">
                  {qaShiftChartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qaShiftChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                        <Tooltip />
                        <Bar dataKey="value" fill={CHART_COLORS[3]} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-500">No shift data available.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 h-64">
              <div className="text-xs font-semibold text-gray-500 mb-2">Operator Count (Line)</div>
              {qaOperatorChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qaOperatorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS[4]} strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-500">No operator data available.</div>
              )}
            </div>
          </div>
        )}
        </div>
      </details>

      <details id="qa-trace" className={chartCardClass}>
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-3">
            <div>
              <h4 className="text-md font-bold text-gray-900 dark:text-white">Bottle Filling Traceability</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Last updated: {lastUpdated["qa-trace"] || "—"}</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow transition group-open:rotate-180 dark:bg-gray-900/60 dark:text-gray-200">⌄</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
        {!traceReport.data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">Set filters, then click Load to generate charts.</div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={traceDate} onChange={(e) => setTraceDate(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <input value={traceOperator} onChange={(e) => setTraceOperator(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" placeholder="Operator" />
          <input value={traceShift} onChange={(e) => setTraceShift(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" placeholder="Shift" />
          <input value={traceMachine} onChange={(e) => setTraceMachine(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" placeholder="Machine ID" />
          <button onClick={loadTraceability} className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
            {traceReport.loading ? "Loading..." : "Load"}
          </button>
        </div>
        {traceReport.error && <div className="text-sm text-red-600">{traceReport.error}</div>}
        {traceReport.data && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Hour</th>
                  <th className="py-2 pr-4">Operator</th>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {traceReport.data.slice(0, 50).map((row, idx) => (
                  <tr key={`${row.batchNo}-${idx}`} className="border-t border-gray-200/60 dark:border-gray-700/60">
                    <td className="py-2 pr-4">{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-4">{row.hour}</td>
                    <td className="py-2 pr-4">{row.operator}</td>
                    <td className="py-2 pr-4">{row.batchNo}</td>
                    <td className="py-2 pr-4">{row.productName}</td>
                    <td className="py-2 pr-2">{row.weight} {row.weightUnit || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {traceReport.data.length > 50 && (
              <div className="text-xs text-gray-500 mt-2">Showing first 50 rows.</div>
            )}
            <div className="mt-4 h-64">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                {"Total Weight" + traceWeightUnit + " (Line)"}
              </div>
              {traceChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={traceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                    <Tooltip formatter={(value) => [String(value) + traceWeightUnit, "Total Weight"]} />
                    <Legend />
                    <Line type="monotone" dataKey="totalWeight" stroke={CHART_COLORS[4]} strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-500">No traceability data available.</div>
              )}
            </div>
          </div>
        )}
        </div>
      </details>

      <details id="rd-trials" className={chartCardClass}>
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-3">
            <div>
              <h4 className="text-md font-bold text-gray-900 dark:text-white">R&D Trial History</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Last updated: {lastUpdated["rd-trials"] || "—"}</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow transition group-open:rotate-180 dark:bg-gray-900/60 dark:text-gray-200">⌄</span>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
        {!trialReport.data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">Set filters, then click Load to generate charts.</div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <input value={trialFolder} onChange={(e) => setTrialFolder(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" placeholder="Product Folder" />
          <input value={trialProduct} onChange={(e) => setTrialProduct(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" placeholder="Product Name" />
          <input type="date" value={trialFrom} onChange={(e) => setTrialFrom(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <input type="date" value={trialTo} onChange={(e) => setTrialTo(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs" />
          <button onClick={loadTrialHistory} className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
            {trialReport.loading ? "Loading..." : "Load"}
          </button>
        </div>
        {trialReport.error && <div className="text-sm text-red-600">{trialReport.error}</div>}
        {trialReport.data && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Total Trials: <strong>{trialReport.data.totalTrials}</strong>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-64">
                <div className="text-xs font-semibold text-gray-500 mb-2">Status Count (Bar)</div>
                {trialStatusChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trialStatusChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                      <Tooltip />
                      <Bar dataKey="value" fill={CHART_COLORS[5]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-gray-500">No status data available.</div>
                )}
              </div>
              <div className="h-64">
                <div className="text-xs font-semibold text-gray-500 mb-2">Folder Count (Line)</div>
                {trialFolderChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trialFolderChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-gray-500">No folder data available.</div>
                )}
              </div>
            </div>
            <div className="mt-4 h-64">
              <div className="text-xs font-semibold text-gray-500 mb-2">Folder Count (Bar)</div>
              {trialFolderChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trialFolderChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickCount={5} />
                    <Tooltip />
                    <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-500">No folder data available.</div>
              )}
            </div>
          </div>
        )}
        </div>
      </details>
      </div>
    </div>
  );
}
