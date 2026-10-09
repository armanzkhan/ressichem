"use client";

import { useEffect, useState } from "react";
import { ncrApi } from "@/lib/qcApi";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

export default function HubNcrPage() {
  const canDelete = useQcHubFullAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ severity: "MINOR", sourceType: "QC_BATCH" });
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const selection = useHubRowSelection(rows);

  const load = async () => {
    try {
      setError("");
      const r = await ncrApi.getAll();
      setRows(r.data || []);
      selection.clearSelection();
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ncrApi.create(form);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteOne = async (id: string, label?: string) => {
    if (!window.confirm(`Delete NCR ${label || ""}?`.trim())) return;
    setDeleting(true);
    setError("");
    try {
      await ncrApi.remove(id);
      selection.clearSelection();
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const bulkDelete = async () => {
    const ids = selection.selectedList;
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected NCR record(s)?`)) return;
    setDeleting(true);
    setError("");
    try {
      await ncrApi.bulkRemove(ids);
      selection.clearSelection();
      await load();
    } catch (err: any) {
      setError(err.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Non-Conformance Reports (NCR)</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — NCR records linked to batches &amp; CAPA</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDelete && (
            <HubBulkDeleteButton
              selectedCount={selection.selectedList.length}
              deleting={deleting}
              onBulkDelete={bulkDelete}
            />
          )}
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            {showForm ? "Cancel" : "+ New NCR"}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Related batch no" value={form.relatedBatchNo || ""} onChange={(e) => setForm({ ...form, relatedBatchNo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Create NCR</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              {canDelete && (
                <th className="px-3 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selection.allSelected}
                    onChange={selection.toggleAll}
                    disabled={!rows.length || deleting}
                    aria-label="Select all"
                  />
                </th>
              )}
              <th className="px-3 py-2 text-left">NCR No</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Severity</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                {canDelete && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selection.selectedIds.has(r._id)}
                      onChange={() => selection.toggleOne(r._id)}
                      disabled={deleting}
                      aria-label={`Select ${r.ncrNo}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2">{r.ncrNo}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.severity}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "CLOSED" && (
                      <button onClick={() => ncrApi.close(r._id).then(load)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        Close
                      </button>
                    )}
                    {canDelete && (
                      <HubRowDeleteButton disabled={deleting} onDelete={() => deleteOne(r._id, r.ncrNo)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
