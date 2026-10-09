"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, Snowflake, Send, Trash2 } from "lucide-react";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { getStoredQcToken } from "@/lib/portalSession";
import { formulationApi } from "@/lib/qcApi";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

type CompositionLine = {
  materialName: string;
  quantity: string;
  unit: string;
  percentage: string;
  notes: string;
};

type Formulation = {
  _id: string;
  formulationCode: string;
  formulationName: string;
  productType: string;
  productName?: string;
  grade?: string;
  status?: string;
  version?: string;
  description?: string;
  summary?: string;
  composition?: Array<{
    materialName?: string;
    quantity?: number;
    unit?: string;
    percentage?: number;
    notes?: string;
  }>;
  testResults?: Record<string, string | number>;
};

const PRODUCT_TYPES = [
  "TILE_ADHESIVE",
  "TILE_GROUT",
  "PREMIX_PLASTER",
  "REPAIR_PLASTER",
  "CRACK_FILLER",
  "WATERPROOFING_MEMBRANE",
  "SURFACE_SEALANT",
  "OTHER",
];

const TEST_RESULT_FIELDS = [
  { key: "appearance", label: "Appearance" },
  { key: "bulkDensity", label: "Bulk Density", unit: "g/l" },
  { key: "waterDemand", label: "Water Demand", unit: "%" },
  { key: "spreadability", label: "Spreadability", unit: "mm" },
  { key: "freshDensity", label: "Fresh Density", unit: "g/cm³" },
  { key: "sieveAnalysis", label: "Sieve Analysis" },
  { key: "compressive28Days", label: "Compressive (28 days)", unit: "N/mm²" },
  { key: "flexural28Days", label: "Flexural (28 days)", unit: "N/mm²" },
  { key: "tensileAdhesion", label: "Tensile Adhesion", unit: "N/mm²" },
  { key: "openTime", label: "Open Time", unit: "min" },
  { key: "slip", label: "Slip", unit: "mm" },
  { key: "overallResult", label: "Overall Result" },
] as const;

const emptyCompositionLine = (): CompositionLine => ({
  materialName: "",
  quantity: "",
  unit: "kg",
  percentage: "",
  notes: "",
});

const emptyForm = () => ({
  formulationCode: "",
  formulationName: "",
  productType: "TILE_ADHESIVE",
  productName: "",
  grade: "",
  description: "",
  summary: "",
});

export default function FormulationsPage() {
  const canDelete = useQcHubFullAccess();
  const apiUrl = useMemo(() => getBackendUrl(), []);
  const token =
    typeof window !== "undefined"
      ? getStoredQcToken() || localStorage.getItem("token")
      : null;

  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaInfo, setTwoFaInfo] = useState<{ code?: string; expiresAt?: string } | null>(null);

  const [formData, setFormData] = useState(emptyForm());
  const [composition, setComposition] = useState<CompositionLine[]>([emptyCompositionLine()]);
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const selection = useHubRowSelection(formulations);

  const formulationDeleteHeaders = useMemo(() => {
    if (!twoFaCode.trim()) return undefined;
    return { "x-formulation-2fa": twoFaCode.trim() };
  }, [twoFaCode]);

  const headers = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "x-company-id":
        (typeof window !== "undefined" && localStorage.getItem("company_id")) || "RESSICHEM",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    if (twoFaCode) h["x-formulation-2fa"] = twoFaCode;
    return h;
  }, [token, twoFaCode]);

  const loadFormulations = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load formulations");
      setFormulations(data.data || []);
      selection.clearSelection();
    } catch (err: any) {
      setMessage(err.message || "Failed to load formulations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const request2FA = async () => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/2fa/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": localStorage.getItem("company_id") || "RESSICHEM",
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to request code");
      setTwoFaInfo({ code: data.code, expiresAt: data.expiresAt });
      setMessage("2FA code generated. Use it within 10 minutes.");
    } catch (err: any) {
      setMessage(err.message || "Failed to request code");
    }
  };

  const resetCreateForm = () => {
    setFormData(emptyForm());
    setComposition([emptyCompositionLine()]);
    setTestValues({});
    setShowForm(false);
  };

  const createFormulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setMessage("");
    try {
      const compositionPayload = composition
        .filter((line) => line.materialName.trim())
        .map((line) => ({
          materialName: line.materialName.trim(),
          quantity: line.quantity ? Number(line.quantity) : undefined,
          unit: line.unit || "kg",
          percentage: line.percentage ? Number(line.percentage) : undefined,
          notes: line.notes || "",
        }));

      const testResults: Record<string, string> = {};
      for (const field of TEST_RESULT_FIELDS) {
        const raw = testValues[field.key];
        if (raw !== undefined && String(raw).trim() !== "") {
          testResults[field.key] = String(raw).trim();
        }
      }

      const res = await fetch(`${apiUrl}/api/qc/formulations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...formData,
          composition: compositionPayload,
          testResults,
          summary: formData.summary,
          rndConclusion: formData.summary,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create formulation");
      resetCreateForm();
      await loadFormulations();
      setMessage("Formulation created successfully.");
    } catch (err: any) {
      setMessage(err.message || "Failed to create formulation");
    }
  };

  const submitToQC = async (id: string) => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/${id}/submit-to-qc`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to submit");
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to submit");
    }
  };

  const approveForQC = async (id: string) => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/${id}/approve-for-qc`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to approve");
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to approve");
    }
  };

  const ensure2FaForDelete = () => {
    if (!twoFaCode.trim()) {
      setMessage("Enter the 2FA code before deleting formulations.");
      return false;
    }
    return true;
  };

  const deleteFormulation = async (id: string, label?: string) => {
    if (!ensure2FaForDelete()) return;
    if (!window.confirm(`Delete formulation ${label || ""}?`.trim())) return;
    setDeleting(true);
    setMessage("");
    try {
      await formulationApi.remove(id, formulationDeleteHeaders);
      selection.clearSelection();
      await loadFormulations();
      setMessage("Formulation deleted.");
    } catch (err: any) {
      setMessage(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const bulkDeleteFormulations = async () => {
    const ids = selection.selectedList;
    if (!ids.length) return;
    if (!ensure2FaForDelete()) return;
    if (!window.confirm(`Delete ${ids.length} selected formulation(s)?`)) return;
    setDeleting(true);
    setMessage("");
    try {
      await formulationApi.bulkRemove(ids, formulationDeleteHeaders);
      selection.clearSelection();
      await loadFormulations();
      setMessage(`Deleted ${ids.length} formulation(s).`);
    } catch (err: any) {
      setMessage(err.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const freeze = async (id: string) => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/${id}/freeze`, {
        method: "POST",
        headers,
        body: JSON.stringify({ freezeReason: "Locked after QA approval" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to freeze");
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to freeze");
    }
  };

  const summarizeTests = (testResults?: Record<string, string | number>) => {
    if (!testResults || !Object.keys(testResults).length) return "No testing results";
    const overall = testResults.overallResult;
    if (overall !== undefined && String(overall).trim() !== "") return String(overall);
    return `${Object.keys(testResults).length} result(s)`;
  };

  const summarizeComposition = (f: Formulation) => {
    const lines = f.composition || [];
    if (!lines.length) return "No formulation lines";
    return `${lines.length} material(s)`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Formulations</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Formulation composition, testing results, and summary (2FA required to create)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDelete && (
              <HubBulkDeleteButton
                selectedCount={selection.selectedList.length}
                deleting={deleting}
                onBulkDelete={bulkDeleteFormulations}
              />
            )}
            <button
              onClick={loadFormulations}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => (showForm ? resetCreateForm() : setShowForm(true))}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? "Cancel" : "New Formulation"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700/50 shadow p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={request2FA}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Request 2FA Code
          </button>
          <input
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value)}
            placeholder="Enter 2FA code"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-2 text-sm"
          />
          {twoFaInfo?.code && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Code (dev): <strong>{twoFaInfo.code}</strong>
            </span>
          )}
        </div>
        {message && <div className="text-sm text-blue-700 dark:text-blue-300">{message}</div>}
      </div>

      {showForm && (
        <form
          onSubmit={createFormulation}
          className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-200 dark:border-blue-800 shadow p-6 space-y-6"
        >
          <h4 className="text-base font-bold text-blue-800 dark:text-blue-300">New Formulation</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Formulation Code</label>
              <input
                required
                value={formData.formulationCode}
                onChange={(e) => setFormData((p) => ({ ...p, formulationCode: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Formulation Name</label>
              <input
                required
                value={formData.formulationName}
                onChange={(e) => setFormData((p) => ({ ...p, formulationName: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Product Type</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData((p) => ({ ...p, productType: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              >
                {PRODUCT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Product Name</label>
              <input
                value={formData.productName}
                onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Grade</label>
              <input
                value={formData.grade}
                onChange={(e) => setFormData((p) => ({ ...p, grade: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
          </div>

          {/* Formulation composition */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300">Formulation</h5>
              <button
                type="button"
                onClick={() => setComposition((p) => [...p, emptyCompositionLine()])}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
              >
                + Add material
              </button>
            </div>
            {composition.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold mb-1">Material</label>
                  <input
                    value={line.materialName}
                    onChange={(e) => {
                      const next = [...composition];
                      next[idx] = { ...next[idx], materialName: e.target.value };
                      setComposition(next);
                    }}
                    placeholder="e.g. Cement / Polymer"
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Qty</label>
                  <input
                    type="number"
                    step="any"
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...composition];
                      next[idx] = { ...next[idx], quantity: e.target.value };
                      setComposition(next);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Unit</label>
                  <input
                    value={line.unit}
                    onChange={(e) => {
                      const next = [...composition];
                      next[idx] = { ...next[idx], unit: e.target.value };
                      setComposition(next);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">%</label>
                  <input
                    type="number"
                    step="any"
                    value={line.percentage}
                    onChange={(e) => {
                      const next = [...composition];
                      next[idx] = { ...next[idx], percentage: e.target.value };
                      setComposition(next);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <input
                    value={line.notes}
                    onChange={(e) => {
                      const next = [...composition];
                      next[idx] = { ...next[idx], notes: e.target.value };
                      setComposition(next);
                    }}
                    placeholder="Notes"
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                  />
                  {composition.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setComposition((p) => p.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg border border-red-200 text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Testing results */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 p-4 space-y-3">
            <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300">Testing Results</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEST_RESULT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold mb-1">
                    {field.label}
                    {"unit" in field && field.unit ? ` (${field.unit})` : ""}
                  </label>
                  <input
                    value={testValues[field.key] || ""}
                    onChange={(e) => setTestValues({ ...testValues, [field.key]: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 p-4 space-y-2">
            <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300">Summary</h5>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData((p) => ({ ...p, summary: e.target.value }))}
              rows={4}
              placeholder="Formulation summary, conclusion, recommendations…"
              className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Create Formulation (2FA required)
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700/50 shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 text-left text-blue-900 dark:text-blue-200">
                {canDelete && (
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      onChange={selection.toggleAll}
                      disabled={!formulations.length || deleting}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="px-3 py-3 font-semibold">Code</th>
                <th className="px-3 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Formulation</th>
                <th className="px-3 py-3 font-semibold">Testing Results</th>
                <th className="px-3 py-3 font-semibold">Summary</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formulations.map((f) => {
                const expanded = expandedId === f._id;
                const tests = Object.entries(f.testResults || {}).filter(
                  ([, v]) => v !== undefined && v !== null && String(v).trim() !== ""
                );
                return (
                  <Fragment key={f._id}>
                    <tr className="border-t border-gray-200/60 dark:border-gray-700/60 align-top">
                      {canDelete && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selection.selectedIds.has(f._id)}
                            onChange={() => selection.toggleOne(f._id)}
                            disabled={deleting}
                            aria-label={`Select ${f.formulationCode}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-3 font-mono font-semibold">{f.formulationCode}</td>
                      <td className="px-3 py-3">{f.formulationName}</td>
                      <td className="px-3 py-3">{f.productType}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-blue-700 dark:text-blue-300">
                          {summarizeComposition(f)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : f._id)}
                          className="text-xs text-blue-600 hover:underline mt-1"
                        >
                          {expanded ? "Hide details" : "View details"}
                        </button>
                      </td>
                      <td className="px-3 py-3">{summarizeTests(f.testResults)}</td>
                      <td className="px-3 py-3 max-w-[220px]">
                        <div className="truncate" title={f.summary || ""}>
                          {f.summary?.trim() ? f.summary : "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3">{f.status || "—"}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => submitToQC(f._id)}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => approveForQC(f._id)}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => freeze(f._id)}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Snowflake className="h-3 w-3" />
                            Freeze
                          </button>
                          {canDelete && (
                            <HubRowDeleteButton
                              disabled={deleting}
                              onDelete={() => deleteFormulation(f._id, f.formulationCode)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                        <td colSpan={canDelete ? 9 : 8} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                            <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
                              <div className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                                Formulation
                              </div>
                              {(f.composition || []).length === 0 ? (
                                <div className="text-gray-500">No materials entered</div>
                              ) : (
                                <ul className="space-y-1">
                                  {(f.composition || []).map((line, i) => (
                                    <li key={i}>
                                      <span className="font-semibold">{line.materialName}</span>
                                      {line.quantity !== undefined ? ` — ${line.quantity} ${line.unit || ""}` : ""}
                                      {line.percentage !== undefined ? ` (${line.percentage}%)` : ""}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
                              <div className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                                Testing Results
                              </div>
                              {tests.length === 0 ? (
                                <div className="text-gray-500">No testing results</div>
                              ) : (
                                <ul className="space-y-1">
                                  {tests.map(([key, value]) => {
                                    const label =
                                      TEST_RESULT_FIELDS.find((t) => t.key === key)?.label || key;
                                    return (
                                      <li key={key}>
                                        <span className="text-gray-500">{label}:</span>{" "}
                                        <span className="font-semibold">{String(value)}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                            <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
                              <div className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                                Summary
                              </div>
                              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                {f.summary?.trim() || "No summary"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!formulations.length && (
                <tr>
                  <td className="px-3 py-8 text-center text-gray-500" colSpan={canDelete ? 9 : 8}>
                    No formulations yet. Click <strong>New Formulation</strong> to add composition,
                    testing results, and summary.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
