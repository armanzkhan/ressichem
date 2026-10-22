"use client";

import { useEffect, useState } from "react";
import { rdExperimentApi } from "@/lib/qcApi";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

export default function HubRndExperimentsPage() {
  const canDelete = useQcHubFullAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ productType: "TILE_ADHESIVE" });
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const selection = useHubRowSelection(rows);

  const load = async () => {
    try {
      setError("");
      const r = await rdExperimentApi.getAll();
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
      await rdExperimentApi.create(form);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteOne = async (id: string, label?: string) => {
    if (!window.confirm(`Delete experiment ${label || ""}?`.trim())) return;
    setDeleting(true);
    setError("");
    try {
      await rdExperimentApi.remove(id);
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
    if (!window.confirm(`Delete ${ids.length} selected experiment(s)?`)) return;
    setDeleting(true);
    setError("");
    try {
      await rdExperimentApi.bulkRemove(ids);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">R&amp;D Experiments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">SRS 3.3 — trial batches T0/T1/T2, formulation comparison, cost reduction</p>
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
            {showForm ? "Cancel" : "+ New Experiment"}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-white dark:border-gray-700 dark:bg-gray-800">
          <input required placeholder="Experiment name" value={form.experimentName || ""} onChange={(e) => setForm({ ...form, experimentName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <textarea required placeholder="Objective" value={form.objective || ""} onChange={(e) => setForm({ ...form, objective: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <input placeholder="Target product" value={form.targetProduct || ""} onChange={(e) => setForm({ ...form, targetProduct: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          <select value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            <option value="TILE_ADHESIVE">Tile Adhesive</option>
            <option value="TILE_GROUT">Tile Grout</option>
            <option value="PREMIX_PLASTER">Premix Plaster</option>
            <option value="REPAIR_PLASTER">Repair Mortar</option>
            <option value="CRACK_FILLER">Crack Filler</option>
            <option value="WATERPROOFING_MEMBRANE">Waterproofing</option>
            <option value="SURFACE_SEALANT">Sealers</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Create</button>
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
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Trials</th>
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
                      aria-label={`Select ${r.experimentCode}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2">{r.experimentCode}</td>
                <td className="px-3 py-2">{r.experimentName}</td>
                <td className="px-3 py-2">{r.targetProduct || r.productType}</td>
                <td className="px-3 py-2">{(r.trials || []).length}</td>
                <td className="px-3 py-2">{r.status}</td>
                {canDelete && (
                  <td className="px-3 py-2">
                    <HubRowDeleteButton disabled={deleting} onDelete={() => deleteOne(r._id, r.experimentCode)} />
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
