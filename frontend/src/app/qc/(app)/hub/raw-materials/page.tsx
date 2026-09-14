"use client";

import { useState, useEffect } from "react";
import { rawMaterialApi } from "@/lib/qcApi";
import Link from "next/link";

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"materials" | "batches">("materials");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "materials") {
        const res = await rawMaterialApi.getAll();
        setMaterials(res.data || []);
      } else {
        const res = await rawMaterialApi.getBatches();
        setBatches(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === "materials") {
        await rawMaterialApi.create(formData);
      } else {
        await rawMaterialApi.createBatch(formData);
      }
      setShowForm(false);
      setFormData({});
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Raw Materials Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          {showForm ? "Cancel" : `Add ${activeTab === "materials" ? "Material" : "Batch"}`}
        </button>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => { setActiveTab("materials"); setShowForm(false); }}
          className={`px-4 py-2 ${activeTab === "materials" ? "border-b-2 border-emerald-600 text-emerald-600" : ""}`}
        >
          Materials
        </button>
        <button
          onClick={() => { setActiveTab("batches"); setShowForm(false); }}
          className={`px-4 py-2 ${activeTab === "batches" ? "border-b-2 border-emerald-600 text-emerald-600" : ""}`}
        >
          Batches
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Add {activeTab === "materials" ? "Material" : "Batch"}</h3>
          {activeTab === "materials" ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Material Code</label>
                <input
                  type="text"
                  required
                  value={formData.materialCode || ""}
                  onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Material Name</label>
                <input
                  type="text"
                  required
                  value={formData.materialName || ""}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  required
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
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
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Raw Material ID</label>
                <input
                  type="text"
                  required
                  value={formData.rawMaterial || ""}
                  onChange={(e) => setFormData({ ...formData, rawMaterial: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Batch No</label>
                <input
                  type="text"
                  required
                  value={formData.batchNo || ""}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  required
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              Save
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormData({}); }} className="px-4 py-2 bg-gray-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {activeTab === "materials" ? (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeTab === "materials" ? (
              materials.map((material: any) => (
                <tr key={material._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{material.materialCode}</td>
                  <td className="px-6 py-4">{material.materialName}</td>
                  <td className="px-6 py-4">{material.category}</td>
                  <td className="px-6 py-4">
                    <Link href={`/qc/hub/raw-materials/${material._id}`} className="text-emerald-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              batches.map((batch: any) => (
                <tr key={batch._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{batch.batchNo}</td>
                  <td className="px-6 py-4">{batch.rawMaterial?.materialName || "N/A"}</td>
                  <td className="px-6 py-4">{batch.quantity} {batch.unit}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${batch.status === "IN_STOCK" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/qc/hub/raw-materials/batches/${batch._id}`} className="text-emerald-600 hover:underline">
                      View
                    </Link>
                  </td>
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

