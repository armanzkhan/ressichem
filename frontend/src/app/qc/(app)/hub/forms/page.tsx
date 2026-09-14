"use client";

import React, { useEffect, useMemo, useState } from "react";

type Attachment = { _id: string; path: string; originalName: string };
type HubForm = {
  _id: string;
  planGroup: string;
  productType: string;
  productName?: string;
  batchNo?: string;
  formType: string;
  sampleTrackingNo?: string;
  productionDate?: string;
  castingDate?: string;
  testDate?: string;
  days?: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  remarks?: string;
  rejectionReason?: string;
  attachments?: Attachment[];
  payload?: any;
};

const PRODUCT_TYPES = [
  { value: "TILE_ADHESIVE", label: "Tile Adhesive" },
  { value: "GROUTS", label: "Grouts" },
  { value: "TILE_GROUT", label: "Tile Grout" },
  { value: "PLASTER_RENDER_OTHER", label: "Plaster / Render / Other" },
  { value: "PREMIX_PLASTER", label: "Premix Plaster" },
  { value: "SKIM_COAT", label: "Skim Coat" },
  { value: "REPAIR_MORTAR", label: "Repair Mortar" },
  { value: "WATERPROOFING", label: "Waterproofing" },
  { value: "CRACK_FILLER", label: "Crack Filler" },
  { value: "SELF_LEVEL_SEALERS", label: "Self Level & Sealers" },
];

const FORM_TYPES = [
  { value: "SAMPLE_TRACKING_ISSUANCE", label: "Sample Tracking Issuance" },
  { value: "WATER_RETENTION", label: "Water Retention Raw Data" },
  { value: "WATER_ABSORPTION", label: "Water Absorption Raw Data" },
  { value: "TENSILE_ADHESION", label: "Tensile Adhesion Raw Data" },
  { value: "SLIP_DBD_WETTING", label: "Slip + Dry Bulk Density + Wetting Capability" },
  { value: "SHRINKAGE", label: "Shrinkage Raw Data" },
  { value: "RESIDUE", label: "Residue / Sieve (Residue) Raw Data" },
  { value: "FLEXURAL_COMPRESSIVE", label: "Flexural & Compressive Strength Raw Data" },
  { value: "FRESH_MORTAR_DENSITY_AIR_SPREAD", label: "Fresh Mortar Density + Air Content + Spreadability" },
];

function isoDateOrEmpty(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

type Column = { key: string; label: string; placeholder?: string };

const FORM_COLUMNS: Record<string, Column[]> = {
  SAMPLE_TRACKING_ISSUANCE: [
    { key: "sr", label: "Sr #" },
    { key: "productionDate", label: "Production Date (YYYY-MM-DD)" },
    { key: "product", label: "Product" },
    { key: "batchNo", label: "Batch#" },
    { key: "castingDate", label: "Casting Date (YYYY-MM-DD)" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testingDates", label: "Testing Dates (e.g. 7,14,21,28)" },
  ],
  WATER_RETENTION: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "waterRatioPct", label: "Water Ratio (%)" },
    { key: "weightG", label: "Weight (g)" },
    { key: "waterRetentionPct", label: "Water Retention (%)" },
    { key: "remarks", label: "Remarks" },
  ],
  WATER_ABSORPTION: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "dryWeightG", label: "Dry Weight (g)" },
    { key: "afterImmersionG", label: "Weight After Immersion (g)" },
    { key: "absorption30", label: "Absorption (30 min / 10 min)" },
    { key: "absorption240", label: "Absorption (240 min / 90 min)" },
    { key: "remarks", label: "Remarks" },
  ],
  TENSILE_ADHESION: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "days", label: "Days" },
    { key: "ta1", label: "Tensile Adhesion 1 (N/mm2)" },
    { key: "ta2", label: "Tensile Adhesion 2 (N/mm2)" },
    { key: "avg", label: "Average (N/mm2)" },
    { key: "remarks", label: "Remarks" },
  ],
  SLIP_DBD_WETTING: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "initialReadingMm", label: "Initial Reading (mm)" },
    { key: "finalReadingMm", label: "Final Reading (mm)" },
    { key: "slipMm", label: "Slip (mm)" },
    { key: "dryBulkDensityGL", label: "Dry Bulk Density (g/l)" },
    { key: "wettingPct", label: "Wetting Capability (%)" },
    { key: "remarks", label: "Remarks" },
  ],
  SHRINKAGE: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "initialReadingMm", label: "Initial Reading (mm)" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "finalReadingMm", label: "Final Reading (mm)" },
    { key: "shrinkageMmPerM", label: "Shrinkage (mm/m)" },
    { key: "remarks", label: "Remarks" },
  ],
  RESIDUE: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "sampleG", label: "Sample (g)" },
    { key: "residueG", label: "Residue (g)" },
    { key: "remarks", label: "Remarks" },
  ],
  FLEXURAL_COMPRESSIVE: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "days", label: "Days" },
    { key: "flexuralNmm2", label: "Flexural Strength (N/mm2)" },
    { key: "compressiveNmm2", label: "Compressive Strength (N/mm2)" },
    { key: "remarks", label: "Remarks" },
  ],
  FRESH_MORTAR_DENSITY_AIR_SPREAD: [
    { key: "sr", label: "Sr #" },
    { key: "sampleTrackingNo", label: "Sample Tracking#" },
    { key: "testDate", label: "Test Date (YYYY-MM-DD)" },
    { key: "dryBulkDensityGL", label: "Dry Bulk Density (g/l)" },
    { key: "spreadMm", label: "Spreadability (mm)" },
    { key: "freshMortarDensityGL", label: "Fresh Mortar Density (g/l)" },
    { key: "airContentPct", label: "Air Content (%)" },
    { key: "remarks", label: "Remarks" },
  ],
};

function makeRows(count: number) {
  return Array.from({ length: count }).map((_, i) => ({ sr: String(i + 1) } as Record<string, string>));
}

export default function QCHubFormsPage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rows, setRows] = useState<HubForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Create form (minimal + payload JSON)
  const [create, setCreate] = useState({
    productType: "TILE_ADHESIVE",
    productName: "",
    batchNo: "",
    sampleTrackingNo: "",
    formType: "SAMPLE_TRACKING_ISSUANCE",
    productionDate: "",
    castingDate: "",
    testDate: "",
    days: "",
    remarks: "",
  });

  const [rowCount, setRowCount] = useState(30);
  const [formRows, setFormRows] = useState<Record<string, string>[]>(() => makeRows(30));

  useEffect(() => {
    setFormRows(makeRows(rowCount));
  }, [rowCount, create.formType]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/hub/forms?planGroup=DRY_MORTAR&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load forms");
      setRows(data.data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        rows: formRows.filter((r) => Object.values(r).some((v) => String(v || "").trim() !== "")),
      };
      const body: any = {
        planGroup: "DRY_MORTAR",
        productType: create.productType,
        productName: create.productName,
        batchNo: create.batchNo,
        sampleTrackingNo: create.sampleTrackingNo,
        formType: create.formType,
        remarks: create.remarks,
        payload,
      };
      if (create.productionDate) body.productionDate = new Date(create.productionDate).toISOString();
      if (create.castingDate) body.castingDate = new Date(create.castingDate).toISOString();
      if (create.testDate) body.testDate = new Date(create.testDate).toISOString();
      if (create.days) body.days = Number(create.days);

      const res = await fetch(`${apiUrl}/api/qc/hub/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create form");

      setCreate((p) => ({
        ...p,
        productName: "",
        batchNo: "",
        sampleTrackingNo: "",
        productionDate: "",
        castingDate: "",
        testDate: "",
        days: "",
        remarks: "",
      }));
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Failed to create form");
    } finally {
      setLoading(false);
    }
  };

  const postAction = async (id: string, action: "submit" | "approve" | "reject") => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      let body: any = undefined;
      if (action === "reject") {
        const reason = prompt("Rejection reason?");
        if (reason === null) return;
        body = { reason };
      }
      const res = await fetch(`${apiUrl}/api/qc/hub/forms/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Action failed");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const upload = async (id: string, file: File) => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiUrl}/api/qc/hub/forms/${id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/hub/forms/export.csv?planGroup=DRY_MORTAR`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qc_hub_forms_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setMessage(e?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QC Hub — Raw Data Forms</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          This area stores the Dry Mortar raw forms (issuance + test raw data) with attachments + approval workflow.
        </p>
      </div>

      {message && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Form Submission</h3>
          <button
            onClick={downloadCsv}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>

        <form onSubmit={createSubmission} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Product Type</label>
            <select
              value={create.productType}
              onChange={(e) => setCreate((p) => ({ ...p, productType: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            >
              {PRODUCT_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Form Type</label>
            <select
              value={create.formType}
              onChange={(e) => setCreate((p) => ({ ...p, formType: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            >
              {FORM_TYPES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Sample Tracking #</label>
            <input
              value={create.sampleTrackingNo}
              onChange={(e) => setCreate((p) => ({ ...p, sampleTrackingNo: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              placeholder="e.g. ST-000123"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Product Name</label>
            <input
              value={create.productName}
              onChange={(e) => setCreate((p) => ({ ...p, productName: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Batch #</label>
            <input
              value={create.batchNo}
              onChange={(e) => setCreate((p) => ({ ...p, batchNo: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Days (optional)</label>
            <input
              value={create.days}
              onChange={(e) => setCreate((p) => ({ ...p, days: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              placeholder="7 / 14 / 21 / 28"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Production Date</label>
            <input
              type="date"
              value={create.productionDate}
              onChange={(e) => setCreate((p) => ({ ...p, productionDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Casting Date</label>
            <input
              type="date"
              value={create.castingDate}
              onChange={(e) => setCreate((p) => ({ ...p, castingDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Test Date</label>
            <input
              type="date"
              value={create.testDate}
              onChange={(e) => setCreate((p) => ({ ...p, testDate: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Raw Data Table</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Rows</span>
                <select
                  value={rowCount}
                  onChange={(e) => setRowCount(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                >
                  {[10, 20, 30, 40].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200/70 dark:border-gray-700/70">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    {(FORM_COLUMNS[create.formType] || []).map((c) => (
                      <th key={c.key} className="py-2 px-3 whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formRows.map((r, idx) => (
                    <tr key={idx} className="border-t border-gray-200/60 dark:border-gray-700/60">
                      {(FORM_COLUMNS[create.formType] || []).map((c) => (
                        <td key={c.key} className="py-2 px-3">
                          <input
                            value={r[c.key] ?? (c.key === "sr" ? String(idx + 1) : "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormRows((prev) => {
                                const next = [...prev];
                                next[idx] = { ...(next[idx] || {}), [c.key]: v };
                                // keep sr in sync
                                if (c.key !== "sr") next[idx].sr = String(idx + 1);
                                return next;
                              });
                            }}
                            className="w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-2 py-1"
                            placeholder={c.placeholder || ""}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Remarks</label>
            <input
              value={create.remarks}
              onChange={(e) => setCreate((p) => ({ ...p, remarks: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <button
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-semibold shadow disabled:opacity-60"
              type="submit"
            >
              {loading ? "Saving…" : "Create Draft"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Submissions</h3>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-4">Form Type</th>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4">Tracking #</th>
                <th className="py-2 pr-4">Test Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Attachments</th>
                <th className="py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                  <td className="py-3 pr-4 font-semibold">{r.formType}</td>
                  <td className="py-3 pr-4">{r.productType}</td>
                  <td className="py-3 pr-4">{r.batchNo || "—"}</td>
                  <td className="py-3 pr-4">{r.sampleTrackingNo || "—"}</td>
                  <td className="py-3 pr-4">{r.testDate ? isoDateOrEmpty(r.testDate) : "—"}</td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-200">
                      {r.status}
                    </span>
                    {r.status === "rejected" && r.rejectionReason ? (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">Reason: {r.rejectionReason}</div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {(r.attachments || []).length ? (
                      <div className="space-y-1">
                        {(r.attachments || []).slice(0, 2).map((a) => (
                          <a
                            key={a._id}
                            href={`${apiUrl}${a.path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-700 dark:text-sky-300 hover:underline"
                          >
                            {a.originalName}
                          </a>
                        ))}
                        {(r.attachments || []).length > 2 ? <div>+{(r.attachments || []).length - 2} more</div> : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        onClick={() => postAction(r._id, "submit")}
                        disabled={loading || (r.status !== "draft" && r.status !== "rejected")}
                        className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => postAction(r._id, "approve")}
                        disabled={loading || r.status !== "submitted"}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => postAction(r._id, "reject")}
                        disabled={loading || r.status !== "submitted"}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <label className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black cursor-pointer">
                        Upload
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            upload(r._id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={8}>
                    No QC Hub form submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


