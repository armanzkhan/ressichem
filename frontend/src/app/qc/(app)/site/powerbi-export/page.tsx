"use client";

import React, { useState } from "react";
import { powerBIExportApi } from "@/lib/qcSiteApi";

export default function PowerBIExportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [exportData, setExportData] = useState<any>(null);
  const [activeExport, setActiveExport] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    module: "",
    productName: "",
    grade: "",
    productFolder: "",
  });

  const handleExport = async (exportType: string) => {
    setLoading(true);
    setMessage("");
    setActiveExport(exportType);
    try {
      let res;
      switch (exportType) {
        case "resin-qc":
          res = await powerBIExportApi.exportResinQC({ from: filters.from, to: filters.to });
          break;
        case "hardener-qc":
          res = await powerBIExportApi.exportHardenerQC({ from: filters.from, to: filters.to });
          break;
        case "timeseries-qc":
          res = await powerBIExportApi.exportTimeSeriesQC({
            module: filters.module,
            productName: filters.productName,
            grade: filters.grade,
            from: filters.from,
            to: filters.to,
          });
          break;
        case "rd-trials":
          res = await powerBIExportApi.exportRDTrials({
            productFolder: filters.productFolder,
            from: filters.from,
            to: filters.to,
          });
          break;
        case "qa-logs":
          res = await powerBIExportApi.exportQALogs({ from: filters.from, to: filters.to });
          break;
        case "all":
          res = await powerBIExportApi.exportAll({ from: filters.from, to: filters.to });
          break;
        default:
          throw new Error("Invalid export type");
      }
      if (res.success) {
        setExportData(res.data);
        setMessage("Export successful! Data ready for Power BI import.");
      } else {
        setMessage(res.message || "Export failed");
      }
    } catch (e: any) {
      setMessage(e?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!exportData) return;
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `powerbi-export-${activeExport}-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Power BI Export Module</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">SRS 3.5 - Power BI Integration & Data Export</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Export Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module (for Time Series)</label>
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="RESIN">Resin QC</option>
              <option value="HARDENER">Hardener QC</option>
              <option value="LMS">LMS QC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name (for Time Series)</label>
            <input
              type="text"
              value={filters.productName}
              onChange={(e) => setFilters({ ...filters, productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade (for Time Series)</label>
            <input
              type="text"
              value={filters.grade}
              onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Folder (for R&D Trials)</label>
            <input
              type="text"
              value={filters.productFolder}
              onChange={(e) => setFilters({ ...filters, productFolder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => handleExport("resin-qc")}
          disabled={loading}
          className="p-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          Export Resin QC (SRS 3.5.1)
        </button>
        <button
          onClick={() => handleExport("hardener-qc")}
          disabled={loading}
          className="p-4 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          Export Hardener QC (SRS 3.5.2)
        </button>
        <button
          onClick={() => handleExport("timeseries-qc")}
          disabled={loading}
          className="p-4 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          Export Time Series QC (SRS 3.5.3)
        </button>
        <button
          onClick={() => handleExport("rd-trials")}
          disabled={loading}
          className="p-4 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
        >
          Export R&D Trials (SRS 3.5.4)
        </button>
        <button
          onClick={() => handleExport("qa-logs")}
          disabled={loading}
          className="p-4 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
        >
          Export QA Logs (SRS 3.5.5)
        </button>
        <button
          onClick={() => handleExport("all")}
          disabled={loading}
          className="p-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          Export All Data (SRS 3.5.6)
        </button>
      </div>

      {exportData && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Export Results</h3>
            <button
              onClick={downloadJSON}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Download JSON
            </button>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Export Type:</strong> {activeExport}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Records Exported:</strong> {exportData.recordCount || "N/A"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Date Range:</strong> {filters.from || "N/A"} to {filters.to || "N/A"}
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Data Preview (first 3 records):</h4>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-auto max-h-96">
                {JSON.stringify(exportData.data?.slice(0, 3) || exportData.slice(0, 3) || exportData, null, 2)}
              </pre>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Power BI Import Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>Download the JSON file using the button above</li>
                <li>Open Power BI Desktop</li>
                <li>Go to Home → Get Data → JSON</li>
                <li>Select the downloaded JSON file</li>
                <li>Transform and load the data as needed</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

