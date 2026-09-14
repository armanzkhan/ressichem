"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { getBackendUrl } from "@/lib/getBackendUrl";

type QCTest = {
  _id: string;
  code: string;
  name: string;
  unit?: string;
  dataType?: "number" | "string" | "boolean";
  applicableModules?: string[];
  isActive?: boolean;
};
type QCStandard = {
  _id: string;
  system: string;
  module: string;
  productCategory: string;
  productName?: string;
  grade?: string;
  test: QCTest | string;
  min?: number;
  max?: number;
  target?: number;
  unit?: string;
  notes?: string;
  isActive?: boolean;
  effectiveFrom?: string;
};

const MODULE_OPTIONS = [
  "RESIN",
  "HARDENER",
  "DRY_MORTAR",
  "LMS_RESIN",
  "LMS_HARDENER",
  "LMS_FLOORING",
  "RAW_MATERIAL",
  "PACKAGING",
  "QA_BOTTLE_FILLING",
  "RND_TRIAL",
];

export default function QCStandardsPage() {
  const apiUrl = useMemo(() => getBackendUrl(), []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tests, setTests] = useState<QCTest[]>([]);
  const [standards, setStandards] = useState<QCStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [compactView] = useState(true);

  const [testForm, setTestForm] = useState({
    code: "",
    name: "",
    unit: "",
    dataType: "number" as "number" | "string" | "boolean",
    applicableModules: [] as string[],
  });
  const [editTest, setEditTest] = useState<QCTest | null>(null);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    unit: "",
    dataType: "number" as "number" | "string" | "boolean",
    applicableModules: [] as string[],
  });
  const [editStandard, setEditStandard] = useState<QCStandard | null>(null);
  const [editStandardForm, setEditStandardForm] = useState({
    module: "",
    grade: "",
    test: "",
    min: "",
    max: "",
    target: "",
    unit: "",
    notes: "",
  });

  const [form, setForm] = useState({
    system: "QC_SITE_AREA",
    module: "RESIN",
    productCategory: "Epoxy Resin",
    productName: "",
    grade: "",
    test: "",
    min: "",
    max: "",
    target: "",
    unit: "",
    notes: "",
  });
  const computeTarget = (min: string, max: string) => {
    const minVal = Number(min);
    const maxVal = Number(max);
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return "";
    return String((minVal + maxVal) / 2);
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    setTestMessage("");
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "x-company-id": localStorage.getItem("company_id") || "RESSICHEM",
      };
      const fetchOpts = { cache: "no-store" as RequestCache, headers };
      const [tRes, sRes] = await Promise.all([
        fetch(`${apiUrl}/api/qc/tests?active=true`, fetchOpts),
        fetch(`${apiUrl}/api/qc/standards?active=true`, fetchOpts),
      ]);

      const tData = await tRes.json();
      const sData = await sRes.json();
      if (!tRes.ok) throw new Error(tData?.message || "Failed to load tests");
      if (!sRes.ok) throw new Error(sData?.message || "Failed to load standards");

      setTests(tData.data || []);
      setStandards(sData.data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleModule = (m: string) => {
    setTestForm((prev) => {
      const set = new Set(prev.applicableModules);
      if (set.has(m)) set.delete(m);
      else set.add(m);
      return { ...prev, applicableModules: Array.from(set) };
    });
  };
  const toggleEditModule = (m: string) => {
    setEditForm((prev) => {
      const set = new Set(prev.applicableModules);
      if (set.has(m)) set.delete(m);
      else set.add(m);
      return { ...prev, applicableModules: Array.from(set) };
    });
  };

  const createTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setTestMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(testForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create test");
      setTestForm({ code: "", name: "", unit: "", dataType: "number", applicableModules: [] });
      await load();
    } catch (e: any) {
      setTestMessage(e?.message || "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  const deactivateTest = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this test?")) return;
    setLoading(true);
    setTestMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/tests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to deactivate test");
      await load();
    } catch (e: any) {
      setTestMessage(e?.message || "Failed to deactivate test");
    } finally {
      setLoading(false);
    }
  };
  const openEdit = (t: QCTest) => {
    setEditTest(t);
    setEditForm({
      code: t.code || "",
      name: t.name || "",
      unit: t.unit || "",
      dataType: (t.dataType as any) || "number",
      applicableModules: t.applicableModules || [],
    });
  };
  const updateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editTest?._id) return;
    setLoading(true);
    setTestMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/tests/${editTest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update test");
      setEditTest(null);
      await load();
    } catch (e: any) {
      setTestMessage(e?.message || "Failed to update test");
    } finally {
      setLoading(false);
    }
  };

  const createStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const payload: any = {
        system: form.system,
        module: form.module,
        productCategory: form.productCategory,
        productName: form.productName,
        grade: form.grade,
        test: form.test,
        unit: form.unit,
        notes: form.notes,
      };
      if (form.min !== "") payload.min = Number(form.min);
      if (form.max !== "") payload.max = Number(form.max);
      const computedTarget = computeTarget(form.min, form.max);
      if (computedTarget !== "") payload.target = Number(computedTarget);

      const res = await fetch(`${apiUrl}/api/qc/standards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create standard");

      setForm((p) => ({ ...p, test: "", min: "", max: "", target: "", unit: "", notes: "" }));
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Failed to create standard");
    } finally {
      setLoading(false);
    }
  };

  const deactivateStandard = async (id: string) => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/standards/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to deactivate standard");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Failed to deactivate standard");
    } finally {
      setLoading(false);
    }
  };
  const openStandardEdit = (s: QCStandard) => {
    setEditStandard(s);
    const tId = typeof s.test === "string" ? s.test : s.test?._id || "";
    setEditStandardForm({
      module: s.module || "",
      grade: s.grade || "",
      test: tId || "",
      min: s.min !== undefined ? String(s.min) : "",
      max: s.max !== undefined ? String(s.max) : "",
      target: s.target !== undefined ? String(s.target) : "",
      unit: s.unit || "",
      notes: s.notes || "",
    });
  };
  const updateStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editStandard?._id) return;
    setLoading(true);
    setMessage("");
    try {
      const computedTarget = computeTarget(editStandardForm.min, editStandardForm.max);
      const payload: any = {
        system: editStandard.system,
        module: editStandardForm.module,
        grade: editStandardForm.grade,
        test: editStandardForm.test,
        unit: editStandardForm.unit,
        notes: editStandardForm.notes,
      };
      if (editStandard.productCategory) payload.productCategory = editStandard.productCategory;
      if (editStandard.productName) payload.productName = editStandard.productName;
      if (editStandardForm.min !== "") payload.min = Number(editStandardForm.min);
      if (editStandardForm.max !== "") payload.max = Number(editStandardForm.max);
      if (computedTarget !== "") payload.target = Number(computedTarget);

      const res = await fetch(`${apiUrl}/api/qc/standards/${editStandard._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update standard");
      setEditStandard(null);
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Failed to update standard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">QC Tests & Standard Criteria</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Manage test definitions and standard criteria in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" />
        </div>
      </div>

      <details className="group rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-4">
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-lg border border-transparent bg-gradient-to-r from-emerald-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-3 py-2 transition hover:border-emerald-200 dark:hover:border-gray-700">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">QC Tests</h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">Create and manage test definitions.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="hidden sm:inline">Collapse</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition group-open:rotate-180 dark:bg-emerald-900/40 dark:text-emerald-200">⌄</span>
            </div>
          </div>
        </summary>
        <div className="mt-3 space-y-4">
          <div id="tests" className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 shadow p-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Create Test</h3>

            {testMessage && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                {testMessage}
              </div>
            )}

            <form onSubmit={createTest} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Code</label>
            <input
              value={testForm.code}
              onChange={(e) => setTestForm((p) => ({ ...p, code: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="EEW"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              value={testForm.name}
              onChange={(e) => setTestForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="Epoxy Equivalent Weight"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
            <input
              value={testForm.unit}
              onChange={(e) => setTestForm((p) => ({ ...p, unit: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="g/eq, cP, min, °C..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Data Type</label>
            <select
              value={testForm.dataType}
              onChange={(e) => setTestForm((p) => ({ ...p, dataType: e.target.value as any }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            >
              <option value="number">number</option>
              <option value="string">string</option>
              <option value="boolean">boolean</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Applicable Modules</label>
            <div className="flex flex-wrap gap-2">
              {MODULE_OPTIONS.map((m) => {
                const active = testForm.applicableModules.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleModule(m)}
                    className={[
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition",
                      active
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-xs font-semibold shadow disabled:opacity-60"
              type="submit"
            >
              {loading ? "Saving..." : "Create Test"}
            </button>
          </div>
            </form>
          </div>

          <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Active Tests</h3>
              <button
                onClick={load}
                className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-black"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>}

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Unit</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Modules</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                      <td className={compactView ? "py-2 pr-4 font-mono font-semibold" : "py-3 pr-4 font-mono font-semibold"}>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          {t.code}
                        </span>
                      </td>
                      <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>{t.name}</td>
                      <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {t.unit || "-"}
                        </span>
                      </td>
                      <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {t.dataType}
                        </span>
                      </td>
                      <td className={compactView ? "py-2 pr-4 text-xs text-gray-700 dark:text-gray-200" : "py-3 pr-4 text-xs text-gray-700 dark:text-gray-200"}>
                        {(t.applicableModules || []).length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(t.applicableModules || []).map((m) => (
                              <span
                                key={m}
                                className="inline-flex items-center rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={compactView ? "py-2 pr-2 text-center" : "py-3 pr-2 text-center"}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            disabled={loading}
                            aria-label="Edit test"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deactivateTest(t._id)}
                            className="p-2 rounded-full bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-60"
                            disabled={loading}
                            aria-label="Deactivate test"
                            title="Deactivate"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!tests.length && !loading && (
                    <tr>
                      <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={6}>
                        No tests yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>

      <details className="group rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-4">
        <summary className="cursor-pointer select-none">
          <div className="flex items-center justify-between rounded-lg border border-transparent bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-3 py-2 transition hover:border-indigo-200 dark:hover:border-gray-700">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Standard Criteria</h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-400">Define limits and targets for tests.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              <span className="hidden sm:inline">Collapse</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 transition group-open:rotate-180 dark:bg-indigo-900/40 dark:text-indigo-200">⌄</span>
            </div>
          </div>
        </summary>
        <div className="mt-3 space-y-4">
          <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 shadow p-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Create Standard Criteria</h3>

        {message && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
            {message}
          </div>
        )}

            <form onSubmit={createStandard} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Module</label>
            <select
              value={form.module}
              onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
              {/* Product Category and Product Name hidden as requested */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Grade</label>
            <input
              value={form.grade}
              onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="e.g. 200, 300, etc."
                  required
            />
          </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Test Name</label>
            <select
              value={form.test}
              onChange={(e) => setForm((p) => ({ ...p, test: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              required
            >
                  <option value="">Test</option>
              {tests.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Min</label>
                <input
                  value={form.min}
                  onChange={(e) =>
                    setForm((p) => {
                      const nextMin = e.target.value;
                      return { ...p, min: nextMin, target: computeTarget(nextMin, p.max) };
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="numeric"
            />
          </div>
          <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Max</label>
                <input
                  value={form.max}
                  onChange={(e) =>
                    setForm((p) => {
                      const nextMax = e.target.value;
                      return { ...p, max: nextMax, target: computeTarget(p.min, nextMax) };
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="numeric"
            />
          </div>
          <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Target</label>
            <input
                  value={computeTarget(form.min, form.max) || ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 px-3 py-2 text-xs"
                  placeholder="auto"
            />
          </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Unit</label>
            <input
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
              placeholder="cP, min, °C..."
                  required
            />
          </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  placeholder="Remarks / method notes…"
                  rows={3}
                />
          </div>

          <div className="md:col-span-3">
            <button
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-xs font-semibold shadow disabled:opacity-60"
              type="submit"
            >
              {loading ? "Saving..." : "Create Standard"}
            </button>
          </div>
        </form>
      </div>

          <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-white/30 dark:border-gray-700/50 shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Active Standards</h3>
              <button
                onClick={load}
                className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-black"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>}

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-4">System</th>
                    <th className="py-2 pr-4">Module</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Grade</th>
                    <th className="py-2 pr-4">Test</th>
                    <th className="py-2 pr-4">Min</th>
                    <th className="py-2 pr-4">Max</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Unit</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {standards.map((s) => {
                    const t = typeof s.test === "string" ? null : (s.test as QCTest);
                    return (
                      <tr key={s._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {s.system}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            {s.module || "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>{s.productCategory || "-"}</td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                            {s.grade || "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">
                            {t ? `${t.code}` : "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                            {s.min ?? "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                            {s.max ?? "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                            {s.target ?? "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-4" : "py-3 pr-4"}>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {s.unit || t?.unit || "-"}
                          </span>
                        </td>
                        <td className={compactView ? "py-2 pr-2" : "py-3 pr-2"}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openStandardEdit(s)}
                              className="p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                              disabled={loading}
                              aria-label="Edit standard"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deactivateStandard(s._id)}
                              className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                              disabled={loading}
                              aria-label="Deactivate standard"
                              title="Deactivate"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!standards.length && !loading && (
                    <tr>
                      <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={10}>
                        No standards yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>
      {editTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-white/30 dark:border-gray-700/50">
            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 px-5 py-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Edit Test</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{editTest.code}</p>
              </div>
              <button
                onClick={() => setEditTest(null)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={updateTest} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Code</label>
                <input
                  value={editForm.code}
                  onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
                <input
                  value={editForm.unit}
                  onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Data Type</label>
                <select
                  value={editForm.dataType}
                  onChange={(e) => setEditForm((p) => ({ ...p, dataType: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                >
                  <option value="number">number</option>
                  <option value="string">string</option>
                  <option value="boolean">boolean</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Applicable Modules</label>
                <div className="flex flex-wrap gap-2">
                  {MODULE_OPTIONS.map((m) => {
                    const active = editForm.applicableModules.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleEditModule(m)}
                        className={[
                          "px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition",
                          active
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                        ].join(" ")}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTest(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-xs font-semibold shadow disabled:opacity-60"
                  type="submit"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editStandard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-white/30 dark:border-gray-700/50">
            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 px-5 py-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Edit Standard</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{editStandard.module}</p>
              </div>
              <button
                onClick={() => setEditStandard(null)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={updateStandard} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Module</label>
                <select
                  value={editStandardForm.module}
                  onChange={(e) => setEditStandardForm((p) => ({ ...p, module: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                >
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Grade</label>
                <input
                  value={editStandardForm.grade}
                  onChange={(e) => setEditStandardForm((p) => ({ ...p, grade: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Test Name</label>
                <select
                  value={editStandardForm.test}
                  onChange={(e) => setEditStandardForm((p) => ({ ...p, test: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  required
                >
                  <option value="">Test</option>
                  {tests.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
                <input
                  value={editStandardForm.unit}
                  onChange={(e) => setEditStandardForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Min</label>
                <input
                  value={editStandardForm.min}
                  onChange={(e) =>
                    setEditStandardForm((p) => {
                      const nextMin = e.target.value;
                      return { ...p, min: nextMin, target: computeTarget(nextMin, p.max) };
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  placeholder="numeric"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max</label>
                <input
                  value={editStandardForm.max}
                  onChange={(e) =>
                    setEditStandardForm((p) => {
                      const nextMax = e.target.value;
                      return { ...p, max: nextMax, target: computeTarget(p.min, nextMax) };
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  placeholder="numeric"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Target</label>
                <input
                  value={computeTarget(editStandardForm.min, editStandardForm.max) || ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 px-3 py-2 text-xs"
                  placeholder="auto"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea
                  value={editStandardForm.notes}
                  onChange={(e) => setEditStandardForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditStandard(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-xs font-semibold shadow disabled:opacity-60"
                  type="submit"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


