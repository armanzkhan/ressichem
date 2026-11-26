"use client";

import React, { useEffect, useState } from "react";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, storedProductionDepartments, type DprRow, type ProductionDepartment, type ProductionEntry } from "@/lib/productionApi";
import { procurementFieldClass, procurementLabelClass, procurementPanelClass } from "@/components/procurement/procurementTheme";
import { SearchableSelect } from "@/components/procurement/SearchableSelect";
import { Modal } from "@/components/procurement/procurement-ui";
import { SheetRecordDialog } from "@/components/production/ProcessSheets";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const REPORTS = [
  { id: "daily", label: "Daily" },
  { id: "batch", label: "Batch-wise" },
  { id: "reactor", label: "Reactor-wise" },
  { id: "grade", label: "Grade-wise" },
  { id: "reactor-batch", label: "Reactor and batch" },
  { id: "weekly", label: "Weekly" },
  // { id: "monthly", label: "Monthly" },
] as const;

type ReportMode = (typeof REPORTS)[number]["id"];

const LEAD: Record<ReportMode, string[]> = {
  daily: ["Date", "Factory", "Dept", "Grade", "Reactor / Machine", "Operator", "Kit size"],
  batch: ["Dates", "Dept", "Batch", "Grade", "Reactor", "Operator"],
  reactor: ["Dates", "Dept", "Reactor", "Grade", "Operator"],
  grade: ["Dates", "Dept", "Grade", "Operator"],
  "reactor-batch": ["Dates", "Dept", "Reactor", "Batch", "Grade", "Operator"],
  weekly: ["Week", "Dept", "Reactor", "Grade", "Operator"],
  monthly: ["Month", "Dept", "Grade", "Operator"],
};

const TABLE_TAIL = ["Output"];

function kg(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function chartName(report: ReportMode, row: DprRow) {
  if (report === "batch") return row.batch || "—";
  if (report === "reactor") return row.reactor || "—";
  if (report === "grade") return row.grade || "—";
  if (report === "reactor-batch") return `${row.reactor || "—"} · ${row.batch || "—"}`;
  return row.date || "—";
}

function chartTitle(report: ReportMode) {
  if (report === "batch") return "Output by batch";
  if (report === "reactor") return "Output by reactor";
  if (report === "grade") return "Output by grade";
  if (report === "reactor-batch") return "Output by reactor and batch";
  if (report === "weekly") return "Output by week";
  if (report === "monthly") return "Output by month";
  return "Output by day";
}

function barsFor(report: ReportMode, rows: DprRow[]) {
  const map = new Map<string, { name: string; Output: number; Planned: number; sort: string }>();
  for (const row of rows) {
    const name = chartName(report, row);
    const current = map.get(name) || { name, Output: 0, Planned: 0, sort: row.dateStart || row.date || name };
    current.Output += Number(row.outputKg) || 0;
    current.Planned += Number(row.plannedQtyKg) || 0;
    const sort = row.dateStart || row.date || name;
    if (sort < current.sort) current.sort = sort;
    map.set(name, current);
  }
  const values = [...map.values()];
  if (report === "weekly" || report === "monthly" || report === "daily") {
    return values.sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
  }
  return values.sort((a, b) => b.Output - a.Output).slice(0, 12);
}

function departmentBars(rows: DprRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = DEPARTMENT_META[row.department]?.short || row.department;
    map.set(name, (map.get(name) || 0) + (Number(row.outputKg) || 0));
  }
  return [...map.entries()].map(([name, Output]) => ({ name, Output }));
}

function operatorName(row: DprRow) {
  return (row.operators || []).filter(Boolean).join(", ") || "—";
}

function leadValues(report: ReportMode, row: DprRow) {
  const factory = FACTORY_LABEL[row.factory];
  const dept = DEPARTMENT_META[row.department]?.short || row.department;
  const reactor = row.reactor || "—";
  const place = row.department === "zrs" ? reactor : row.machine && row.machine !== "—" ? row.machine : "—";
  const operator = operatorName(row);
  if (report === "batch") return [row.date, dept, row.batch || "—", row.grade, reactor, operator];
  if (report === "reactor") return [row.date, dept, reactor, row.grade, operator];
  if (report === "grade") return [row.date, dept, row.grade, operator];
  if (report === "reactor-batch") return [row.date, dept, reactor, row.batch || "—", row.grade, operator];
  if (report === "weekly") return [row.date, dept, reactor, row.grade, operator];
  if (report === "monthly") return [row.date, dept, row.grade, operator];
  return [row.date, factory, dept, row.grade, place, operator, row.kitSize && row.kitSize !== "—" ? row.kitSize : "—"];
}

export default function DailyProductionReportPage() {
  const [report, setReport] = useState<ReportMode>("daily");
  const [filters, setFilters] = useState({
    factory: "",
    department: "",
    from: "",
    to: "",
    shift: "",
    reactor: "",
    grade: "",
    batch: "",
  });
  const [filterLists, setFilterLists] = useState<{
    reactors: string[];
    grades: string[];
    batches: string[];
    byDepartment: Record<string, { reactors: string[]; grades: string[]; batches: string[] }>;
  }>({ reactors: [], grades: [], batches: [], byDepartment: {} });
  const [rows, setRows] = useState<DprRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [departments, setDepartments] = useState<ProductionDepartment[]>(["zrs", "lms", "drymix", "bfs"]);
  const [viewing, setViewing] = useState<ProductionEntry | null>(null);
  const [choices, setChoices] = useState<ProductionEntry[] | null>(null);

  const reportQuery = (mode: ReportMode) => {
    const p = new URLSearchParams();
    p.set("group", mode);
    const activeLists =
      filters.department && filterLists.byDepartment[filters.department]
        ? filterLists.byDepartment[filters.department]
        : filterLists;
    const listed = (options: string[], value: string) =>
      options.some((option) => option.toLowerCase() === value.trim().toLowerCase());
    Object.entries(filters).forEach(([key, value]) => {
      if (value) p.set(key, value);
    });
    if (filters.reactor && !listed(activeLists.reactors, filters.reactor)) p.set("reactorMatch", "partial");
    if (filters.grade && !listed(activeLists.grades, filters.grade)) p.set("gradeMatch", "partial");
    if (filters.batch && !listed(activeLists.batches, filters.batch)) p.set("batchMatch", "partial");
    return `?${p.toString()}`;
  };

  const run = async (e?: React.FormEvent, mode: ReportMode = report) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await productionApi.dpr(reportQuery(mode));
      setRows(res.data || []);
      setRan(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("group") || "daily";
    const mode = REPORTS.some((item) => item.id === requested) ? (requested as ReportMode) : "daily";
    setReport(mode);
    setDepartments(storedProductionDepartments());
    productionApi
      .filters()
      .then((res) => setFilterLists(res.data))
      .catch(() => setFilterLists({ reactors: [], grades: [], batches: [], byDepartment: {} }));
    void run(undefined, mode);
    // Load the report once. Later runs use the filters and report the user submits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lists =
    filters.department && filterLists.byDepartment[filters.department]
      ? filterLists.byDepartment[filters.department]
      : filterLists;
  const keepSearch = (value: string, previous: string[], next: string[]) => {
    const typed = value.trim();
    if (!typed) return "";
    const wasListed = previous.some((option) => option.toLowerCase() === typed.toLowerCase());
    if (!wasListed) return value;
    return next.some((option) => option.toLowerCase() === typed.toLowerCase()) ? value : "";
  };

  const sum = (key: keyof DprRow) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  const outputBars = barsFor(report, rows);
  const deptBars = departmentBars(rows);

  const chooseReport = (mode: ReportMode) => {
    setReport(mode);
    void run(undefined, mode);
  };

  const openGroup = async (row: DprRow) => {
    setError("");
    try {
      const params = new URLSearchParams({
        department: row.department,
        factory: row.factory,
        from: row.dateStart || row.date,
        to: row.dateEnd || row.dateStart || row.date,
      });
      if (report === "daily" && row.shift && row.shift !== "—") params.set("shift", row.shift);
      if ((report === "daily" || report === "grade" || report === "reactor-batch") && row.grade && row.grade !== "—" && !row.grade.includes(",")) {
        params.set("grade", row.grade);
      }
      if ((report === "batch" || report === "reactor-batch") && row.batch && row.batch !== "—") {
        if (row.batch.includes(" / ")) {
          const [resin, hardener] = row.batch.split(" / ");
          if (resin) params.set("resinBatch", resin);
          if (hardener) params.set("hardenerBatch", hardener);
        } else params.set("batch", row.batch);
      }
      if ((report === "reactor" || report === "reactor-batch" || report === "weekly") && row.reactor && row.reactor !== "—" && !row.reactor.includes(",")) {
        params.set("reactor", row.reactor);
      }
      if (report === "daily" && row.kitSize && row.kitSize !== "—" && !row.kitSize.includes(",")) {
        params.set("kitSize", row.kitSize);
      }
      const res = await productionApi.list(`?${params.toString()}`);
      const matched = (res.data || []).filter((entry) => {
        const reactor = entry.reactor || "—";
        return !row.reactor || row.reactor === "—" || row.reactor.split(", ").includes(reactor);
      });
      const found = report === "daily" && matched.length ? matched : res.data || [];
      if (found.length === 1) setViewing(found[0]);
      else setChoices(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that report line");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">Production reports</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Choose a report. The chart and the table both follow that choice. Click a table line to open the batch sheet.
        </p>
      </div>
      <div className="no-print flex flex-wrap gap-2">
        {REPORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              report === item.id
                ? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 dark:text-blue-100"
            }
            onClick={() => chooseReport(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-800 dark:text-blue-100"
          onClick={() => {
            productionApi.exportDpr(reportQuery(report), "xlsx").catch((err) => setError(err instanceof Error ? err.message : "Export failed"));
          }}
        >
          Export Excel
        </button>
        <button
          type="button"
          className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-800 dark:text-blue-100"
          onClick={() => {
            productionApi.exportDpr(reportQuery(report), "csv").catch((err) => setError(err instanceof Error ? err.message : "Export failed"));
          }}
        >
          Export CSV
        </button>
        {ran && rows.length ? (
          <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white" onClick={() => window.print()}>
            Print report
          </button>
        ) : null}
      </div>
      <form onSubmit={run} className={`${procurementPanelClass} no-print grid grid-cols-2 gap-3 p-3 md:grid-cols-4 xl:grid-cols-5`}>
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
          <select
            className={procurementFieldClass}
            value={filters.department}
            onChange={(e) => {
              const department = e.target.value;
              const next = department && filterLists.byDepartment[department] ? filterLists.byDepartment[department] : filterLists;
              setFilters({
                ...filters,
                department,
                reactor: keepSearch(filters.reactor, lists.reactors, next.reactors),
                grade: keepSearch(filters.grade, lists.grades, next.grades),
                batch: keepSearch(filters.batch, lists.batches, next.batches),
              });
            }}
          >
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
          Reactor
          <SearchableSelect
            freeText
            className={procurementFieldClass}
            placeholder="Type a reactor…"
            value={filters.reactor}
            options={lists.reactors.map((reactor) => ({ value: reactor, label: reactor }))}
            onChange={(reactor) => setFilters({ ...filters, reactor })}
          />
        </label>
        <label className={procurementLabelClass}>
          Grade
          <SearchableSelect
            freeText
            className={procurementFieldClass}
            placeholder="Type a grade…"
            value={filters.grade}
            options={lists.grades.map((grade) => ({ value: grade, label: grade }))}
            onChange={(grade) => setFilters({ ...filters, grade })}
          />
        </label>
        <label className={procurementLabelClass}>
          Batch no.
          <SearchableSelect
            freeText
            className={procurementFieldClass}
            placeholder="Type a batch no…"
            value={filters.batch}
            options={lists.batches.map((batch) => ({ value: batch, label: batch }))}
            onChange={(batch) => setFilters({ ...filters, batch })}
          />
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
      {ran ? (
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {REPORTS.find((item) => item.id === report)?.label}: Output {kg(sum("outputKg"))} KG · Planned {kg(sum("plannedQtyKg"))} KG · Packed {kg(sum("packingKg"))} KG · Wastage {kg(sum("wastageKg"))} KG
        </p>
      ) : null}
      {ran && rows.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`${procurementPanelClass} p-3`}>
            <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">{chartTitle(report)}</h3>
            <div className="overflow-hidden" style={{ height: Math.max(220, outputBars.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outputBars} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={report === "weekly" ? 176 : 148} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Output" fill="#1d4ed8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className={`${procurementPanelClass} p-3`}>
            <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">Output by department</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBars}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Output" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      ) : null}
      <div className={procurementPanelClass}>
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-blue-50 uppercase text-blue-800 dark:bg-slate-800 dark:text-blue-100">
            <tr>
              {[...LEAD[report], ...TABLE_TAIL].map((h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!ran ? (
              <tr>
                <td className="px-3 py-4 text-sm text-blue-700" colSpan={LEAD[report].length + TABLE_TAIL.length}>
                  {loading ? "Loading the report…" : "Choose a report and run it."}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-blue-700" colSpan={LEAD[report].length + TABLE_TAIL.length}>
                  No production for this selection.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${report}-${row.date}-${row.factory}-${row.department}-${row.shift}-${row.grade}-${row.batch}-${row.reactor}-${row.machine}-${row.kitSize}`}
                  className="cursor-pointer border-t border-blue-100 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800/80"
                  onClick={() => void openGroup(row)}
                >
                  {leadValues(report, row).map((value, index) => (
                    <td key={`${index}-${value}`} className="break-words px-2 py-2">
                      {value}
                    </td>
                  ))}
                  <td className="px-2 py-2 font-semibold">{kg(row.outputKg)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {choices ? (
        <Modal title="Batches in this report line" onClose={() => setChoices(null)}>
          {choices.length === 0 ? <p className="text-sm text-blue-700">No batch sheet for this line.</p> : null}
          <ul className="space-y-2">
            {choices.map((entry) => (
              <li key={entry._id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-blue-100 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  onClick={() => {
                    setChoices(null);
                    setViewing(entry);
                  }}
                >
                  <span className="font-semibold text-blue-950 dark:text-blue-50">
                    {entry.batchNumber || entry.resinBatch || entry.grade || "Batch"}
                  </span>
                  <span className="mt-1 block text-blue-800 dark:text-blue-100">
                    {entry.outputKg} KG · {entry.operator || "No operator"} · QC {entry.qcStatus || "pending"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}
      {viewing ? <SheetRecordDialog entry={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
