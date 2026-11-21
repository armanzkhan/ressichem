"use client";

import React, { useEffect, useState } from "react";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, type ProductionEntry } from "@/lib/productionApi";
import { procurementFieldClass, procurementPanelClass } from "@/components/procurement/procurementTheme";
import { SheetRecordDialog } from "@/components/production/ProcessSheets";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function outputBy(rows: ProductionEntry[], key: (row: ProductionEntry) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = key(row) || "—";
    map.set(name, (map.get(name) || 0) + (Number(row.outputKg) || 0));
  }
  return [...map.entries()]
    .map(([name, Output]) => ({ name, Output }))
    .sort((a, b) => b.Output - a.Output)
    .slice(0, 12);
}

function TraceCharts({ title, rows }: { title: string; rows: ProductionEntry[] }) {
  const byDept = outputBy(rows, (row) => DEPARTMENT_META[row.department]?.short || row.department);
  const byGrade = outputBy(rows, (row) => row.grade || row.batchNumber || "—");
  if (!rows.length) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={`${procurementPanelClass} p-3`}>
        <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">{title} by department</h3>
        <div className="h-64 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDept}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="Output" fill="#1d4ed8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className={`${procurementPanelClass} p-3`}>
        <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">{title} by grade</h3>
        <div className="overflow-hidden" style={{ height: Math.max(220, byGrade.length * 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byGrade} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Output" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function LineList({ title, rows, onOpen }: { title: string; rows: ProductionEntry[]; onOpen: (row: ProductionEntry) => void }) {
  return (
    <section className={`${procurementPanelClass} p-3`}>
      <h3 className="mb-2 font-semibold text-blue-950 dark:text-blue-50">
        {title} ({rows.length})
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-blue-700">No matching records.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row._id}>
              <button
                type="button"
                className="w-full rounded-lg border border-blue-100 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={() => onOpen(row)}
              >
              <p className="font-semibold text-blue-950 dark:text-blue-50">
                {DEPARTMENT_META[row.department]?.label} · {FACTORY_LABEL[row.factory]} · {row.grade}
              </p>
              <p className="text-blue-800 dark:text-blue-100">
                Batch {row.batchNumber || row.finishedBatch || "—"}
                {row.resinBatch ? ` · Resin ${row.resinBatch}` : ""}
                {row.hardenerBatch ? ` · Hardener ${row.hardenerBatch}` : ""}
                {" · "}
                {row.outputKg} KG · QC {row.qcStatus}
                {row.specCheck ? ` · ${row.specCheck}` : ""}
                {row.labReportRef ? ` · Report ${row.labReportRef}` : ""}
                {" · "}Release {row.releaseStatus}
              </p>
              {row.labRecords?.length ? (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                  Laboratory:{" "}
                  {row.labRecords.map((lab) => `${lab.source} ${lab.area} ${lab.batchNo} ${lab.status}`).join("; ")}
                </p>
              ) : (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">No laboratory record linked for this batch yet.</p>
              )}
              {row.materials?.length ? (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                  Materials:{" "}
                  {row.materials
                    .map((line) => {
                      const recipe = line.recipe ? `, recipe ${line.recipe}` : "";
                      const actual = line.actual ? `, actual ${line.actual}` : "";
                      return `${line.name || line.code} lot ${line.lotNumber || "—"}${recipe}${actual} (${line.qtyConsumed || 0} KG, QC ${line.qcStatus || "—"})`;
                    })
                    .join("; ")}
                </p>
              ) : null}
              {row.processNotes ? <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">{row.processNotes}</p> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TraceabilityPage() {
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<ProductionEntry[]>([]);
  const [production, setProduction] = useState<ProductionEntry[] | null>(null);
  const [packing, setPacking] = useState<ProductionEntry[] | null>(null);
  const [viewing, setViewing] = useState<ProductionEntry | null>(null);

  useEffect(() => {
    productionApi
      .list("?limit=24")
      .then((res) => setRecent(res.data || []))
      .catch(() => setRecent([]));
  }, []);

  const runTrace = async (value: string) => {
    const term = value.trim();
    setQ(term);
    setError("");
    if (!term) return;
    try {
      const res = await productionApi.trace(term);
      setProduction(res.data.production);
      setPacking(res.data.packing);
    } catch (err) {
      setProduction(null);
      setPacking(null);
      setError(err instanceof Error ? err.message : "Search failed");
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    await runTrace(q);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">Batch traceability</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Search a finished batch to see the recipe lines, raw-material lots, process record, laboratory status, and packing. Search a raw-material lot to see every batch that consumed it.
        </p>
      </div>
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input
          className={`${procurementFieldClass} min-w-[16rem] flex-1`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Batch, lot, grade, or material"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Trace
        </button>
      </form>
      {recent.length ? (
        <div className={`${procurementPanelClass} p-3`}>
          <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">Saved batches</h3>
          <div className="flex flex-wrap gap-2">
            {recent.map((row) => {
              const label = row.batchNumber || row.finishedBatch || row.grade;
              return (
                <button
                  key={row._id}
                  type="button"
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-left text-xs text-blue-900 hover:bg-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-100"
                  onClick={() => void runTrace(label)}
                >
                  {label}
                  <span className="mt-0.5 block text-[10px] text-blue-700 dark:text-blue-300">
                    {DEPARTMENT_META[row.department]?.label} · {FACTORY_LABEL[row.factory]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-blue-700 dark:text-blue-200">No saved batches to trace yet.</p>
      )}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {production ? <TraceCharts title="Traced output" rows={production} /> : <TraceCharts title="Saved output" rows={recent} />}
      {!production && !packing && !error ? (
        <p className="text-sm text-blue-700 dark:text-blue-200">Choose a saved batch, or type a batch, lot, grade, or material, then press Trace.</p>
      ) : null}
      {production && packing ? (
        <>
          <LineList title="Production batches" rows={production} onOpen={setViewing} />
          <LineList title="Packing entries" rows={packing} onOpen={setViewing} />
        </>
      ) : null}
      {viewing ? <SheetRecordDialog entry={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
