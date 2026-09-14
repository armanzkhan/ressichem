"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { rawMaterialApi } from "@/lib/qcApi";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { onQcDataRowClick, qcDataRowClassName } from "@/lib/qcRowClick";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

type RawMaterial = {
  _id: string;
  materialCode: string;
  materialName: string;
  category: string;
  description?: string;
  unit?: string;
  supplier?: {
    supplierName?: string;
    supplierCode?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  isActive?: boolean;
};

type RawMaterialBatch = {
  _id: string;
  rawMaterial?: RawMaterial;
  batchNo: string;
  lotNo?: string;
  supplierBatchNo?: string;
  receiptDate?: string;
  quantity: number;
  unit?: string;
  status?: string;
  qcTested?: boolean;
  qcTestResult?: string;
  expiryDate?: string;
  remarks?: string;
  coa?: {
    documentUrl?: string;
    documentDate?: string;
    approved?: boolean;
    testResults?: Record<string, { testId?: string; code?: string; value?: unknown; unit?: string }>;
  };
};

type RmQCTest = {
  _id: string;
  code: string;
  name: string;
  unit?: string;
  applicableModules?: string[];
};

type QcResultValueRow = {
  test: { _id: string; code?: string } | string;
  value: unknown;
  unit?: string;
};

const FALLBACK_RM_TESTS: RmQCTest[] = [
  { _id: "moisture", code: "MOISTURE", name: "Moisture Content", unit: "%", applicableModules: ["RAW_MATERIAL"] },
  { _id: "fineness", code: "FINENESS", name: "Fineness", unit: "cm²/g", applicableModules: ["RAW_MATERIAL"] },
  { _id: "loi", code: "LOI", name: "Loss on Ignition", unit: "%", applicableModules: ["RAW_MATERIAL"] },
  { _id: "ph", code: "PH", name: "pH Value", unit: "", applicableModules: ["RAW_MATERIAL"] },
  { _id: "bulk", code: "BULK_DENSITY", name: "Bulk Density", unit: "kg/m³", applicableModules: ["RAW_MATERIAL"] },
  { _id: "purity", code: "PURITY", name: "Purity", unit: "%", applicableModules: ["RAW_MATERIAL"] },
];

function batchKey(batchNo: string | undefined | null): string {
  return String(batchNo || "").trim().toUpperCase();
}

function formatRmTestValue(
  batch: RawMaterialBatch,
  test: RmQCTest,
  qcValuesByBatch: Map<string, QcResultValueRow[]>
): string {
  const fromCoa = batch.coa?.testResults?.[test.code];
  if (fromCoa?.value !== undefined && fromCoa.value !== null && String(fromCoa.value).trim() !== "") {
    const unit = fromCoa.unit || test.unit || "";
    return `${fromCoa.value}${unit ? ` ${unit}` : ""}`;
  }

  const hits = qcValuesByBatch.get(batchKey(batch.batchNo)) || [];
  const hit = hits.find((v) => {
    const tid = typeof v.test === "object" && v.test !== null ? v.test._id : v.test;
    const code = typeof v.test === "object" && v.test !== null ? v.test.code : undefined;
    return String(tid) === String(test._id) || code === test.code;
  });
  if (hit && hit.value !== undefined && hit.value !== null && String(hit.value).trim() !== "") {
    const unit = hit.unit || test.unit || "";
    return `${hit.value}${unit ? ` ${unit}` : ""}`;
  }

  return "—";
}

const CATEGORY_OPTIONS = ["CEMENT", "SAND", "POLYMER", "ADDITIVE", "FILLER", "PIGMENT", "OTHER"];
const QC_RESULT_OPTIONS = ["PASS", "FAIL", "PENDING"];

const initialMaterialForm = {
  materialName: "",
  category: "",
  description: "",
  unit: "kg",
  supplierName: "",
  supplierCode: "",
  contactPhone: "",
  storageConditions: "",
  shelfLife: "",
  specificationsJson: "",
};

const initialBatchForm = {
  rawMaterial: "",
  batchNo: "",
  lotNo: "",
  supplierBatchNo: "",
  receiptDate: "",
  quantity: "",
  unit: "kg",
  purchaseOrderNo: "",
  invoiceNo: "",
  qcTested: false,
  qcTestResult: "PENDING",
  qcTestDate: "",
  quarantineReason: "",
  rejectionReason: "",
  remarks: "",
  coaApproved: false,
};

export default function RawMaterialQCPage() {
  const [activeTab, setActiveTab] = useState<"materials" | "batches">("materials");
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [batches, setBatches] = useState<RawMaterialBatch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [materialForm, setMaterialForm] = useState(initialMaterialForm);
  const [batchForm, setBatchForm] = useState(initialBatchForm);
  const [batchTestValues, setBatchTestValues] = useState<Record<string, string>>({});
  const [rmTests, setRmTests] = useState<RmQCTest[]>(FALLBACK_RM_TESTS);
  const [qcValuesByBatch, setQcValuesByBatch] = useState<Map<string, QcResultValueRow[]>>(new Map());
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedMaterialId(null);
    setExpandedBatchId(null);
  }, [activeTab]);

  const activeMaterials = useMemo(() => materials.filter((m) => m.isActive !== false), [materials]);

  const rmModuleTests = useMemo(() => {
    const seen = new Set<string>();
    return rmTests.filter((test) => {
      if (seen.has(test.code)) return false;
      seen.add(test.code);
      return true;
    });
  }, [rmTests]);

  const loadRmTests = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
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
      const tests = (data.data || []).filter((t: RmQCTest) =>
        (t.applicableModules || []).includes("RAW_MATERIAL")
      );
      tests.sort((a: RmQCTest, b: RmQCTest) => a.code.localeCompare(b.code));
      if (tests.length) setRmTests(tests);
    } catch {
      // keep fallback list
    }
  }, []);

  const loadQcResultValues = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const apiUrl = getBackendUrl();
      const companyId = localStorage.getItem("company_id") || "RESSICHEM";
      const qs = new URLSearchParams({ limit: "500", module: "RAW_MATERIAL", system: "QC_SITE_AREA" });
      const res = await fetch(`${apiUrl}/api/qc/results?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId,
        },
      });
      const data = await res.json();
      if (!res.ok) return;
      const map = new Map<string, QcResultValueRow[]>();
      for (const row of data.data || []) {
        if (row.batchNo) map.set(batchKey(row.batchNo), row.values || []);
      }
      setQcValuesByBatch(map);
    } catch {
      // optional merge from Results dashboard
    }
  }, []);

  useEffect(() => {
    loadRmTests();
    loadQcResultValues();
  }, [loadRmTests, loadQcResultValues]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setError("");
    setLoading(true);
    try {
      const matRes = await rawMaterialApi.getAll({ isActive: true });
      setMaterials(matRes.data || []);
      if (activeTab === "batches") {
        const batchRes = await rawMaterialApi.getBatches();
        setBatches(batchRes.data || []);
        await loadQcResultValues();
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let specs = {};
      if (materialForm.specificationsJson?.trim()) {
        try {
          specs = JSON.parse(materialForm.specificationsJson);
        } catch {
          throw new Error("Specifications must be valid JSON");
        }
      }

      const nameSlug = materialForm.materialName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 16);
      const materialCode = `RM-${materialForm.category.slice(0, 3)}-${nameSlug || Date.now().toString(36).toUpperCase()}`;

      await rawMaterialApi.create({
        materialCode,
        materialName: materialForm.materialName.trim(),
        category: materialForm.category,
        description: materialForm.description,
        unit: materialForm.unit,
        specifications: specs,
        supplier: {
          supplierName: materialForm.supplierName,
          supplierCode: materialForm.supplierCode,
          contactPhone: materialForm.contactPhone,
        },
        storageConditions: materialForm.storageConditions,
        shelfLife: materialForm.shelfLife ? Number(materialForm.shelfLife) : undefined,
      });

      setMaterialForm(initialMaterialForm);
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save material");
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const testResults: Record<string, { testId: string; code: string; value: string; unit?: string }> = {};
      for (const test of rmModuleTests) {
        const raw = batchTestValues[test._id] ?? batchTestValues[test.code];
        if (raw !== undefined && String(raw).trim() !== "") {
          testResults[test.code] = {
            testId: test._id,
            code: test.code,
            value: String(raw).trim(),
            unit: test.unit,
          };
        }
      }

      await rawMaterialApi.createBatch({
        rawMaterial: batchForm.rawMaterial,
        batchNo: batchForm.batchNo,
        lotNo: batchForm.lotNo,
        supplierBatchNo: batchForm.supplierBatchNo,
        receiptDate: batchForm.receiptDate || undefined,
        quantity: Number(batchForm.quantity),
        unit: batchForm.unit,
        purchaseOrderNo: batchForm.purchaseOrderNo,
        invoiceNo: batchForm.invoiceNo,
        status: "RECEIVED",
        qcTested: batchForm.qcTested || Object.keys(testResults).length > 0,
        qcTestResult: batchForm.qcTestResult,
        qcTestDate: batchForm.qcTestDate || undefined,
        quarantineReason: batchForm.quarantineReason,
        rejectionReason: batchForm.rejectionReason,
        remarks: batchForm.remarks,
        coa: {
          approved: batchForm.coaApproved,
          testResults,
        },
      });

      setBatchForm(initialBatchForm);
      setBatchTestValues({});
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const deactivateMaterial = async (id: string) => {
    try {
      await rawMaterialApi.delete(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate material");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Raw Material QC</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Material master data (Materials tab) · RM arrival QC tests (Batches tab) · same tests as Results dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowForm((p) => !p)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? "Cancel" : `Add ${activeTab === "materials" ? "Material" : "Batch"}`}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => {
            setActiveTab("materials");
            setShowForm(false);
          }}
          className={`px-4 py-2 ${activeTab === "materials" ? "border-b-2 border-blue-900 text-blue-900 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}
        >
          Materials
        </button>
            <button
              onClick={() => {
                setActiveTab("batches");
                setShowForm(false);
              }}
              className={`px-4 py-2 ${activeTab === "batches" ? "border-b-2 border-blue-900 text-blue-900 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}
            >
              Batches (QC tests)
            </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          {activeTab === "materials" ? (
            <>
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                This form registers the material master record only. To enter QC test values (moisture, fineness, etc.),
                switch to the <strong>Batches</strong> tab and add an arrival batch.
              </div>
            <form onSubmit={handleMaterialSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Material Name</label>
                <input
                  required
                  value={materialForm.materialName}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, materialName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Category</label>
                <select
                  required
                  value={materialForm.category}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                >
                  <option value="">Select...</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Quantity</label>
                <input
                  value={materialForm.unit}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <input
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Supplier Name</label>
                <input
                  value={materialForm.supplierName}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, supplierName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Supplier Code</label>
                <input
                  value={materialForm.supplierCode}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, supplierCode: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Contact Phone</label>
                <input
                  value={materialForm.contactPhone}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Shelf Life (days)</label>
                <input
                  type="number"
                  value={materialForm.shelfLife}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, shelfLife: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Storage Conditions</label>
                <input
                  value={materialForm.storageConditions}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, storageConditions: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Specifications (JSON)</label>
                <textarea
                  rows={3}
                  value={materialForm.specificationsJson}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, specificationsJson: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm font-mono"
                  placeholder='{"purity": "99%", "color": "white"}'
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Material"}
                </button>
              </div>
            </form>
            </>
          ) : (
            <form onSubmit={handleBatchSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Raw Material</label>
                <select
                  required
                  value={batchForm.rawMaterial}
                  onChange={(e) => setBatchForm((p) => ({ ...p, rawMaterial: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                >
                  <option value="">Select material...</option>
                  {activeMaterials.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.materialName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">P.O #</label>
                <input
                  required
                  value={batchForm.batchNo}
                  onChange={(e) => setBatchForm((p) => ({ ...p, batchNo: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Quantity</label>
                <input
                  type="number"
                  required
                  value={batchForm.quantity}
                  onChange={(e) => setBatchForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Unit</label>
                <input
                  value={batchForm.unit}
                  onChange={(e) => setBatchForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Receipt Date</label>
                <input
                  type="date"
                  value={batchForm.receiptDate}
                  onChange={(e) => setBatchForm((p) => ({ ...p, receiptDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">QC Tested</label>
                <select
                  value={batchForm.qcTested ? "yes" : "no"}
                  onChange={(e) => setBatchForm((p) => ({ ...p, qcTested: e.target.value === "yes" }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">QC Result</label>
                <select
                  value={batchForm.qcTestResult}
                  onChange={(e) => setBatchForm((p) => ({ ...p, qcTestResult: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                >
                  {QC_RESULT_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">QC Test Date</label>
                <input
                  type="date"
                  value={batchForm.qcTestDate}
                  onChange={(e) => setBatchForm((p) => ({ ...p, qcTestDate: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="coaApproved"
                  type="checkbox"
                  checked={batchForm.coaApproved}
                  onChange={(e) => setBatchForm((p) => ({ ...p, coaApproved: e.target.checked }))}
                />
                <label htmlFor="coaApproved" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  COA Approved
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Remarks</label>
                <input
                  value={batchForm.remarks}
                  onChange={(e) => setBatchForm((p) => ({ ...p, remarks: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  QC test values — RAW_MATERIAL module ({rmModuleTests.length} tests)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Same test definitions as the Results dashboard. Values are saved on the batch COA and synced to QC Results.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rmModuleTests.map((test) => (
                    <label key={test._id} className="text-sm block">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {test.code}
                        {test.unit ? ` (${test.unit})` : ""}
                      </span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1 line-clamp-1" title={test.name}>
                        {test.name}
                      </span>
                      <input
                        value={batchTestValues[test._id] ?? batchTestValues[test.code] ?? ""}
                        onChange={(e) =>
                          setBatchTestValues((p) => ({
                            ...p,
                            [test._id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white"
                        placeholder="Enter value"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Batch"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Click a row to expand details</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  {activeTab === "materials" ? (
                    <>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Supplier</th>
                      <th className="py-2 pr-2 text-center">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 pr-4">P.O #</th>
                      <th className="py-2 pr-4">Material</th>
                      <th className="py-2 pr-4">Quantity</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">QC</th>
                      <th className="py-2 pr-2">COA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === "materials" ? (
                  activeMaterials.map((m) => {
                    const expanded = expandedMaterialId === m._id;
                    return (
                      <React.Fragment key={m._id}>
                        <tr
                          role="button"
                          tabIndex={0}
                          onClick={(e) =>
                            onQcDataRowClick(e, () => setExpandedMaterialId(expanded ? null : m._id))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedMaterialId(expanded ? null : m._id);
                            }
                          }}
                          className={qcDataRowClassName(expanded, "border-t border-gray-200/60 dark:border-gray-700/60")}
                        >
                          <td className="py-3 pr-4 font-semibold">{m.materialName}</td>
                          <td className="py-3 pr-4">{m.category}</td>
                          <td className="py-3 pr-4">{m.supplier?.supplierName || "—"}</td>
                          <td className="py-3 pr-2 text-center" data-no-row-click>
                            <button
                              onClick={() => deactivateMaterial(m._id)}
                              className="p-2.5 rounded-xl bg-blue-900 text-white hover:bg-blue-800"
                              title="Deactivate material"
                              aria-label="Deactivate material"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="bg-gray-50/90 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                            <td colSpan={4} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <p>
                                  <span className="font-semibold">Quantity:</span> {m.unit || "kg"}
                                </p>
                                <p>
                                  <span className="font-semibold">Supplier code:</span> {m.supplier?.supplierCode || "—"}
                                </p>
                                <p className="sm:col-span-2">
                                  <span className="font-semibold">Description:</span> {m.description || "—"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                ) : (
                  batches.map((b) => {
                    const expanded = expandedBatchId === b._id;
                    return (
                      <React.Fragment key={b._id}>
                        <tr
                          role="button"
                          tabIndex={0}
                          onClick={(e) =>
                            onQcDataRowClick(e, () => setExpandedBatchId(expanded ? null : b._id))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedBatchId(expanded ? null : b._id);
                            }
                          }}
                          className={qcDataRowClassName(expanded, "border-t border-gray-200/60 dark:border-gray-700/60")}
                        >
                          <td className="py-3 pr-4 font-mono font-semibold">{b.batchNo}</td>
                          <td className="py-3 pr-4">{b.rawMaterial?.materialName || "—"}</td>
                          <td className="py-3 pr-4">
                            {b.quantity} {b.unit || "kg"}
                          </td>
                          <td className="py-3 pr-4">{b.status || "—"}</td>
                          <td className="py-3 pr-4">{b.qcTestResult || "PENDING"}</td>
                          <td className="py-3 pr-2" data-no-row-click>
                            {b.coa?.documentUrl ? (
                              <a href={b.coa.documentUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                                View
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                        {expanded ? (
                          <tr className="bg-gray-50/90 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                            <td colSpan={6} className="px-4 py-3">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                RM QC tests ({rmModuleTests.length})
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {rmModuleTests.map((test) => (
                                  <div
                                    key={`${b._id}-${test._id}`}
                                    className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5"
                                  >
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{test.code}</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {formatRmTestValue(b, test, qcValuesByBatch)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                )}
                {activeTab === "materials" && !activeMaterials.length && (
                  <tr>
                    <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={5}>
                      No materials yet.
                    </td>
                  </tr>
                )}
                {activeTab === "batches" && !batches.length && (
                  <tr>
                    <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={6}>
                      No batches yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
