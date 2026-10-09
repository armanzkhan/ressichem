"use client";

import { useState, useEffect, useMemo } from "react";
import { rawMaterialApi } from "@/lib/qcApi";
import Link from "next/link";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

/** Hub raw-material QC test fields (saved under batch.coa.testResults) */
const HUB_RM_TESTS = [
  { code: "VISCOSITY", name: "Viscosity", unit: "cP" },
  { code: "SIEVE_ANALYSIS", name: "Sieve Analysis", unit: "" },
  { code: "BULK_DENSITY", name: "Bulk Density", unit: "g/l" },
  { code: "SOLID_CONTENT", name: "Solid Content", unit: "%" },
  { code: "PH", name: "pH", unit: "" },
  { code: "INSOLUBLE_RESIDUE", name: "Insoluble Residue", unit: "%" },
  { code: "LOI", name: "LOI", unit: "%" },
  { code: "ASH_CONTENT", name: "Ash Content", unit: "%" },
] as const;

function formatTestValue(batch: any, code: string): string {
  const entry = batch?.coa?.testResults?.[code];
  if (!entry || entry.value === undefined || entry.value === null || String(entry.value).trim() === "") {
    return "—";
  }
  const unit = entry.unit || HUB_RM_TESTS.find((t) => t.code === code)?.unit || "";
  return `${entry.value}${unit ? ` ${unit}` : ""}`;
}

export default function RawMaterialsPage() {
  const canDelete = useQcHubFullAccess();
  const [materials, setMaterials] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"materials" | "batches">("materials");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [testValues, setTestValues] = useState<Record<string, string>>({});

  const listRows = useMemo(
    () => (activeTab === "materials" ? materials : batches),
    [activeTab, materials, batches]
  );
  const selection = useHubRowSelection(listRows);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      if (activeTab === "materials") {
        const res = await rawMaterialApi.getAll();
        setMaterials(res.data || []);
      } else {
        const [batchRes, materialRes] = await Promise.all([
          rawMaterialApi.getBatches(),
          rawMaterialApi.getAll(),
        ]);
        setBatches(batchRes.data || []);
        setMaterials(materialRes.data || []);
      }
      selection.clearSelection();
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const deleteOne = async (id: string, label?: string) => {
    const noun = activeTab === "materials" ? "material" : "batch";
    if (!window.confirm(`Delete ${noun} ${label || ""}?`.trim())) return;
    setDeleting(true);
    setError("");
    try {
      if (activeTab === "materials") await rawMaterialApi.delete(id);
      else await rawMaterialApi.deleteBatch(id);
      selection.clearSelection();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const bulkDelete = async () => {
    const ids = selection.selectedList;
    if (!ids.length) return;
    const noun = activeTab === "materials" ? "material(s)" : "batch(es)";
    if (!window.confirm(`Delete ${ids.length} selected ${noun}?`)) return;
    setDeleting(true);
    setError("");
    try {
      if (activeTab === "materials") await rawMaterialApi.bulkDelete(ids);
      else await rawMaterialApi.bulkDeleteBatches(ids);
      selection.clearSelection();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      if (activeTab === "materials") {
        await rawMaterialApi.create(formData);
      } else {
        const testResults: Record<string, { code: string; value: string; unit?: string }> = {};
        for (const test of HUB_RM_TESTS) {
          const raw = testValues[test.code];
          if (raw !== undefined && String(raw).trim() !== "") {
            testResults[test.code] = {
              code: test.code,
              value: String(raw).trim(),
              unit: test.unit || undefined,
            };
          }
        }

        await rawMaterialApi.createBatch({
          rawMaterial: formData.rawMaterial,
          batchNo: formData.batchNo,
          quantity: Number(formData.quantity),
          unit: formData.unit || "kg",
          status: formData.status || "RECEIVED",
          remarks: formData.remarks || "",
          qcTested: Object.keys(testResults).length > 0,
          qcTestResult: Object.keys(testResults).length > 0 ? "PASS" : "PENDING",
          coa: {
            testResults,
          },
        });
      }
      setShowForm(false);
      setFormData({});
      setTestValues({});
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Raw Materials Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Material master + incoming batches with QC testing results
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
            onClick={() => {
              setShowForm(!showForm);
              setFormData({});
              setTestValues({});
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? "Cancel" : `Add ${activeTab === "materials" ? "Material" : "Batch"}`}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => {
            setActiveTab("materials");
            setShowForm(false);
            selection.clearSelection();
          }}
          className={`px-4 py-2 ${activeTab === "materials" ? "border-b-2 border-blue-600 text-blue-600" : ""}`}
        >
          Materials
        </button>
        <button
          onClick={() => {
            setActiveTab("batches");
            setShowForm(false);
            selection.clearSelection();
          }}
          className={`px-4 py-2 ${activeTab === "batches" ? "border-b-2 border-blue-600 text-blue-600" : ""}`}
        >
          Batches
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-bold">Add {activeTab === "materials" ? "Material" : "Batch"}</h3>

          {activeTab === "materials" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Material Code</label>
                <input
                  type="text"
                  required
                  value={formData.materialCode || ""}
                  onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Material Name</label>
                <input
                  type="text"
                  required
                  value={formData.materialName || ""}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  required
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                >
                  <option value="">Select...</option>
                  <option value="CEMENT">Cement</option>
                  <option value="SAND">Sand</option>
                  <option value="POLYMER">Polymer</option>
                  <option value="ADDITIVE">Additive</option>
                  <option value="FILLER">Filler</option>
                  <option value="PIGMENT">Pigment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Raw Material</label>
                  <select
                    required
                    value={formData.rawMaterial || ""}
                    onChange={(e) => setFormData({ ...formData, rawMaterial: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                  >
                    <option value="">Select material...</option>
                    {materials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.materialCode} — {m.materialName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Batch No</label>
                  <input
                    type="text"
                    required
                    value={formData.batchNo || ""}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={formData.quantity || ""}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit</label>
                  <input
                    type="text"
                    value={formData.unit || "kg"}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">
                  Testing Results
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HUB_RM_TESTS.map((test) => (
                    <div key={test.code}>
                      <label className="block text-xs font-semibold mb-1">
                        {test.name}
                        {test.unit ? ` (${test.unit})` : ""}
                      </label>
                      <input
                        type={test.code === "SIEVE_ANALYSIS" ? "text" : "number"}
                        step="any"
                        value={testValues[test.code] || ""}
                        onChange={(e) =>
                          setTestValues({ ...testValues, [test.code]: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-900"
                        placeholder={test.code === "SIEVE_ANALYSIS" ? "e.g. Pass / % retained" : ""}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Remarks</label>
                <textarea
                  value={formData.remarks || ""}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({});
                setTestValues({});
              }}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {canDelete && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selection.allSelected}
                    onChange={selection.toggleAll}
                    disabled={!listRows.length || deleting}
                    aria-label="Select all"
                  />
                </th>
              )}
              {activeTab === "materials" ? (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viscosity</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sieve</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bulk Dens.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solid %</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">pH</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Insol.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">LOI</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ash</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {canDelete && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeTab === "materials" ? (
              materials.map((material: any) => (
                <tr key={material._id}>
                  {canDelete && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selection.selectedIds.has(material._id)}
                        onChange={() => selection.toggleOne(material._id)}
                        disabled={deleting}
                        aria-label={`Select ${material.materialCode}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">{material.materialCode}</td>
                  <td className="px-4 py-3">{material.materialName}</td>
                  <td className="px-4 py-3">{material.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/qc/hub/raw-materials/${material._id}`} className="text-blue-600 hover:underline">
                        View
                      </Link>
                      {canDelete && (
                        <HubRowDeleteButton
                          disabled={deleting}
                          onDelete={() => deleteOne(material._id, material.materialCode)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              batches.map((batch: any) => (
                <tr key={batch._id}>
                  {canDelete && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selection.selectedIds.has(batch._id)}
                        onChange={() => selection.toggleOne(batch._id)}
                        disabled={deleting}
                        aria-label={`Select ${batch.batchNo}`}
                      />
                    </td>
                  )}
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">{batch.batchNo}</td>
                  <td className="px-3 py-3 text-sm">{batch.rawMaterial?.materialName || "N/A"}</td>
                  <td className="px-3 py-3 text-sm">
                    {batch.quantity} {batch.unit}
                  </td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "VISCOSITY")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "SIEVE_ANALYSIS")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "BULK_DENSITY")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "SOLID_CONTENT")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "PH")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "INSOLUBLE_RESIDUE")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "LOI")}</td>
                  <td className="px-3 py-3 text-sm">{formatTestValue(batch, "ASH_CONTENT")}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        batch.status === "IN_STOCK"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  {canDelete && (
                    <td className="px-3 py-3">
                      <HubRowDeleteButton
                        disabled={deleting}
                        onDelete={() => deleteOne(batch._id, batch.batchNo)}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {activeTab === "materials" && materials.length === 0 && (
          <div className="text-center py-8 text-gray-500">No materials found</div>
        )}
        {activeTab === "batches" && batches.length === 0 && (
          <div className="text-center py-8 text-gray-500">No batches found</div>
        )}
      </div>
    </div>
  );
}
