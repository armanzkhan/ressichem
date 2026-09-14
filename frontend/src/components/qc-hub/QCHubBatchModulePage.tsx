"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QcModuleDef } from "@/lib/qcHubDryMortarSrs";
import { qcHubBatchApi } from "@/lib/qcApi";
import { QCHubTrendChart } from "./QCHubTrendChart";

type BatchRecord = {
  _id: string;
  module: string;
  category: string;
  productName: string;
  grade: string;
  batchNo: string;
  testDate: string;
  parameters: Record<string, string | number>;
  remarks?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  rejectionReason?: string;
  attachments?: { _id: string; originalName: string; path: string }[];
};

type Props = { moduleDef: QcModuleDef };

function isoDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

export function QCHubBatchModulePage({ moduleDef }: Props) {
  const [records, setRecords] = useState<BatchRecord[]>([]);
  const [trends, setTrends] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BatchRecord | null>(null);
  const [form, setForm] = useState<any>({ parameters: {} });
  const [selectedTrendParam, setSelectedTrendParam] = useState(
    moduleDef.parameters.find((p) => p.trend)?.key || moduleDef.parameters[0]?.key
  );

  const trendParams = useMemo(() => moduleDef.parameters.filter((p) => p.trend), [moduleDef]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [listRes, trendRes] = await Promise.all([
        qcHubBatchApi.getAll({ module: moduleDef.key, limit: 100 }),
        qcHubBatchApi.getTrends({ module: moduleDef.key }),
      ]);
      setRecords(listRes.data || []);
      setTrends(trendRes.data || {});
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [moduleDef.key]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      category: moduleDef.categories[0] || "",
      productName: "",
      grade: "",
      batchNo: "",
      testDate: new Date().toISOString().slice(0, 10),
      parameters: {},
      remarks: "",
    });
    setShowForm(true);
  };

  const openEdit = (r: BatchRecord) => {
    setEditing(r);
    setForm({
      category: r.category,
      productName: r.productName,
      grade: r.grade,
      batchNo: r.batchNo,
      testDate: isoDate(r.testDate),
      parameters: { ...r.parameters },
      remarks: r.remarks || "",
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, module: moduleDef.key };
      if (editing) await qcHubBatchApi.update(editing._id, payload);
      else await qcHubBatchApi.create(payload);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || "Save failed");
    }
  };

  const workflow = async (id: string, action: "submit" | "approve" | "reject") => {
    try {
      if (action === "submit") await qcHubBatchApi.submit(id);
      else if (action === "approve") await qcHubBatchApi.approve(id);
      else {
        const reason = window.prompt("Rejection reason?") || "";
        await qcHubBatchApi.reject(id, reason);
      }
      load();
    } catch (err: any) {
      setError(err.message || "Action failed");
    }
  };

  const uploadFile = async (id: string, file: File) => {
    try {
      await qcHubBatchApi.uploadAttachment(id, file);
      load();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
  };

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading {moduleDef.label}…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{moduleDef.label}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Batch-wise QC data entry, approval, attachments & trend graphs (SRS 3.1)</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
          + New Batch Record
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      {trendParams.length > 0 && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border shadow p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trend Graphs</h3>
            <select
              value={selectedTrendParam}
              onChange={(e) => setSelectedTrendParam(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm dark:bg-gray-900"
            >
              {trendParams.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trendParams.slice(0, 4).map((p) => (
              <QCHubTrendChart
                key={p.key}
                title={p.label}
                unit={p.unit}
                data={(trends[p.key] || []).map((pt: any) => ({ date: pt.date, batchNo: pt.batchNo, value: pt.value }))}
              />
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="rounded-2xl bg-white dark:bg-gray-800 border shadow p-6 space-y-4">
          <h3 className="text-lg font-bold">{editing ? "Edit" : "New"} Batch Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                {moduleDef.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Product Name *</label>
              <input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Grade</label>
              <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Batch No *</label>
              <input required value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Test Date</label>
              <input type="date" value={form.testDate} onChange={(e) => setForm({ ...form, testDate: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {moduleDef.parameters.map((p) => (
              <div key={p.key}>
                <label className="block text-xs font-semibold mb-1">{p.label}{p.unit ? ` (${p.unit})` : ""}</label>
                <input
                  type={p.type === "number" ? "number" : "text"}
                  step={p.type === "number" ? "any" : undefined}
                  value={form.parameters[p.key] ?? ""}
                  onChange={(e) => setForm({ ...form, parameters: { ...form.parameters, [p.key]: e.target.value } })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold">Save Draft</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left">Batch</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r._id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-3 py-2 font-mono">{r.batchNo}</td>
                <td className="px-3 py-2">{r.productName}{r.grade ? ` (${r.grade})` : ""}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2">{isoDate(r.testDate)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    r.status === "approved" ? "bg-green-100 text-green-800" :
                    r.status === "rejected" ? "bg-red-100 text-red-800" :
                    r.status === "submitted" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                  }`}>{r.status}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.status !== "approved" && (
                      <button onClick={() => openEdit(r)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Edit</button>
                    )}
                    {r.status === "draft" && (
                      <button onClick={() => workflow(r._id, "submit")} className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-800">Submit</button>
                    )}
                    {r.status === "submitted" && (
                      <>
                        <button onClick={() => workflow(r._id, "approve")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Approve</button>
                        <button onClick={() => workflow(r._id, "reject")} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Reject</button>
                      </>
                    )}
                    <label className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800 cursor-pointer">
                      Attach
                      <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(r._id, f);
                      }} />
                    </label>
                  </div>
                  {(r.attachments || []).length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">{r.attachments!.length} file(s)</div>
                  )}
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No batch records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
