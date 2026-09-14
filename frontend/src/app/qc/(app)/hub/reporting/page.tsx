"use client";

import { useEffect, useState } from "react";
import { qcHubReportingApi } from "@/lib/qcApi";
import { HubReportView } from "@/components/qc-hub/HubReportView";
import { QC_MODULES } from "@/lib/qcHubDryMortarSrs";
import { ensureQcAccessToken, repairQcSessionIfNeeded } from "@/lib/portalSession";

type ProductOption = {
  productName: string;
  module: string;
  grade?: string;
};

const PARAM_TABS = new Set(["product-comparison", "traceability"]);

function moduleLabel(key?: string) {
  if (!key) return "";
  return QC_MODULES[key]?.label || key.replace(/_/g, " ");
}

export default function HubReportingPage() {
  const [batchNo, setBatchNo] = useState("");
  const [productName, setProductName] = useState("");
  const [comparisonModule, setComparisonModule] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("qc-summary");
  const [authReady, setAuthReady] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [batchOptions, setBatchOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      repairQcSessionIfNeeded();
      const token = await ensureQcAccessToken();
      if (cancelled || !token) return;
      setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await qcHubReportingApi.getQcSummary();
        if (cancelled) return;
        const byProduct: ProductOption[] = res.data?.byProduct || [];
        setProductOptions(byProduct);
        const batches = (res.data?.records || [])
          .map((r: { batchNo?: string }) => r.batchNo)
          .filter(Boolean) as string[];
        setBatchOptions([...new Set(batches)]);
      } catch {
        // Options are optional; forms still allow manual entry
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const runReport = async (type: string) => {
    const token = await ensureQcAccessToken();
    if (!token) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      let res;
      switch (type) {
        case "qc-summary":
          res = await qcHubReportingApi.getQcSummary();
          break;
        case "qa-audit":
          res = await qcHubReportingApi.getQaAuditReport();
          break;
        case "raw-material":
          res = await qcHubReportingApi.getRawMaterialReport();
          break;
        case "packaging":
          res = await qcHubReportingApi.getPackagingReport();
          break;
        case "rnd-trials":
          res = await qcHubReportingApi.getRndTrialReport();
          break;
        case "product-comparison": {
          const name = productName.trim();
          if (!name) throw new Error("Select or enter a product name for comparison");
          res = await qcHubReportingApi.getProductComparison(
            name,
            comparisonModule.trim() || undefined
          );
          break;
        }
        case "traceability": {
          const batch = batchNo.trim();
          if (!batch) throw new Error("Select or enter a batch number for traceability");
          res = await qcHubReportingApi.getTraceability(batch);
          break;
        }
        default:
          throw new Error("Unknown report");
      }
      setReport(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (type: string) => {
    setActiveTab(type);
    setError("");
    setReport(null);
    if (!PARAM_TABS.has(type)) {
      runReport(type);
    }
  };

  useEffect(() => {
    if (authReady) runReport("qc-summary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const tabs = [
    { id: "qc-summary", label: "QC Summary" },
    { id: "qa-audit", label: "QA Audits" },
    { id: "raw-material", label: "Raw Material" },
    { id: "packaging", label: "Packaging" },
    { id: "rnd-trials", label: "R&D Trials" },
    { id: "product-comparison", label: "Product Comparison" },
    { id: "traceability", label: "Traceability" },
  ];

  const moduleChoices = [...new Set(productOptions.map((p) => p.module).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          QC summary, QA audits, raw material inspection, R&amp;D trials, product comparison &amp; batch traceability
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeTab === t.id
                ? "bg-sky-600 text-white shadow"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "product-comparison" && (
        <div className="flex flex-wrap gap-3 items-end rounded-xl border bg-white/80 dark:bg-gray-800/80 p-4">
          <div className="min-w-[280px] flex-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Product name
            </label>
            {productOptions.length > 0 && (
              <select
                value={
                  productOptions.some((p) => p.productName === productName) ? productName : ""
                }
                onChange={(e) => {
                  setProductName(e.target.value);
                  const match = productOptions.find((p) => p.productName === e.target.value);
                  if (match?.module) setComparisonModule(match.module);
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 mb-2"
              >
                <option value="">Quick select a product…</option>
                {productOptions.map((p) => (
                  <option
                    key={`${p.module}|${p.productName}|${p.grade || ""}`}
                    value={p.productName}
                  >
                    {p.productName}
                    {p.grade ? ` (${p.grade})` : ""} — {moduleLabel(p.module)}
                  </option>
                ))}
              </select>
            )}
            <input
              list="hub-report-product-names"
              placeholder={
                productOptions.length
                  ? "Select or type a product name…"
                  : "e.g. Tile Adhesive Demo"
              }
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                const match = productOptions.find((p) => p.productName === e.target.value);
                if (match?.module) setComparisonModule(match.module);
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
            />
            <datalist id="hub-report-product-names">
              {productOptions.map((p) => (
                <option
                  key={`${p.module}|${p.productName}|${p.grade || ""}`}
                  value={p.productName}
                  label={`${p.productName}${p.grade ? ` (${p.grade})` : ""} — ${moduleLabel(p.module)}`}
                />
              ))}
            </datalist>
            {productOptions.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {productOptions.length} product(s) available from QC batch records
              </p>
            )}
          </div>
          {moduleChoices.length > 0 && (
            <div className="min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Module (optional)
              </label>
              <select
                value={comparisonModule}
                onChange={(e) => setComparisonModule(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              >
                <option value="">All modules</option>
                {moduleChoices.map((m) => (
                  <option key={m} value={m}>
                    {moduleLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => runReport("product-comparison")}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            Generate report
          </button>
        </div>
      )}

      {activeTab === "traceability" && (
        <div className="flex flex-wrap gap-3 items-end rounded-xl border bg-white/80 dark:bg-gray-800/80 p-4">
          <div className="min-w-[240px] flex-1">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Batch number
            </label>
            {batchOptions.length > 0 && (
              <select
                value={batchOptions.includes(batchNo) ? batchNo : ""}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 mb-2"
              >
                <option value="">Quick select a batch…</option>
                {batchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
            <input
              list="hub-report-batch-nos"
              placeholder={
                batchOptions.length ? "Select or type a batch number…" : "e.g. DM-TIL-001"
              }
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
            />
            <datalist id="hub-report-batch-nos">
              {batchOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            {batchOptions.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {batchOptions.length} batch(es) available from QC records
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => runReport("traceability")}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            Generate report
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          Generating report…
        </div>
      )}

      {!loading && report && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-5 shadow-sm">
          <HubReportView type={activeTab} data={report} />
        </div>
      )}

      {!loading && !report && !error && PARAM_TABS.has(activeTab) && (
        <p className="text-sm text-gray-500">
          Choose a {activeTab === "product-comparison" ? "product" : "batch"} above, then click Generate report.
        </p>
      )}

      {!loading && !report && !error && !PARAM_TABS.has(activeTab) && activeTab !== "qc-summary" && (
        <p className="text-sm text-gray-500">Select a report type above to view results.</p>
      )}
    </div>
  );
}
