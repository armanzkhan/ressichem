"use client";

import { useEffect, useState } from "react";
import { complaintApi } from "@/lib/qcApi";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

const COMPLAINT_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROCESS", label: "Inprocess" },
  { value: "CLOSED", label: "Closed" },
] as const;

function statusLabel(status?: string) {
  const hit = COMPLAINT_STATUSES.find((s) => s.value === status);
  if (hit) return hit.label;
  return status || "—";
}

const emptyForm = () => ({
  title: "",
  description: "",
  batchNo: "",
  customerName: "",
  status: "OPEN",
  severity: "MEDIUM",
  productType: "OTHER",
  productName: "",
  complaintType: "QUALITY",
});

export default function HubComplaintsPage() {
  const canDelete = useQcHubFullAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const selection = useHubRowSelection(rows);

  const load = async () => {
    try {
      setError("");
      const r = await complaintApi.getAll();
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

  const deleteOne = async (id: string, label?: string) => {
    if (!window.confirm(`Delete complaint ${label || ""}?`.trim())) return;
    setDeleting(true);
    setError("");
    try {
      await complaintApi.remove(id);
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
    if (!window.confirm(`Delete ${ids.length} selected complaint(s)?`)) return;
    setDeleting(true);
    setError("");
    try {
      await complaintApi.bulkRemove(ids);
      selection.clearSelection();
      await load();
    } catch (err: any) {
      setError(err.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await complaintApi.create({
        title: form.title,
        description: form.description || form.title,
        batchNo: form.batchNo || "N/A",
        customerName: form.customerName,
        customer: { customerName: form.customerName },
        status: form.status || "OPEN",
        severity: form.severity || "MEDIUM",
        productType: form.productType || "OTHER",
        productName: form.productName || form.title || "N/A",
        complaintType: form.complaintType || "QUALITY",
      });
      setShowForm(false);
      setForm(emptyForm());
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Complaints</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — customer complaint records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDelete && (
            <HubBulkDeleteButton
              selectedCount={selection.selectedList.length}
              deleting={deleting}
              onBulkDelete={bulkDelete}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) setForm(emptyForm());
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "+ New Complaint"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={save}
          className="rounded-xl border border-blue-200 p-4 space-y-3 bg-white dark:bg-gray-800"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Title</label>
              <input
                required
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Customer Name</label>
              <input
                required
                value={form.customerName || ""}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Complaint Status</label>
              <select
                required
                value={form.status || "OPEN"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              >
                {COMPLAINT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Batch No</label>
              <input
                value={form.batchNo || ""}
                onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
                placeholder="Batch no"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Description</label>
              <textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
                rows={3}
                placeholder="Describe the complaint"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      <div className="rounded-xl border overflow-x-auto bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-blue-50 dark:bg-blue-900/20">
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
              <th className="px-3 py-2 text-left font-semibold text-blue-900 dark:text-blue-200">No</th>
              <th className="px-3 py-2 text-left font-semibold text-blue-900 dark:text-blue-200">Title</th>
              <th className="px-3 py-2 text-left font-semibold text-blue-900 dark:text-blue-200">
                Customer Name
              </th>
              <th className="px-3 py-2 text-left font-semibold text-blue-900 dark:text-blue-200">Batch</th>
              <th className="px-3 py-2 text-left font-semibold text-blue-900 dark:text-blue-200">
                Complaint Status
              </th>
              {canDelete && (
                <th className="px-3 py-2 text-left font-semibold text-blue-900 dark:text-blue-200">Actions</th>
              )}
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
                      aria-label={`Select ${r.complaintNo}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2">{r.complaintNo}</td>
                <td className="px-3 py-2">{r.title || r.description}</td>
                <td className="px-3 py-2">{r.customer?.customerName || "—"}</td>
                <td className="px-3 py-2">{r.batchNo}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    {statusLabel(r.status)}
                  </span>
                </td>
                {canDelete && (
                  <td className="px-3 py-2">
                    <HubRowDeleteButton
                      disabled={deleting}
                      onDelete={() => deleteOne(r._id, r.complaintNo)}
                    />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 7 : 5} className="px-3 py-8 text-center text-gray-500">
                  No complaints yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
