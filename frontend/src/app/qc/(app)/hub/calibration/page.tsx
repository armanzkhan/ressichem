"use client";

import { useEffect, useState } from "react";
import { calibrationApi } from "@/lib/qcApi";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

export default function HubCalibrationPage() {
  const canDelete = useQcHubFullAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [dueSoon, setDueSoon] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const selection = useHubRowSelection(rows);

  const load = async () => {
    try {
      setError("");
      const r = await calibrationApi.getAll();
      setRows(r.data || []);
      selection.clearSelection();
      calibrationApi.getDueSoon().then((res) => setDueSoon(res.data || [])).catch(() => {});
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
      await calibrationApi.create(form);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteOne = async (id: string, label?: string) => {
    if (!window.confirm(`Delete calibration record ${label || ""}?`.trim())) return;
    setDeleting(true);
    setError("");
    try {
      await calibrationApi.remove(id);
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
    if (!window.confirm(`Delete ${ids.length} selected calibration record(s)?`)) return;
    setDeleting(true);
    setError("");
    try {
      await calibrationApi.bulkRemove(ids);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calibration Records</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">SRS 3.2.1 — equipment calibration tracking</p>
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
            {showForm ? "Cancel" : "+ New Record"}
          </button>
        </div>
      </div>
      {dueSoon.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>{dueSoon.length}</strong> calibration(s) due soon or overdue.
        </div>
      )}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-white dark:border-gray-700 dark:bg-gray-800">
          <input required placeholder="Equipment name" value={form.equipmentName || ""} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <input placeholder="Equipment ID" value={form.equipmentId || ""} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <input type="date" value={form.calibrationDate || ""} onChange={(e) => setForm({ ...form, calibrationDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <input type="date" placeholder="Next due" value={form.nextDueDate || ""} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save</button>
        </form>
      )}
      <div className="rounded-xl border border-gray-200 overflow-x-auto dark:border-gray-700">
        <table className="min-w-full text-sm text-gray-900 dark:text-gray-100">
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
              <th className="px-3 py-2 text-left">Record No</th>
              <th className="px-3 py-2 text-left">Equipment</th>
              <th className="px-3 py-2 text-left">Calibrated</th>
              <th className="px-3 py-2 text-left">Next Due</th>
              <th className="px-3 py-2 text-left">Status</th>
              {canDelete && <th className="px-3 py-2 text-left">Actions</th>}
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
                      aria-label={`Select ${r.recordNo}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2">{r.recordNo}</td>
                <td className="px-3 py-2">{r.equipmentName}</td>
                <td className="px-3 py-2">{r.calibrationDate ? new Date(r.calibrationDate).toLocaleDateString() : ""}</td>
                <td className="px-3 py-2">{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : ""}</td>
                <td className="px-3 py-2">{r.status}</td>
                {canDelete && (
                  <td className="px-3 py-2">
                    <HubRowDeleteButton disabled={deleting} onDelete={() => deleteOne(r._id, r.recordNo)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
