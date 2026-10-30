"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DEPARTMENT_META,
  FACTORY_LABEL,
  productionApi,
  type MaterialLine,
  type ProductionCatalog,
  type ProductionDepartment,
  type ProductionEntry,
  type ProductionFactory,
} from "@/lib/productionApi";
import { procurementFieldClass, procurementLabelClass, procurementPanelClass, procurementSecondaryButtonClass } from "@/components/procurement/procurementTheme";
import { ProcessSheetEditor } from "@/components/production/ProcessSheets";

type FormState = {
  factory: ProductionFactory | "";
  recordDate: string;
  grade: string;
  batchNumber: string;
  reactor: string;
  outputKg: string;
  plannedQtyKg: string;
  shift: string;
  operator: string;
  supervisor: string;
  startTime: string;
  endTime: string;
  machine: string;
  temperature: string;
  mixingTime: string;
  speed: string;
  processNotes: string;
  recipeName: string;
  recipeRevision: string;
  materials: MaterialLine[];
  qcStatus: string;
  labReportRef: string;
  resinBatch: string;
  hardenerBatch: string;
  kitSizeKg: string;
  kitQuantity: string;
  releaseStatus: string;
  wipOpeningKg: string;
  wipClosingKg: string;
  wastageKg: string;
  rejectedKg: string;
  reworkKg: string;
  downtimeMinutes: string;
  downtimeReason: string;
  deviation: string;
  lossReason: string;
};

const emptyMaterial = (): MaterialLine => ({
  name: "",
  code: "",
  lotNumber: "",
  qtyIssued: 0,
  qtyConsumed: 0,
  supplier: "",
  qcStatus: "",
  source: "manual",
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    factory: "hub",
    recordDate: today(),
    grade: "",
    batchNumber: "",
    reactor: "",
    outputKg: "",
    plannedQtyKg: "",
    shift: "",
    operator: "",
    supervisor: "",
    startTime: "",
    endTime: "",
    machine: "",
    temperature: "",
    mixingTime: "",
    speed: "",
    processNotes: "",
    recipeName: "",
    recipeRevision: "",
    materials: [],
    qcStatus: "pending",
    labReportRef: "",
    resinBatch: "",
    hardenerBatch: "",
    kitSizeKg: "",
    kitQuantity: "",
    releaseStatus: "pending",
    wipOpeningKg: "",
    wipClosingKg: "",
    wastageKg: "",
    rejectedKg: "",
    reworkKg: "",
    downtimeMinutes: "",
    downtimeReason: "",
    deviation: "",
    lossReason: "",
  };
}

function kg(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function dateLabel(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function entryToForm(row: ProductionEntry): FormState {
  return {
    factory: row.factory,
    recordDate: row.recordDate ? String(row.recordDate).slice(0, 10) : today(),
    grade: row.grade || "",
    batchNumber: row.batchNumber || "",
    reactor: row.reactor || "",
    outputKg: row.outputKg ? String(row.outputKg) : "",
    plannedQtyKg: row.plannedQtyKg ? String(row.plannedQtyKg) : "",
    shift: row.shift || "",
    operator: row.operator || "",
    supervisor: row.supervisor || "",
    startTime: row.startTime || "",
    endTime: row.endTime || "",
    machine: row.machine || "",
    temperature: row.temperature || "",
    mixingTime: row.mixingTime || "",
    speed: row.speed || "",
    processNotes: row.processNotes || "",
    recipeName: row.recipeName || "",
    recipeRevision: row.recipeRevision || "",
    materials: row.materials?.length ? row.materials : [],
    qcStatus: row.qcStatus || "pending",
    labReportRef: row.labReportRef || "",
    resinBatch: row.resinBatch || "",
    hardenerBatch: row.hardenerBatch || "",
    kitSizeKg: row.kitSizeKg ? String(row.kitSizeKg) : "",
    kitQuantity: row.kitQuantity ? String(row.kitQuantity) : "",
    releaseStatus: row.releaseStatus || "pending",
    wipOpeningKg: row.wipOpeningKg ? String(row.wipOpeningKg) : "",
    wipClosingKg: row.wipClosingKg ? String(row.wipClosingKg) : "",
    wastageKg: row.wastageKg ? String(row.wastageKg) : "",
    rejectedKg: row.rejectedKg ? String(row.rejectedKg) : "",
    reworkKg: row.reworkKg ? String(row.reworkKg) : "",
    downtimeMinutes: row.downtimeMinutes ? String(row.downtimeMinutes) : "",
    downtimeReason: row.downtimeReason || "",
    deviation: row.deviation || "",
    lossReason: row.lossReason || "",
  };
}

export function ProductionLog({ department }: { department: ProductionDepartment }) {
  const meta = DEPARTMENT_META[department];
  const [catalog, setCatalog] = useState<ProductionCatalog | null>(null);
  const [rows, setRows] = useState<ProductionEntry[]>([]);
  const [totals, setTotals] = useState({ count: 0, outputKg: 0, plannedQtyKg: 0, wastageKg: 0, rejectedKg: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [filters, setFilters] = useState({
    factory: "",
    grade: "",
    batch: "",
    reactor: "",
    from: "",
    to: "",
    shift: "",
    resinBatch: "",
    hardenerBatch: "",
  });

  const grades = catalog?.grades[department] || [];
  const listId = `grades-${department}`;
  const reactorId = `reactors-${department}`;

  const query = useMemo(() => {
    const p = new URLSearchParams({ department });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) p.set(key, value);
    });
    return `?${p.toString()}`;
  }, [department, filters]);

  const load = async (q = query) => {
    setLoading(true);
    setError("");
    try {
      const res = await productionApi.list(q);
      setRows(res.data || []);
      setTotals(res.totals || { count: 0, outputKg: 0, plannedQtyKg: 0, wastageKg: 0, rejectedKg: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productionApi.catalog().then((res) => setCatalog(res.data)).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const calculatedOutput =
    meta.packing && Number(form.kitSizeKg) > 0 && Number(form.kitQuantity) > 0
      ? Math.round(Number(form.kitSizeKg) * Number(form.kitQuantity) * 1000) / 1000
      : null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        department,
        outputKg: meta.packing ? calculatedOutput || 0 : Number(form.outputKg) || 0,
        plannedQtyKg: Number(form.plannedQtyKg) || 0,
        kitSizeKg: Number(form.kitSizeKg) || 0,
        kitQuantity: Number(form.kitQuantity) || 0,
        wipOpeningKg: Number(form.wipOpeningKg) || 0,
        wipClosingKg: Number(form.wipClosingKg) || 0,
        wastageKg: Number(form.wastageKg) || 0,
        rejectedKg: Number(form.rejectedKg) || 0,
        reworkKg: Number(form.reworkKg) || 0,
        downtimeMinutes: Number(form.downtimeMinutes) || 0,
      };
      if (editingId) await productionApi.update(editingId, body);
      else await productionApi.create(body);
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">{meta.label}</h2>
          <p className="text-sm text-blue-700 dark:text-blue-200">
            {meta.packing
              ? "Each row is one packing entry. Output KG is kit size × kit quantity."
              : "Each row is one production batch. Output is recorded in kilograms."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={procurementSecondaryButtonClass}
            onClick={() => productionApi.exportCsv(query).catch((err) => setError(err.message))}
          >
            Export
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm());
              setFormOpen(true);
            }}
          >
            Add record
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      ) : null}

      <section className={`${procurementPanelClass} p-3`}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
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
            From
            <input type="date" className={procurementFieldClass} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </label>
          <label className={procurementLabelClass}>
            To
            <input type="date" className={procurementFieldClass} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </label>
          <label className={procurementLabelClass}>
            Grade
            <input className={procurementFieldClass} value={filters.grade} onChange={(e) => setFilters({ ...filters, grade: e.target.value })} placeholder="Grade" />
          </label>
          {meta.packing ? (
            <>
              <label className={procurementLabelClass}>
                Resin batch
                <input className={procurementFieldClass} value={filters.resinBatch} onChange={(e) => setFilters({ ...filters, resinBatch: e.target.value })} />
              </label>
              <label className={procurementLabelClass}>
                Hardener batch
                <input className={procurementFieldClass} value={filters.hardenerBatch} onChange={(e) => setFilters({ ...filters, hardenerBatch: e.target.value })} />
              </label>
            </>
          ) : (
            <label className={procurementLabelClass}>
              Batch #
              <input className={procurementFieldClass} value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} />
            </label>
          )}
          {meta.reactor ? (
            <label className={procurementLabelClass}>
              Reactor
              <input className={procurementFieldClass} list={reactorId} value={filters.reactor} onChange={(e) => setFilters({ ...filters, reactor: e.target.value })} />
            </label>
          ) : null}
          <label className={procurementLabelClass}>
            Shift
            <select className={procurementFieldClass} value={filters.shift} onChange={(e) => setFilters({ ...filters, shift: e.target.value })}>
              <option value="">All</option>
              {(catalog?.shifts || ["A", "B", "C", "General"]).map((shift) => (
                <option key={shift}>{shift}</option>
              ))}
            </select>
          </label>
        </div>
        {meta.reactor ? (
          <datalist id={reactorId}>
            {(catalog?.reactors || []).map((reactor) => (
              <option key={reactor} value={reactor} />
            ))}
          </datalist>
        ) : null}
        <p className="mt-3 text-sm font-semibold text-blue-900 dark:text-blue-100">
          Visible output: {kg(totals.outputKg)} KG · {totals.count} record{totals.count === 1 ? "" : "s"}
          {totals.plannedQtyKg > 0 ? ` · Planned ${kg(totals.plannedQtyKg)} KG` : ""}
        </p>
      </section>

      <div className={`${procurementPanelClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-blue-50 text-xs uppercase tracking-wide text-blue-800 dark:bg-slate-800 dark:text-blue-100">
            <tr>
              <th className="px-3 py-2">{meta.dateLabel}</th>
              <th className="px-3 py-2">Factory</th>
              <th className="px-3 py-2">Grade</th>
              {meta.packing ? (
                <>
                  <th className="px-3 py-2">Resin batch</th>
                  <th className="px-3 py-2">Hardener batch</th>
                  <th className="px-3 py-2">Kit size</th>
                  <th className="px-3 py-2">Kits</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2">Batch #</th>
                  {meta.reactor ? <th className="px-3 py-2">Reactor</th> : null}
                </>
              )}
              <th className="px-3 py-2">Output (KG)</th>
              <th className="px-3 py-2">Shift</th>
              <th className="px-3 py-2">QC</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-blue-700" colSpan={10}>
                  Loading records…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-blue-700 dark:text-blue-200" colSpan={10}>
                  No records for these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t border-blue-100 dark:border-slate-800">
                  <td className="px-3 py-2 whitespace-nowrap">{dateLabel(row.recordDate)}</td>
                  <td className="px-3 py-2">{FACTORY_LABEL[row.factory] || row.factory}</td>
                  <td className="px-3 py-2 font-medium">{row.grade}</td>
                  {meta.packing ? (
                    <>
                      <td className="px-3 py-2">{row.resinBatch}</td>
                      <td className="px-3 py-2">{row.hardenerBatch}</td>
                      <td className="px-3 py-2">{kg(row.kitSizeKg)}</td>
                      <td className="px-3 py-2">{row.kitQuantity}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{row.batchNumber}</td>
                      {meta.reactor ? <td className="px-3 py-2">{row.reactor}</td> : null}
                    </>
                  )}
                  <td className="px-3 py-2 font-semibold">{kg(row.outputKg)}</td>
                  <td className="px-3 py-2">{row.shift || "—"}</td>
                  <td className="px-3 py-2 capitalize">
                    {row.labRecords?.length
                      ? row.labRecords.map((lab) => `${lab.source} ${lab.status}`).join(", ")
                      : row.qcStatus || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-xs text-blue-700 dark:text-blue-300"
                      onClick={() => {
                        setEditingId(row._id);
                        setForm(entryToForm(row));
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <ProcessSheetEditor
          department={department}
          catalog={catalog}
          initial={editingId ? rows.find((row) => row._id === editingId) || null : null}
          saving={saving}
          onCancel={() => {
            setFormOpen(false);
            setEditingId(null);
          }}
          onSubmit={async (body) => {
            setSaving(true);
            setError("");
            try {
              if (editingId) await productionApi.update(editingId, body);
              else await productionApi.create(body);
              setFormOpen(false);
              setEditingId(null);
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Save failed");
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
