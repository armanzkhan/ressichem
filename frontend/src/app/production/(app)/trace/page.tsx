"use client";

import React, { useState } from "react";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, type ProductionEntry } from "@/lib/productionApi";
import { procurementFieldClass, procurementPanelClass } from "@/components/procurement/procurementTheme";

function LineList({ title, rows }: { title: string; rows: ProductionEntry[] }) {
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
            <li key={row._id} className="rounded-lg border border-blue-100 px-3 py-2 text-sm dark:border-slate-700">
              <p className="font-semibold text-blue-950 dark:text-blue-50">
                {DEPARTMENT_META[row.department]?.label} · {FACTORY_LABEL[row.factory]} · {row.grade}
              </p>
              <p className="text-blue-800 dark:text-blue-100">
                Batch {row.batchNumber || row.finishedBatch || "—"}
                {row.resinBatch ? ` · Resin ${row.resinBatch}` : ""}
                {row.hardenerBatch ? ` · Hardener ${row.hardenerBatch}` : ""}
                {" · "}
                {row.outputKg} KG · QC {row.qcStatus} · Release {row.releaseStatus}
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
                    .map((line) => `${line.name || line.code} lot ${line.lotNumber || "—"} (${line.qtyConsumed || 0} KG, QC ${line.qcStatus || "—"})`)
                    .join("; ")}
                </p>
              ) : null}
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
  const [production, setProduction] = useState<ProductionEntry[] | null>(null);
  const [packing, setPacking] = useState<ProductionEntry[] | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await productionApi.trace(q.trim());
      setProduction(res.data.production);
      setPacking(res.data.packing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
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
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {production && packing ? (
        <>
          <LineList title="Production batches" rows={production} />
          <LineList title="Packing entries" rows={packing} />
        </>
      ) : null}
    </div>
  );
}
