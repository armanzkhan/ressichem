"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FACTORY_LABEL,
  productionApi,
  type LabRecord,
  type ProductionCatalog,
  type ProductionDepartment,
  type ProductionEntry,
  type ProductionFactory,
} from "@/lib/productionApi";

export const SHEET_META: Record<ProductionDepartment, { formatNo: string; title: string }> = {
  zrs: { formatNo: "PRD/FRM-001-01", title: "Process Log Sheet Reactors" },
  lms: { formatNo: "PRD/FRM-001-02", title: "Process Log Sheet LMS" },
  drymix: { formatNo: "PRD/FRM-001-03", title: "Process Log Sheet (Drymix)" },
  bfs: { formatNo: "", title: "BFS Packing Log" },
};

const PACK_TYPES = ["Can", "Bag", "Drum", "Bottle", "Bucket", "Set", "Kit"];

type Line = { name: string; lotNumber: string; recipe: string; actual: string };
type Temp = { time: string; reactorTemp: string; heatingTemp: string; coolingTemp: string; setPoint: string; pressure: string; remarks: string };

type Draft = {
  factory: ProductionFactory;
  recordDate: string;
  grade: string;
  batchNumber: string;
  reactor: string;
  outputKg: string;
  operator: string;
  vesselNo: string;
  srNo: string;
  sheetDepartment: string;
  chargingDate: string;
  drainingDate: string;
  chargingOperator: string;
  drainingOperator: string;
  inputKg: string;
  totalHours: string;
  workOrderNo: string;
  resinBatch: string;
  hardenerBatch: string;
  kitSizeKg: string;
  kitQuantity: string;
  lines: Line[];
  tempLog: Temp[];
  rawWeights: Record<string, string>;
  qcSample: Record<string, string>;
  packaging: Record<string, string>;
  additionalRemarks: string;
  signOff: Record<string, string>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function blankLine(): Line {
  return { name: "", lotNumber: "", recipe: "", actual: "" };
}
function blankTemp(): Temp {
  return { time: "", reactorTemp: "", heatingTemp: "", coolingTemp: "", setPoint: "", pressure: "", remarks: "" };
}
function pad<T>(rows: T[], size: number, make: () => T): T[] {
  const next = rows.slice(0, size);
  while (next.length < size) next.push(make());
  return next;
}
function dateOnly(value?: string) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function draftFromEntry(department: ProductionDepartment, entry?: ProductionEntry | null): Draft {
  const lineCount = department === "lms" ? 15 : 6;
  const lines = pad(
    (entry?.materials || []).map((line) => ({
      name: line.name || "",
      lotNumber: line.lotNumber || "",
      recipe: line.recipe || "",
      actual: line.actual || (line.qtyConsumed ? String(line.qtyConsumed) : ""),
    })),
    lineCount,
    blankLine
  );
  return {
    factory: entry?.factory || "hub",
    recordDate: dateOnly(entry?.recordDate) || today(),
    grade: entry?.grade || "",
    batchNumber: entry?.batchNumber || "",
    reactor: entry?.reactor || "",
    outputKg: entry?.outputKg ? String(entry.outputKg) : "",
    operator: entry?.operator || "",
    vesselNo: entry?.vesselNo || "",
    srNo: entry?.srNo || "",
    sheetDepartment: entry?.sheetDepartment || (department === "drymix" ? "Drymix" : ""),
    chargingDate: dateOnly(entry?.chargingDate) || dateOnly(entry?.recordDate) || today(),
    drainingDate: dateOnly(entry?.drainingDate),
    chargingOperator: entry?.chargingOperator || entry?.operator || "",
    drainingOperator: entry?.drainingOperator || "",
    inputKg: entry?.inputKg ? String(entry.inputKg) : "",
    totalHours: entry?.totalHours || "",
    workOrderNo: entry?.workOrderNo || "",
    resinBatch: entry?.resinBatch || "",
    hardenerBatch: entry?.hardenerBatch || "",
    kitSizeKg: entry?.kitSizeKg ? String(entry.kitSizeKg) : "",
    kitQuantity: entry?.kitQuantity ? String(entry.kitQuantity) : "",
    lines,
    tempLog: pad(entry?.tempLog || [], 8, blankTemp),
    rawWeights: {
      mr: "", bg: "", ws: "", ws2: "", sg03: "", sg: "", mp: "", mPowder: "", massaNo: "",
      ...(entry?.rawWeights || {}),
    },
    qcSample: {
      result: "", startTime: "", endTime: "", sampleQty: "", sampleTime: "", mixingTime: "", agitator: "", remarks: "",
      ...(entry?.qcSample || {}),
    },
    packaging: {
      packType: "", unitWeight: "", unitQuantity: "", totalWeight: "", otherDetails: "",
      ...(entry?.packaging || {}),
    },
    additionalRemarks: entry?.additionalRemarks || "",
    signOff: {
      dispatchedBy: "", dispatchedTime: "", dispatchedDate: "",
      approvedBy: "", approvedTime: "", approvedDate: "",
      receivedBy: "", receivedTime: "", receivedDate: "",
      inchargeA: "", inchargeB: "", inchargeC: "",
      ...(entry?.signOff || {}),
    },
  };
}

function yieldPct(input: string, output: string) {
  const a = Number(input);
  const b = Number(output);
  if (!(a > 0) || !(b >= 0)) return "";
  return `${Math.round((b / a) * 1000) / 10}%`;
}

const box = "border border-slate-500 bg-white text-slate-950";
const cellIn = "w-full bg-transparent px-1 py-0.5 text-sm outline-none";

function SheetHeader({ department, factory }: { department: ProductionDepartment; factory?: string }) {
  const meta = SHEET_META[department];
  return (
    <div className={`${box} mb-2 grid grid-cols-[1fr_auto]`}>
      <div className="flex items-center justify-center px-3 py-2 text-center">
        <div>
          <p className="text-lg font-bold tracking-wide">RESSICHEM</p>
          <p className="text-base font-semibold">{meta.title}</p>
          {factory ? <p className="text-xs">{FACTORY_LABEL[factory as ProductionFactory] || factory}</p> : null}
        </div>
      </div>
      <table className="border-l border-slate-500 text-xs">
        <tbody>
          {meta.formatNo ? (
            <tr><td className="border-b border-slate-500 px-2 py-1">Format No.</td><td className="border-b border-l border-slate-500 px-2 py-1">{meta.formatNo}</td></tr>
          ) : null}
          <tr><td className="border-b border-slate-500 px-2 py-1">Revision No.</td><td className="border-b border-l border-slate-500 px-2 py-1">00</td></tr>
          <tr><td className="border-b border-slate-500 px-2 py-1">Issue Date</td><td className="border-b border-l border-slate-500 px-2 py-1">31-07-2025</td></tr>
          <tr><td className="px-2 py-1">SOP Reference No.</td><td className="border-l border-slate-500 px-2 py-1">PRD/SOP-001</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function SignOff({
  value,
  remarks,
  onChange,
  onRemarks,
  readOnly,
}: {
  value: Record<string, string>;
  remarks: string;
  onChange?: (next: Record<string, string>) => void;
  onRemarks?: (value: string) => void;
  readOnly?: boolean;
}) {
  const set = (key: string, next: string) => onChange?.({ ...value, [key]: next });
  const field = (key: string) =>
    readOnly ? <span>{value[key] || "—"}</span> : <input className={cellIn} value={value[key] || ""} onChange={(e) => set(key, e.target.value)} />;
  return (
    <div className="mt-2 grid gap-2 md:grid-cols-[1.4fr_1fr]">
      <div className={box}>
        <p className="border-b border-slate-500 px-2 py-1 text-sm font-semibold">Additional Remarks</p>
        {readOnly ? (
          <p className="min-h-16 whitespace-pre-wrap px-2 py-1 text-sm">{remarks || "—"}</p>
        ) : (
          <textarea className="min-h-16 w-full bg-transparent px-2 py-1 text-sm outline-none" value={remarks} onChange={(e) => onRemarks?.(e.target.value)} />
        )}
      </div>
      <div className={`${box} space-y-2 p-2 text-sm`}>
        <p>Signature {field("inchargeA")} In-charge (A)</p>
        <p>Signature {field("inchargeB")} In-charge (B)</p>
        <p>Signature {field("inchargeC")} In-charge (C)</p>
      </div>
    </div>
  );
}

function LabLinkPanel({ records, loading }: { records: LabRecord[]; loading?: boolean }) {
  return (
    <div className="mt-2 border border-slate-500 p-2 text-sm">
      <p className="font-semibold">Laboratory</p>
      <p className="text-xs text-slate-600">QC Site Zepoxy lab (asad@ressichem.com) · QC Hub Drymix lab (arsalan@ressichem.com)</p>
      {loading ? <p className="mt-1">Checking laboratory records…</p> : null}
      {!loading && records.length === 0 ? <p className="mt-1">No laboratory record for this batch yet.</p> : null}
      {records.length ? (
        <ul className="mt-1 space-y-1">
          {records.map((row) => (
            <li key={row.id}>
              {row.source} · {row.lab} · {row.area} · batch {row.batchNo}
              {row.productName ? ` · ${row.productName}` : ""} · {row.status}
              {row.testDate ? ` · ${String(row.testDate).slice(0, 10)}` : ""}{" "}
              <a href={row.href} className="text-blue-700 underline" target="_blank" rel="noreferrer">
                Open in {row.source}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ProcessSheetView({ entry }: { entry: ProductionEntry }) {
  const draft = draftFromEntry(entry.department, entry);
  return (
    <article className="process-sheet mb-6 bg-white p-3 text-slate-950 shadow-sm print:break-after-page print:shadow-none">
      <SheetHeader department={entry.department} factory={entry.factory} />
      {entry.department === "zrs" ? <ReactorBody draft={draft} readOnly /> : null}
      {entry.department === "lms" ? <LmsBody draft={draft} readOnly /> : null}
      {entry.department === "drymix" ? <DrymixBody draft={draft} readOnly /> : null}
      {entry.department === "bfs" ? <BfsBody draft={draft} readOnly /> : null}
      <LabLinkPanel records={entry.labRecords || []} />
      <SignOff value={draft.signOff} remarks={draft.additionalRemarks} readOnly />
    </article>
  );
}

export function ProcessSheetEditor({
  department,
  catalog,
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  department: ProductionDepartment;
  catalog: ProductionCatalog | null;
  initial?: ProductionEntry | null;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromEntry(department, initial));
  const [labRecords, setLabRecords] = useState<LabRecord[]>(initial?.labRecords || []);
  const [labLoading, setLabLoading] = useState(false);
  const grades = catalog?.grades[department] || [];
  const labKey = [draft.batchNumber, draft.resinBatch, draft.hardenerBatch].join("|");

  useEffect(() => {
    const batches = [draft.batchNumber, draft.resinBatch, draft.hardenerBatch].map((value) => value.trim()).filter(Boolean);
    if (!batches.length) {
      setLabRecords([]);
      return;
    }
    let cancel = false;
    setLabLoading(true);
    productionApi
      .lab(batches)
      .then((res) => {
        if (!cancel) setLabRecords(res.data || []);
      })
      .catch(() => {
        if (!cancel) setLabRecords([]);
      })
      .finally(() => {
        if (!cancel) setLabLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [labKey, draft.batchNumber, draft.resinBatch, draft.hardenerBatch]);
  const set = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const outputPreview = useMemo(() => {
    if (department !== "bfs") return "";
    const size = Number(draft.kitSizeKg);
    const qty = Number(draft.kitQuantity);
    if (!(size > 0) || !(qty > 0)) return "";
    return String(Math.round(size * qty * 1000) / 1000);
  }, [department, draft.kitSizeKg, draft.kitQuantity]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const recordDate = department === "zrs" ? draft.chargingDate : draft.recordDate;
    const totalWeight =
      Number(draft.packaging.unitWeight) > 0 && Number(draft.packaging.unitQuantity) > 0
        ? String(Math.round(Number(draft.packaging.unitWeight) * Number(draft.packaging.unitQuantity) * 1000) / 1000)
        : draft.packaging.totalWeight;
    await onSubmit({
      department,
      factory: draft.factory,
      recordDate,
      grade: draft.grade,
      batchNumber: draft.batchNumber,
      reactor: draft.reactor,
      outputKg: department === "bfs" ? Number(outputPreview) || 0 : department === "drymix" ? Number(totalWeight) || 0 : Number(draft.outputKg) || 0,
      operator: department === "zrs" ? draft.chargingOperator : draft.operator,
      vesselNo: draft.vesselNo,
      srNo: draft.srNo,
      sheetDepartment: draft.sheetDepartment,
      chargingDate: draft.chargingDate,
      drainingDate: draft.drainingDate,
      chargingOperator: draft.chargingOperator,
      drainingOperator: draft.drainingOperator,
      inputKg: Number(draft.inputKg) || 0,
      totalHours: draft.totalHours,
      workOrderNo: draft.workOrderNo,
      resinBatch: draft.resinBatch,
      hardenerBatch: draft.hardenerBatch,
      kitSizeKg: Number(draft.kitSizeKg) || 0,
      kitQuantity: Number(draft.kitQuantity) || 0,
      formatNo: SHEET_META[department].formatNo,
      materials: draft.lines
        .filter((line) => line.name || line.lotNumber || line.recipe || line.actual)
        .map((line) => ({
          name: line.name,
          lotNumber: line.lotNumber,
          recipe: line.recipe,
          actual: line.actual,
          qtyConsumed: Number(line.actual) || 0,
          source: "manual",
        })),
      tempLog: draft.tempLog,
      rawWeights: draft.rawWeights,
      qcSample: draft.qcSample,
      packaging: { ...draft.packaging, totalWeight },
      additionalRemarks: draft.additionalRemarks,
      signOff: draft.signOff,
      qcStatus: draft.qcSample.result === "OK" ? "approved" : draft.qcSample.result === "NOT OK" ? "rejected" : "pending",
    });
  };

  return (
    <form onSubmit={save} className="process-sheet bg-white p-3 text-slate-950">
      <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">
          Factory
          <select className="ml-2 rounded border border-slate-400 px-2 py-1" value={draft.factory} onChange={(e) => set({ factory: e.target.value as ProductionFactory })}>
            <option value="hub">Hub Factory</option>
            <option value="site">SITE Factory</option>
            <option value="lahore">Lahore Factory</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" className="rounded border border-slate-400 px-3 py-1 text-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-blue-700 px-3 py-1 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : "Save sheet"}</button>
        </div>
      </div>
      <SheetHeader department={department} factory={draft.factory} />
      {department === "zrs" ? <ReactorBody draft={draft} grades={grades} reactors={catalog?.reactors || []} onChange={set} /> : null}
      {department === "lms" ? <LmsBody draft={draft} grades={grades} onChange={set} /> : null}
      {department === "drymix" ? <DrymixBody draft={draft} grades={grades} onChange={set} /> : null}
      {department === "bfs" ? <BfsBody draft={draft} grades={grades} outputPreview={outputPreview} kitSizes={catalog?.kitSizesKg || []} onChange={set} /> : null}
      <LabLinkPanel records={labRecords} loading={labLoading} />
      <SignOff
        value={draft.signOff}
        remarks={draft.additionalRemarks}
        onChange={(signOff) => set({ signOff })}
        onRemarks={(additionalRemarks) => set({ additionalRemarks })}
      />
    </form>
  );
}

function ReactorBody({
  draft,
  grades,
  reactors,
  onChange,
  readOnly,
}: {
  draft: Draft;
  grades?: string[];
  reactors?: string[];
  onChange?: (patch: Partial<Draft>) => void;
  readOnly?: boolean;
}) {
  const setLine = (index: number, patch: Partial<Line>) => {
    const lines = draft.lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange?.({ lines });
  };
  const setTemp = (index: number, patch: Partial<Temp>) => {
    const tempLog = draft.tempLog.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange?.({ tempLog });
  };
  const text = (value: string, key: keyof Draft) =>
    readOnly ? value || "—" : <input className={cellIn} value={value} list={key === "grade" ? "sheet-grades" : key === "reactor" ? "sheet-reactors" : undefined} onChange={(e) => onChange?.({ [key]: e.target.value })} />;
  return (
    <>
      <div className="grid gap-2 lg:grid-cols-[1fr_0.8fr_1fr]">
        <table className={`${box} w-full text-sm`}>
          <tbody>
            {[
              ["Reactor #", "reactor"],
              ["Batch #", "batchNumber"],
              ["Product Grade", "grade"],
              ["Charging Date", "chargingDate"],
              ["Operator Name", "chargingOperator"],
              ["Draining Date", "drainingDate"],
              ["Operator Name", "drainingOperator"],
            ].map(([label, key]) => (
              <tr key={label + key}>
                <td className="w-36 border border-slate-500 px-2 py-1 font-medium">{label}</td>
                <td className="border border-slate-500">
                  {key.includes("Date") && !readOnly ? (
                    <input type="date" className={cellIn} value={String(draft[key as keyof Draft] || "")} onChange={(e) => onChange?.({ [key]: e.target.value })} />
                  ) : (
                    text(String(draft[key as keyof Draft] || ""), key as keyof Draft)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className={`${box} w-full text-sm`}>
          <tbody>
            <tr><td className="border border-slate-500 px-2 py-1">Input (kg)</td><td className="border border-slate-500">{readOnly ? draft.inputKg || "—" : <input className={cellIn} inputMode="decimal" value={draft.inputKg} onChange={(e) => onChange?.({ inputKg: e.target.value })} />}</td></tr>
            <tr><td className="border border-slate-500 px-2 py-1">Output (kg)</td><td className="border border-slate-500">{readOnly ? draft.outputKg || "—" : <input className={cellIn} inputMode="decimal" value={draft.outputKg} onChange={(e) => onChange?.({ outputKg: e.target.value })} />}</td></tr>
            <tr><td className="border border-slate-500 px-2 py-1">Product Yield (%)</td><td className="border border-slate-500 px-2 py-1">{yieldPct(draft.inputKg, draft.outputKg) || "—"}</td></tr>
            <tr><td className="border border-slate-500 px-2 py-1">Total Hrs.</td><td className="border border-slate-500">{readOnly ? draft.totalHours || "—" : <input className={cellIn} value={draft.totalHours} onChange={(e) => onChange?.({ totalHours: e.target.value })} />}</td></tr>
            <tr><td className="border border-slate-500 px-2 py-1">W.O #</td><td className="border border-slate-500">{readOnly ? draft.workOrderNo || "—" : <input className={cellIn} value={draft.workOrderNo} onChange={(e) => onChange?.({ workOrderNo: e.target.value })} />}</td></tr>
          </tbody>
        </table>
        <table className={`${box} w-full text-sm`}>
          <thead><tr><th className="border border-slate-500 px-2 py-1">Material</th><th className="border border-slate-500 px-2 py-1">Recipe</th><th className="border border-slate-500 px-2 py-1">Actual</th></tr></thead>
          <tbody>
            {draft.lines.map((line, i) => (
              <tr key={i}>
                <td className="border border-slate-500">{readOnly ? line.name : <input className={cellIn} value={line.name} onChange={(e) => setLine(i, { name: e.target.value })} />}</td>
                <td className="border border-slate-500">{readOnly ? line.recipe : <input className={cellIn} value={line.recipe} onChange={(e) => setLine(i, { recipe: e.target.value })} />}</td>
                <td className="border border-slate-500">{readOnly ? line.actual : <input className={cellIn} value={line.actual} onChange={(e) => setLine(i, { actual: e.target.value })} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <table className={`${box} mt-2 w-full text-sm`}>
        <thead>
          <tr>
            <th className="border border-slate-500 px-2 py-1" rowSpan={2}>Time hh:mm</th>
            <th className="border border-slate-500 px-2 py-1" colSpan={4}>Temperature °C</th>
            <th className="border border-slate-500 px-2 py-1" rowSpan={2}>Pressure mm Hg</th>
            <th className="border border-slate-500 px-2 py-1" rowSpan={2}>Remarks</th>
          </tr>
          <tr>
            <th className="border border-slate-500 px-2 py-1">Reactor</th>
            <th className="border border-slate-500 px-2 py-1">Heating</th>
            <th className="border border-slate-500 px-2 py-1">Cooling</th>
            <th className="border border-slate-500 px-2 py-1">Set Point</th>
          </tr>
        </thead>
        <tbody>
          {draft.tempLog.map((row, i) => (
            <tr key={i}>
              {(["time", "reactorTemp", "heatingTemp", "coolingTemp", "setPoint", "pressure", "remarks"] as const).map((key) => (
                <td key={key} className="border border-slate-500">
                  {readOnly ? row[key] : <input className={cellIn} value={row[key]} onChange={(e) => setTemp(i, { [key]: e.target.value })} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly ? (
        <>
          <datalist id="sheet-grades">{(grades || []).map((g) => <option key={g} value={g} />)}</datalist>
          <datalist id="sheet-reactors">{(reactors || []).map((g) => <option key={g} value={g} />)}</datalist>
        </>
      ) : null}
    </>
  );
}

function LmsBody({ draft, grades, onChange, readOnly }: { draft: Draft; grades?: string[]; onChange?: (patch: Partial<Draft>) => void; readOnly?: boolean }) {
  const setLine = (index: number, patch: Partial<Line>) => {
    const lines = draft.lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange?.({ lines });
  };
  const field = (value: string, key: keyof Draft, list?: string) =>
    readOnly ? value || "—" : <input className="border-b border-slate-400 bg-transparent outline-none" list={list} value={value} onChange={(e) => onChange?.({ [key]: e.target.value })} />;
  return (
    <>
      <div className="mb-2 grid gap-2 text-sm md:grid-cols-2">
        <p>Date: {readOnly ? draft.recordDate : <input type="date" className={cellIn} value={draft.recordDate} onChange={(e) => onChange?.({ recordDate: e.target.value })} />}</p>
        <p>Vessel No: {field(draft.vesselNo, "vesselNo")}</p>
        <p>Product Name: {field(draft.grade, "grade", "lms-grades")}</p>
        <p>Batch No: {field(draft.batchNumber, "batchNumber")}</p>
        <p>Operator: {field(draft.operator, "operator")}</p>
        <p>Output: {readOnly ? draft.outputKg || "—" : <input className="border-b border-slate-400 bg-transparent outline-none" inputMode="decimal" value={draft.outputKg} onChange={(e) => onChange?.({ outputKg: e.target.value })} />}</p>
      </div>
      <table className={`${box} w-full text-sm`}>
        <thead>
          <tr>
            <th className="w-10 border border-slate-500 px-2 py-1">#</th>
            <th className="border border-slate-500 px-2 py-1">Chemical Name</th>
            <th className="border border-slate-500 px-2 py-1">Batch No</th>
            <th className="border border-slate-500 px-2 py-1">Recipe</th>
            <th className="border border-slate-500 px-2 py-1">Actual</th>
          </tr>
        </thead>
        <tbody>
          {draft.lines.map((line, i) => (
            <tr key={i}>
              <td className="border border-slate-500 px-2 text-center">{i + 1}</td>
              <td className="border border-slate-500">{readOnly ? line.name : <input className={cellIn} value={line.name} onChange={(e) => setLine(i, { name: e.target.value })} />}</td>
              <td className="border border-slate-500">{readOnly ? line.lotNumber : <input className={cellIn} value={line.lotNumber} onChange={(e) => setLine(i, { lotNumber: e.target.value })} />}</td>
              <td className="border border-slate-500">{readOnly ? line.recipe : <input className={cellIn} value={line.recipe} onChange={(e) => setLine(i, { recipe: e.target.value })} />}</td>
              <td className="border border-slate-500">{readOnly ? line.actual : <input className={cellIn} value={line.actual} onChange={(e) => setLine(i, { actual: e.target.value })} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly ? <datalist id="lms-grades">{(grades || []).map((g) => <option key={g} value={g} />)}</datalist> : null}
    </>
  );
}

function DrymixBody({ draft, grades, onChange, readOnly }: { draft: Draft; grades?: string[]; onChange?: (patch: Partial<Draft>) => void; readOnly?: boolean }) {
  const w = (key: string) =>
    readOnly ? draft.rawWeights[key] || "" : (
      <input className="w-16 border-b border-slate-500 bg-transparent text-center outline-none" value={draft.rawWeights[key] || ""} onChange={(e) => onChange?.({ rawWeights: { ...draft.rawWeights, [key]: e.target.value } })} />
    );
  const q = (key: string) =>
    readOnly ? draft.qcSample[key] || "" : (
      <input className="w-full border-b border-slate-400 bg-transparent outline-none" value={draft.qcSample[key] || ""} onChange={(e) => onChange?.({ qcSample: { ...draft.qcSample, [key]: e.target.value } })} />
    );
  const p = (key: string) =>
    readOnly ? draft.packaging[key] || "" : (
      <input className="w-full border-b border-slate-400 bg-transparent outline-none" value={draft.packaging[key] || ""} onChange={(e) => onChange?.({ packaging: { ...draft.packaging, [key]: e.target.value } })} />
    );
  const pairs: [string, string, string, string][] = [
    ["MR", "mr", "BG", "bg"],
    ["WS", "ws", "WS", "ws2"],
    ["SG 03", "sg03", "SG", "sg"],
    ["MP", "mp", "M.Pwdr", "mPowder"],
  ];
  return (
    <div className="space-y-2 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <p>Department {readOnly ? draft.sheetDepartment : <input className="border-b border-slate-400 bg-transparent outline-none" value={draft.sheetDepartment} onChange={(e) => onChange?.({ sheetDepartment: e.target.value })} />}</p>
        <p>Sr. # {readOnly ? draft.srNo : <input className="border-b border-slate-400 bg-transparent outline-none" value={draft.srNo} onChange={(e) => onChange?.({ srNo: e.target.value })} />}</p>
        <p>Product {readOnly ? draft.grade : <input className="border-b border-slate-400 bg-transparent outline-none" list="dry-grades" value={draft.grade} onChange={(e) => onChange?.({ grade: e.target.value })} />}</p>
        <p>Date {readOnly ? draft.recordDate : <input type="date" value={draft.recordDate} onChange={(e) => onChange?.({ recordDate: e.target.value })} />}</p>
        <p>Batch # {readOnly ? draft.batchNumber : <input className="border-b border-slate-400 bg-transparent outline-none" value={draft.batchNumber} onChange={(e) => onChange?.({ batchNumber: e.target.value })} />}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className={`${box} p-2`}>
          <p className="mb-2 font-semibold">Raw Material Weights</p>
          {pairs.map(([a, ak, b, bk]) => (
            <p key={ak} className="mb-1">{a} {w(ak)} kg &nbsp; {b} {w(bk)} kg</p>
          ))}
          <p>Massa # {w("massaNo")}</p>
        </div>
        <div className={`${box} p-2`}>
          <p className="mb-2 font-semibold">Lab QC Sampling</p>
          <p className="mb-1">
            Result{" "}
            {readOnly ? draft.qcSample.result || "—" : (
              <select className="border border-slate-400" value={draft.qcSample.result || ""} onChange={(e) => onChange?.({ qcSample: { ...draft.qcSample, result: e.target.value } })}>
                <option value="">—</option>
                <option value="OK">OK</option>
                <option value="NOT OK">NOT OK</option>
              </select>
            )}
          </p>
          <p>Start Time {q("startTime")} End Time {q("endTime")}</p>
          <p>Sample Qty. {q("sampleQty")} Sample time {q("sampleTime")}</p>
          <p>Mixing Time {q("mixingTime")} Agitator {q("agitator")}</p>
          <p>Remarks {q("remarks")}</p>
        </div>
      </div>
      <div className={`${box} p-2`}>
        <p className="mb-2 font-semibold">Packaging Detail</p>
        <div className="mb-2 flex flex-wrap gap-3">
          {PACK_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-1">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={draft.packaging.packType === type}
                onChange={() => onChange?.({ packaging: { ...draft.packaging, packType: type } })}
              />
              {type}
            </label>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <p>Unit Weight {p("unitWeight")} kg</p>
          <p>Unit Quantity {p("unitQuantity")}</p>
          <p>Total Weight {p("totalWeight")} kg</p>
        </div>
        <p className="mt-2">Other Details {p("otherDetails")}</p>
      </div>
      <div className="grid gap-2 text-xs md:grid-cols-3">
        {([
          ["Dispatched by", "dispatchedBy", "dispatchedTime", "dispatchedDate"],
          ["Approved by", "approvedBy", "approvedTime", "approvedDate"],
          ["Received by", "receivedBy", "receivedTime", "receivedDate"],
        ] as const).map(([label, name, time, date]) => (
          <div key={label} className={`${box} p-2`}>
            <p className="font-semibold">{label}</p>
            <p>Name {readOnly ? draft.signOff[name] : <input className={cellIn} value={draft.signOff[name] || ""} onChange={(e) => onChange?.({ signOff: { ...draft.signOff, [name]: e.target.value } })} />}</p>
            <p>Time {readOnly ? draft.signOff[time] : <input className={cellIn} value={draft.signOff[time] || ""} onChange={(e) => onChange?.({ signOff: { ...draft.signOff, [time]: e.target.value } })} />}</p>
            <p>Date {readOnly ? draft.signOff[date] : <input type="date" value={draft.signOff[date] || ""} onChange={(e) => onChange?.({ signOff: { ...draft.signOff, [date]: e.target.value } })} />}</p>
          </div>
        ))}
      </div>
      {!readOnly ? <datalist id="dry-grades">{(grades || []).map((g) => <option key={g} value={g} />)}</datalist> : null}
    </div>
  );
}

function BfsBody({
  draft,
  grades,
  outputPreview,
  kitSizes,
  onChange,
  readOnly,
}: {
  draft: Draft;
  grades?: string[];
  outputPreview?: string;
  kitSizes?: number[];
  onChange?: (patch: Partial<Draft>) => void;
  readOnly?: boolean;
}) {
  const field = (value: string, key: keyof Draft) =>
    readOnly ? value || "—" : <input className={cellIn} value={value} onChange={(e) => onChange?.({ [key]: e.target.value })} />;
  return (
    <table className={`${box} w-full text-sm`}>
      <tbody>
        <tr><td className="border border-slate-500 px-2 py-1">Packing date</td><td className="border border-slate-500">{readOnly ? draft.recordDate : <input type="date" className={cellIn} value={draft.recordDate} onChange={(e) => onChange?.({ recordDate: e.target.value })} />}</td></tr>
        <tr><td className="border border-slate-500 px-2 py-1">Kit grade</td><td className="border border-slate-500">{readOnly ? draft.grade : <input className={cellIn} list="bfs-grades" value={draft.grade} onChange={(e) => onChange?.({ grade: e.target.value })} />}</td></tr>
        <tr><td className="border border-slate-500 px-2 py-1">Resin batch #</td><td className="border border-slate-500">{field(draft.resinBatch, "resinBatch")}</td></tr>
        <tr><td className="border border-slate-500 px-2 py-1">Hardener batch #</td><td className="border border-slate-500">{field(draft.hardenerBatch, "hardenerBatch")}</td></tr>
        <tr><td className="border border-slate-500 px-2 py-1">Kit size (KG)</td><td className="border border-slate-500">{readOnly ? draft.kitSizeKg : <input className={cellIn} list="bfs-sizes" inputMode="decimal" value={draft.kitSizeKg} onChange={(e) => onChange?.({ kitSizeKg: e.target.value })} />}</td></tr>
        <tr><td className="border border-slate-500 px-2 py-1">Kit quantity</td><td className="border border-slate-500">{field(draft.kitQuantity, "kitQuantity")}</td></tr>
        <tr><td className="border border-slate-500 px-2 py-1">Output (KG)</td><td className="border border-slate-500 px-2 py-1">{outputPreview || (Number(draft.kitSizeKg) && Number(draft.kitQuantity) ? String(Math.round(Number(draft.kitSizeKg) * Number(draft.kitQuantity) * 1000) / 1000) : "—")}</td></tr>
      </tbody>
      {!readOnly ? (
        <>
          <datalist id="bfs-grades">{(grades || []).map((g) => <option key={g} value={g} />)}</datalist>
          <datalist id="bfs-sizes">{(kitSizes || []).map((g) => <option key={g} value={String(g)} />)}</datalist>
        </>
      ) : null}
    </table>
  );
}
