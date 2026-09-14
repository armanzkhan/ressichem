"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { rdTrialBatchApi } from "@/lib/qcSiteApi";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { onQcDataRowClick, qcDataRowClassName } from "@/lib/qcRowClick";

type FormulationRow = {
  id: string;
  material: string;
  quantity: string;
};

type TestingResultRow = {
  id: string;
  test: string;
  result: string;
};

type QcTestOption = {
  _id: string;
  code: string;
  name: string;
  unit?: string;
  applicableModules?: string[];
};

type LogSheetAttachment = {
  _id: string;
  originalName: string;
  path: string;
};

type RDTrialBatch = {
  _id: string;
  productFolder: string;
  trialBatchNo: string;
  fullTrialCode: string;
  productName: string;
  productType: string;
  targetGrade: string;
  trialDate: string;
  costPerUnit: number;
  costUnit: string;
  performanceCostRatio: number;
  status: "planned" | "in_progress" | "completed" | "on_hold" | "cancelled";
  observations: string;
  conclusions: string;
  nextSteps: string;
  parameters?: {
    formulation?: { material: string; quantity: number }[];
    formulationTotals?: { materialCount: number; totalQuantity: number };
  };
  testResults?: {
    results?: { test: string; result: string }[];
    totals?: { testCount: number };
  };
  logSheet?: LogSheetAttachment | string | null;
};

function logSheetAttachmentUrl(path?: string): string | null {
  if (!path) return null;
  const base = getBackendUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveLogSheet(record?: RDTrialBatch | null): LogSheetAttachment | null {
  if (!record?.logSheet) return null;
  if (typeof record.logSheet === "object") return record.logSheet;
  return null;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newFormulationRow(): FormulationRow {
  return { id: newId(), material: "", quantity: "" };
}

function newTestingResultRow(): TestingResultRow {
  return { id: newId(), test: "", result: "" };
}

function formulationRowsFromRecord(record?: RDTrialBatch | null): FormulationRow[] {
  const lines = record?.parameters?.formulation;
  if (!Array.isArray(lines) || !lines.length) return [newFormulationRow()];
  return lines.map((line, index) => ({
    id: `loaded-${index}-${line.material}`,
    material: line.material || "",
    quantity: line.quantity !== undefined && line.quantity !== null ? String(line.quantity) : "",
  }));
}

function buildFormulationPayload(rows: FormulationRow[]) {
  const formulation = rows
    .filter((row) => row.material.trim() || row.quantity.trim())
    .map((row) => ({
      material: row.material.trim(),
      quantity: Number(row.quantity) || 0,
    }));

  const materialCount = formulation.filter((row) => row.material).length;
  const totalQuantity = formulation.reduce((sum, row) => sum + row.quantity, 0);

  return {
    formulation,
    formulationTotals: { materialCount, totalQuantity },
  };
}

function testingResultRowsFromRecord(record?: RDTrialBatch | null, testOptions: QcTestOption[] = []): TestingResultRow[] {
  const lines = record?.testResults?.results;
  if (!Array.isArray(lines) || !lines.length) return [newTestingResultRow()];
  return lines.map((line, index) => {
    const raw = String(line.test || "").trim();
    const matched =
      testOptions.find((t) => t.code === raw) ||
      testOptions.find((t) => t.name === raw) ||
      testOptions.find((t) => `${t.code} — ${t.name}` === raw);
    return {
      id: `loaded-test-${index}-${raw || index}`,
      test: matched?.code || raw,
      result: line.result || "",
    };
  });
}

function buildTestingResultPayload(rows: TestingResultRow[]) {
  const results = rows
    .filter((row) => row.test.trim() || row.result.trim())
    .map((row) => ({
      test: row.test.trim(),
      result: row.result.trim(),
    }));

  const testCount = results.filter((row) => row.test).length;

  return {
    results,
    totals: { testCount },
  };
}

function resetTrialSections(
  setFormulationRows: React.Dispatch<React.SetStateAction<FormulationRow[]>>,
  setTestingResultRows: React.Dispatch<React.SetStateAction<TestingResultRow[]>>,
  setLogSheetFile: React.Dispatch<React.SetStateAction<File | null>>,
  setExistingLogSheet: React.Dispatch<React.SetStateAction<LogSheetAttachment | null>>,
  logSheetInputRef: React.RefObject<HTMLInputElement | null>
) {
  setFormulationRows([newFormulationRow()]);
  setTestingResultRows([newTestingResultRow()]);
  setLogSheetFile(null);
  setExistingLogSheet(null);
  if (logSheetInputRef.current) logSheetInputRef.current.value = "";
}

export default function RDTrialsPage() {
  const [records, setRecords] = useState<RDTrialBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RDTrialBatch | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [folderTrials, setFolderTrials] = useState<RDTrialBatch[]>([]);

  const [form, setForm] = useState({
    productFolder: "",
    trialBatchNo: "",
    productName: "",
    trialDate: new Date().toISOString().slice(0, 10),
    observations: "",
    nextSteps: "",
  });
  const [formulationRows, setFormulationRows] = useState<FormulationRow[]>([newFormulationRow()]);
  const [testingResultRows, setTestingResultRows] = useState<TestingResultRow[]>([newTestingResultRow()]);
  const [qcTests, setQcTests] = useState<QcTestOption[]>([]);
  const [logSheetFile, setLogSheetFile] = useState<File | null>(null);
  const [existingLogSheet, setExistingLogSheet] = useState<LogSheetAttachment | null>(null);
  const logSheetInputRef = useRef<HTMLInputElement | null>(null);

  const formulationTotals = useMemo(() => {
    const payload = buildFormulationPayload(formulationRows);
    return payload.formulationTotals;
  }, [formulationRows]);

  const testingResultTotals = useMemo(() => {
    const payload = buildTestingResultPayload(testingResultRows);
    return payload.totals;
  }, [testingResultRows]);

  const rndTestOptions = useMemo(() => {
    const filtered = qcTests.filter((t) => (t.applicableModules || []).includes("RND_TRIAL"));
    const list = filtered.length ? filtered : qcTests;
    return [...list].sort((a, b) => a.code.localeCompare(b.code));
  }, [qcTests]);

  const loadQcTests = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const apiUrl = getBackendUrl();
      const companyId = localStorage.getItem("company_id") || "RESSICHEM";
      const res = await fetch(`${apiUrl}/api/qc/tests?active=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId,
        },
      });
      const data = await res.json();
      if (!res.ok) return;
      setQcTests(data.data || []);
    } catch {
      // dropdown stays empty until tests are available
    }
  };

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await rdTrialBatchApi.getAll({ page: 1, limit: 100 });
      if (res.success) {
        setRecords(res.data || []);
      } else {
        setMessage(res.message || "Failed to load records");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const loadByFolder = async (folder: string) => {
    if (!folder) return;
    setLoading(true);
    try {
      const res = await rdTrialBatchApi.getByProductFolder(folder);
      if (res.success) {
        setFolderTrials(res.data || []);
        setSelectedFolder(folder);
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load folder trials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadQcTests();
  }, []);

  const openTrialEditor = (record: RDTrialBatch) => {
    setSelectedRecord(record);
    setForm({
      productFolder: record.productFolder,
      trialBatchNo: record.trialBatchNo,
      productName: record.productName,
      trialDate: record.trialDate ? new Date(record.trialDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      observations: record.observations || "",
      nextSteps: record.nextSteps || "",
    });
    setFormulationRows(formulationRowsFromRecord(record));
    setTestingResultRows(testingResultRowsFromRecord(record, rndTestOptions));
    setExistingLogSheet(resolveLogSheet(record));
    setLogSheetFile(null);
    if (logSheetInputRef.current) logSheetInputRef.current.value = "";
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasLogSheet = Boolean(logSheetFile || existingLogSheet);
    if (!hasLogSheet) {
      setMessage("Log sheet attachment is required");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const formulationPayload = buildFormulationPayload(formulationRows);
      const testingResultPayload = buildTestingResultPayload(testingResultRows);
      const data = {
        productFolder: form.productFolder,
        trialBatchNo: form.trialBatchNo,
        productName: form.productName,
        trialDate: new Date(form.trialDate).toISOString(),
        observations: form.observations,
        ...(selectedRecord ? { nextSteps: form.nextSteps } : {}),
        parameters: formulationPayload,
        testResults: testingResultPayload,
        trendData: {},
        chartData: {},
        comparisonWithPrevious: {},
        costBreakdown: {},
        alternativeRMs: [],
      };

      let trialId = selectedRecord?._id;

      if (selectedRecord) {
        const res = await rdTrialBatchApi.update(selectedRecord._id, data);
        if (!res.success) {
          setMessage(res.message || "Failed to update");
          return;
        }
        trialId = selectedRecord._id;
      } else {
        const res = await rdTrialBatchApi.create(data);
        if (!res.success) {
          setMessage(res.message || "Failed to create");
          return;
        }
        trialId = res.data?._id;
        if (!trialId) throw new Error("Trial created but no record id returned");
      }

      if (logSheetFile && trialId) {
        await rdTrialBatchApi.uploadLogSheet(trialId, logSheetFile);
      }

      setMessage(selectedRecord ? "Record updated successfully" : "Record created successfully");
      setShowForm(false);
      setSelectedRecord(null);
      setForm({
        productFolder: "",
        trialBatchNo: "",
        productName: "",
        trialDate: new Date().toISOString().slice(0, 10),
        observations: "",
        nextSteps: "",
      });
      resetTrialSections(setFormulationRows, setTestingResultRows, setLogSheetFile, setExistingLogSheet, logSheetInputRef);
      load();
    } catch (e: any) {
      setMessage(e?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const productFolders = Array.from(new Set(records.map((r) => r.productFolder)));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">R&D Trial Batches</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">SRS 3.3.1 - Product Development (T0, T1, T2...)</p>
        </div>
        <button
          onClick={() => {
            setSelectedRecord(null);
            resetTrialSections(setFormulationRows, setTestingResultRows, setLogSheetFile, setExistingLogSheet, logSheetInputRef);
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          + New Trial
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {selectedRecord ? "Edit R&D Trial Batch" : "New R&D Trial Batch"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Folder * (SRS 3.3.1)</label>
                <input
                  type="text"
                  required
                  value={form.productFolder}
                  onChange={(e) => setForm({ ...form, productFolder: e.target.value })}
                  placeholder="e.g., grout, protective_paint, wall_putty"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Batch No * (T0, T1, T2...)</label>
                <input
                  type="text"
                  required
                  value={form.trialBatchNo}
                  onChange={(e) => setForm({ ...form, trialBatchNo: e.target.value })}
                  placeholder="T0, T1, T2..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Date</label>
                <input
                  type="date"
                  value={form.trialDate}
                  onChange={(e) => setForm({ ...form, trialDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observations</label>
              <textarea
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Formulation Section</h4>
                <button
                  type="button"
                  onClick={() => setFormulationRows((rows) => [...rows, newFormulationRow()])}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  + Add material
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 w-[55%]">Material</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 w-[30%]">Quantity (%)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200 w-[15%]"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                    {formulationRows.map((row, index) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.material}
                            onChange={(e) =>
                              setFormulationRows((rows) =>
                                rows.map((r) => (r.id === row.id ? { ...r, material: e.target.value } : r))
                              )
                            }
                            placeholder="e.g. Portland Cement"
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              value={row.quantity}
                              onChange={(e) =>
                                setFormulationRows((rows) =>
                                  rows.map((r) => (r.id === row.id ? { ...r, quantity: e.target.value } : r))
                                )
                              }
                              placeholder="0"
                              className="w-full px-2 py-1.5 pr-8 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={formulationRows.length <= 1}
                            onClick={() => setFormulationRows((rows) => rows.filter((r) => r.id !== row.id))}
                            className="px-2 py-1 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                            aria-label={`Remove material row ${index + 1}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50 dark:bg-emerald-900/20 border-t border-gray-200 dark:border-gray-600">
                    <tr>
                      <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">
                        Total materials: {formulationTotals.materialCount}
                      </td>
                      <td className="px-3 py-2 font-bold text-gray-900 dark:text-white" colSpan={2}>
                        Total quantity: {Number(formulationTotals.totalQuantity.toFixed(2))}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Testing Result Section</h4>
                <button
                  type="button"
                  onClick={() => setTestingResultRows((rows) => [...rows, newTestingResultRow()])}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
                >
                  + Add result
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 w-[45%]">Test</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 w-[40%]">Result</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200 w-[15%]"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                    {testingResultRows.map((row, index) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <select
                            required={Boolean(row.result.trim())}
                            value={row.test}
                            onChange={(e) =>
                              setTestingResultRows((rows) =>
                                rows.map((r) => (r.id === row.id ? { ...r, test: e.target.value } : r))
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select test...</option>
                            {row.test &&
                            !rndTestOptions.some(
                              (t) => t.code === row.test || t.name === row.test || `${t.code} — ${t.name}` === row.test
                            ) ? (
                              <option value={row.test}>{row.test}</option>
                            ) : null}
                            {rndTestOptions.map((t) => (
                              <option key={t._id} value={t.code}>
                                {t.code}
                                {t.name ? ` — ${t.name}` : ""}
                                {t.unit ? ` (${t.unit})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.result}
                            onChange={(e) =>
                              setTestingResultRows((rows) =>
                                rows.map((r) => (r.id === row.id ? { ...r, result: e.target.value } : r))
                              )
                            }
                            placeholder="e.g. 12.5 MPa"
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={testingResultRows.length <= 1}
                            onClick={() => setTestingResultRows((rows) => rows.filter((r) => r.id !== row.id))}
                            className="px-2 py-1 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                            aria-label={`Remove test result row ${index + 1}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-violet-50 dark:bg-violet-900/20 border-t border-gray-200 dark:border-gray-600">
                    <tr>
                      <td className="px-3 py-2 font-bold text-gray-900 dark:text-white" colSpan={3}>
                        Total tests recorded: {testingResultTotals.testCount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/20 p-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Log Sheet Attachment <span className="text-red-600">*</span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Upload the trial log sheet (PDF, Excel, or image). Required for every new trial.
                </p>
              </div>
              {existingLogSheet ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Current file:</span>
                  {logSheetAttachmentUrl(existingLogSheet.path) ? (
                    <a
                      href={logSheetAttachmentUrl(existingLogSheet.path)!}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      {existingLogSheet.originalName}
                    </a>
                  ) : (
                    <span className="font-semibold text-gray-900 dark:text-white">{existingLogSheet.originalName}</span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400">· choose a new file below to replace</span>
                </div>
              ) : null}
              <input
                ref={logSheetInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.webp,.csv"
                required={!existingLogSheet}
                onChange={(e) => setLogSheetFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
              />
              {logSheetFile ? (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Selected: <span className="font-semibold text-gray-900 dark:text-white">{logSheetFile.name}</span>
                </p>
              ) : null}
            </div>

            {selectedRecord ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Steps</label>
                <textarea
                  value={form.nextSteps}
                  onChange={(e) => setForm({ ...form, nextSteps: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            ) : null}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : selectedRecord ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedRecord(null);
                  resetTrialSections(setFormulationRows, setTestingResultRows, setLogSheetFile, setExistingLogSheet, logSheetInputRef);
                }}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Product Folders (SRS 3.3.1)</h3>
        <div className="flex flex-wrap gap-2">
          {productFolders.map((folder) => (
            <button
              key={folder}
              onClick={() => loadByFolder(folder)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                selectedFolder === folder
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {folder}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {selectedFolder ? `Trials in ${selectedFolder} folder` : "All R&D Trial Batches"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click a row to open the trial record</p>
        </div>
        {loading && !records.length ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (selectedFolder ? folderTrials : records).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Folder</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trial Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cost/Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Performance-Cost Ratio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(selectedFolder ? folderTrials : records).map((record) => (
                  <tr
                    key={record._id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => onQcDataRowClick(e, () => openTrialEditor(record))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openTrialEditor(record);
                      }
                    }}
                    className={qcDataRowClassName(selectedRecord?._id === record._id && showForm)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.productFolder}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.trialBatchNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.productName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {record.costPerUnit ? `${record.costPerUnit} ${record.costUnit}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.performanceCostRatio || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          record.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : record.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : record.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" data-no-row-click>
                      <button
                        onClick={() => openTrialEditor(record)}
                        className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

