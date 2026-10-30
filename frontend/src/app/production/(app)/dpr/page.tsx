"use client";

import React, { useState } from "react";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, storedProductionDepartments, type DprRow, type ProductionDepartment, type ProductionEntry } from "@/lib/productionApi";
import { procurementFieldClass, procurementLabelClass, procurementPanelClass } from "@/components/procurement/procurementTheme";
import { ProcessSheetView } from "@/components/production/ProcessSheets";

function kg(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DailyProductionReportPage() {
  const [filters, setFilters] = useState({ factory: "", department: "", from: "", to: "", shift: "" });
  const [rows, setRows] = useState<DprRow[]>([]);
  const [sheets, setSheets] = useState<ProductionEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [departments, setDepartments] = useState<ProductionDepartment[]>(["zrs", "lms", "drymix", "bfs"]);

  React.useEffect(() => {
    setDepartments(storedProductionDepartments());
  }, []);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) p.set(key, value);
      });
      const query = p.toString() ? `?${p.toString()}` : "";
      const [res, list] = await Promise.all([productionApi.dpr(query), productionApi.list(query)]);
      setRows(res.data || []);
      setSheets(list.data || []);
      setRan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setLoading(false);
    }
  };

  const sum = (key: keyof DprRow) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">Daily Production Report</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Reactor Area, Liquid (LMS), Drymix, and BFS sheets for the selected day, in the same layout as the paper process logs.
        </p>
      </div>
      {ran && sheets.length ? (
        <button type="button" className="no-print rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white" onClick={() => window.print()}>
          Print sheets
        </button>
      ) : null}
      <form onSubmit={run} className={`${procurementPanelClass} no-print grid grid-cols-2 gap-3 p-3 md:grid-cols-6`}>
        <label className={procurementLabelClass}>
          Factory
          <select className={procurementFieldClass} value={filters.factory} onChange={(e) => setFilters({ ...filters, factory: e.target.value })}>
            <option value="">All</option>
            <option value="hub">Hub</option>
            <option value="site">SITE</option>
            <option value="lahore">Lahore</option>
          </select>
        </label>
        <label className={procurementLabelClass}>
          Department
          <select className={procurementFieldClass} value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
            <option value="">All</option>
            {departments.map((id) => (
              <option key={id} value={id}>
                {DEPARTMENT_META[id].short}
              </option>
            ))}
          </select>
        </label>
        <label className={procurementLabelClass}>
          From
          <input type="date" className={procurementFieldClass} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </label>
        <label className={procurementLabelClass}>
          To
          <input type="date" className={procurementFieldClass} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </label>
        <label className={procurementLabelClass}>
          Shift
          <select className={procurementFieldClass} value={filters.shift} onChange={(e) => setFilters({ ...filters, shift: e.target.value })}>
            <option value="">All</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
            <option>General</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
            {loading ? "Loading…" : "Run report"}
          </button>
        </div>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {ran
        ? sheets.map((sheet) => <ProcessSheetView key={sheet._id} entry={sheet} />)
        : null}
      {ran ? (
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Output {kg(sum("outputKg"))} KG · Packed {kg(sum("packingKg"))} KG · Consumed {kg(sum("materialConsumed"))} KG · Wastage {kg(sum("wastageKg"))} KG · Pending QC {sum("pendingQc")}
        </p>
      ) : null}
      <div className={`${procurementPanelClass} no-print overflow-x-auto`}>
        <table className="min-w-full text-left text-xs">
          <thead className="bg-blue-50 uppercase text-blue-800 dark:bg-slate-800 dark:text-blue-100">
            <tr>
              {["Date", "Factory", "Dept", "Shift", "Grade", "Machine", "WIP open", "WIP close", "Planned", "Output", "Packed", "Consumed", "Reject", "Waste", "Rework", "Downtime", "Pending QC", "Yield", "Operators"].map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!ran ? (
              <tr>
                <td className="px-3 py-4 text-sm text-blue-700" colSpan={19}>
                  Choose filters and run the report.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-blue-700" colSpan={19}>
                  No production for this selection.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.date}-${row.factory}-${row.department}-${row.shift}-${row.grade}-${row.machine}`} className="border-t border-blue-100 dark:border-slate-800">
                  <td className="px-2 py-2 whitespace-nowrap">{row.date}</td>
                  <td className="px-2 py-2">{FACTORY_LABEL[row.factory]}</td>
                  <td className="px-2 py-2">{DEPARTMENT_META[row.department]?.short}</td>
                  <td className="px-2 py-2">{row.shift}</td>
                  <td className="px-2 py-2">{row.grade}</td>
                  <td className="px-2 py-2">{row.machine}</td>
                  <td className="px-2 py-2">{kg(row.wipOpeningKg)}</td>
                  <td className="px-2 py-2">{kg(row.wipClosingKg)}</td>
                  <td className="px-2 py-2">{kg(row.plannedQtyKg)}</td>
                  <td className="px-2 py-2 font-semibold">{kg(row.outputKg)}</td>
                  <td className="px-2 py-2">{kg(row.packingKg)}</td>
                  <td className="px-2 py-2">{kg(row.materialConsumed)}</td>
                  <td className="px-2 py-2">{kg(row.rejectedKg)}</td>
                  <td className="px-2 py-2">{kg(row.wastageKg)}</td>
                  <td className="px-2 py-2">{kg(row.reworkKg)}</td>
                  <td className="px-2 py-2">{row.downtimeMinutes}</td>
                  <td className="px-2 py-2">{row.pendingQc}</td>
                  <td className="px-2 py-2">{row.yieldPct == null ? "—" : `${row.yieldPct}%`}</td>
                  <td className="px-2 py-2">{row.operators.join(", ") || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
