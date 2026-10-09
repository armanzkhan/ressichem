"use client";

import { useEffect, useState, Fragment } from "react";
import { packagingMaterialApi } from "@/lib/qcApi";
import { PACKAGING_MATERIAL_TYPES } from "@/lib/qcHubDryMortarSrs";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

const PACKAGING_RESULT_FIELDS = [
  { key: "dimensions", label: "Dimensions", placeholder: "e.g. OK / 500x300 mm" },
  { key: "weightGsm", label: "Weight / GSM", placeholder: "e.g. 80 gsm" },
  { key: "thickness", label: "Thickness", placeholder: "e.g. 0.05 mm" },
  { key: "printQuality", label: "Print Quality", placeholder: "e.g. Pass / Fail" },
  { key: "colorMatch", label: "Color Match", placeholder: "e.g. OK" },
  { key: "sealStrength", label: "Seal Strength", placeholder: "e.g. Pass" },
  { key: "visualDefects", label: "Visual Defects", placeholder: "e.g. None" },
  { key: "overallResult", label: "Overall Result", placeholder: "e.g. Pass / Fail" },
] as const;

const emptyForm = () => ({
  materialType: PACKAGING_MATERIAL_TYPES[0],
  materialName: "",
  batchNo: "",
  supplier: "",
  remarks: "",
  status: "pending",
});

function resultEntries(inspectionResults?: Record<string, unknown>) {
  if (!inspectionResults || typeof inspectionResults !== "object") return [];
  return PACKAGING_RESULT_FIELDS.map((f) => {
    const v = inspectionResults[f.key];
    if (v === undefined || v === null || String(v).trim() === "") return null;
    return { label: f.label, value: String(v) };
  }).filter(Boolean) as { label: string; value: string }[];
}

export default function HubPackagingMaterialsPage() {
  const canDelete = useQcHubFullAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [results, setResults] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const selection = useHubRowSelection(rows);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await packagingMaterialApi.getAll({ limit: 200 });
      setRows(r.data || []);
      selection.clearSelection();
    } catch (e: any) {
      setError(e.message || "Failed to load packaging records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setResults({});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setResults({});
    setShowForm(true);
  };

  const openEdit = (row: any) => {
    setEditingId(row._id);
    setForm({
      materialType: row.materialType || PACKAGING_MATERIAL_TYPES[0],
      materialName: row.materialName || "",
      batchNo: row.batchNo || "",
      supplier: row.supplier || "",
      remarks: row.remarks || "",
      status: row.status || "pending",
    });
    const next: Record<string, string> = {};
    for (const field of PACKAGING_RESULT_FIELDS) {
      const v = row.inspectionResults?.[field.key];
      if (v !== undefined && v !== null) next[field.key] = String(v);
    }
    setResults(next);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildInspectionResults = () => {
    const inspectionResults: Record<string, string> = {};
    for (const field of PACKAGING_RESULT_FIELDS) {
      const raw = results[field.key];
      if (raw !== undefined && String(raw).trim() !== "") {
        inspectionResults[field.key] = String(raw).trim();
      }
    }
    return inspectionResults;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        inspectionResults: buildInspectionResults(),
      };
      if (editingId) {
        await packagingMaterialApi.update(editingId, payload);
      } else {
        await packagingMaterialApi.create(payload);
      }
      resetForm();
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this packaging inspection?")) return;
    setDeleting(true);
    try {
      setError("");
      await packagingMaterialApi.remove(id);
      if (editingId === id) resetForm();
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
    if (!window.confirm(`Delete ${ids.length} selected packaging inspection(s)?`)) return;
    setDeleting(true);
    setError("");
    try {
      await packagingMaterialApi.bulkRemove(ids);
      if (editingId && ids.includes(editingId)) resetForm();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Packaging Material QC</h1>
          <p className="text-sm text-gray-500">
            Create, edit, and delete packaging inspections with test results
          </p>
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
            onClick={() => (showForm ? resetForm() : openCreate())}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "+ New Inspection"}
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
          className="rounded-xl border border-blue-200 p-4 space-y-4 bg-white dark:bg-gray-800"
        >
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">
            {editingId ? "Edit Inspection" : "New Inspection"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Material type</label>
              <select
                value={form.materialType}
                onChange={(e) => setForm({ ...form, materialType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              >
                {PACKAGING_MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Material name</label>
              <input
                required
                value={form.materialName || ""}
                onChange={(e) => setForm({ ...form, materialName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Batch no</label>
              <input
                required
                value={form.batchNo || ""}
                onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Supplier</label>
              <input
                required
                value={form.supplier || ""}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Remarks</label>
              <textarea
                value={form.remarks || ""}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
                rows={2}
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4">
            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">
              Inspection / Test Results
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PACKAGING_RESULT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={results[field.key] || ""}
                    onChange={(e) => setResults({ ...results, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border overflow-x-auto bg-white dark:bg-gray-800">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                {canDelete && (
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      onChange={selection.toggleAll}
                      disabled={!rows.length || deleting}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200">Type</th>
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200">Name</th>
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200">Batch</th>
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200">Supplier</th>
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200 min-w-[220px]">
                  Results
                </th>
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200">Status</th>
                <th className="px-3 py-3 text-left font-semibold text-blue-900 dark:text-blue-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const entries = resultEntries(r.inspectionResults);
                const overall =
                  r.inspectionResults?.overallResult !== undefined &&
                  r.inspectionResults?.overallResult !== null &&
                  String(r.inspectionResults.overallResult).trim() !== ""
                    ? String(r.inspectionResults.overallResult)
                    : null;
                const isExpanded = expandedId === r._id;

                return (
                  <Fragment key={r._id}>
                    <tr className="border-t align-top">
                      {canDelete && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selection.selectedIds.has(r._id)}
                            onChange={() => selection.toggleOne(r._id)}
                            disabled={deleting}
                            aria-label={`Select ${r.batchNo}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">{r.materialType}</td>
                      <td className="px-3 py-3">{r.materialName}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.batchNo}</td>
                      <td className="px-3 py-3">{r.supplier}</td>
                      <td className="px-3 py-3">
                        {entries.length === 0 ? (
                          <span className="text-gray-400">No results entered</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-semibold text-blue-700 dark:text-blue-300">
                              {overall || `${entries.length} result(s)`}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : r._id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {isExpanded ? "Hide details" : "View details"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {canDelete ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <HubRowDeleteButton disabled={deleting} onDelete={() => remove(r._id)} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && entries.length > 0 && (
                      <tr className="bg-blue-50/40 dark:bg-blue-900/10">
                        <td colSpan={canDelete ? 8 : 7} className="px-4 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            {entries.map((entry) => (
                              <div
                                key={`${r._id}-${entry.label}`}
                                className="rounded-lg border border-blue-100 dark:border-blue-800 bg-white dark:bg-gray-900 px-3 py-2"
                              >
                                <div className="text-gray-500">{entry.label}</div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {entry.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={canDelete ? 8 : 7} className="px-3 py-8 text-center text-gray-500">
                    No packaging inspections yet. Click <strong>+ New Inspection</strong> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
