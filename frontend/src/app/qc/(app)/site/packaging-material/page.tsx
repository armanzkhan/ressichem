"use client";

import React, { useEffect, useState } from "react";
import { packagingMaterialQCApi } from "@/lib/qcSiteApi";

type PackagingMaterialQC = {
  _id: string;
  materialType: string;
  materialName: string;
  batchNo: string;
  testDate: string;
  supplier: string;
  coaLink: string;
  coaNumber: string;
  status: "pending" | "approved" | "rejected" | "conditional";
  acceptanceNotes: string;
  rejectionNotes: string;
  remarks: string;
};

export default function PackagingMaterialQCPage() {
  const [records, setRecords] = useState<PackagingMaterialQC[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PackagingMaterialQC | null>(null);

  const [form, setForm] = useState({
    materialType: "",
    materialName: "",
    batchNo: "",
    testDate: new Date().toISOString().slice(0, 10),
    supplier: "",
    supplierContact: "",
    supplierAddress: "",
    coaLink: "",
    coaNumber: "",
    coaDate: "",
    inspectionResults: "",
    testParameters: "",
    acceptanceNotes: "",
    rejectionNotes: "",
    remarks: "",
  });

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await packagingMaterialQCApi.getAll({ page: 1, limit: 100 });
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

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = {
        ...form,
        coaDate: form.coaDate ? new Date(form.coaDate).toISOString() : undefined,
        inspectionResults: form.inspectionResults ? JSON.parse(form.inspectionResults) : {},
        testParameters: form.testParameters ? JSON.parse(form.testParameters) : {},
      };

      if (selectedRecord) {
        const res = await packagingMaterialQCApi.update(selectedRecord._id, data);
        if (res.success) {
          setMessage("Record updated successfully");
          setShowForm(false);
          setSelectedRecord(null);
          load();
        } else {
          setMessage(res.message || "Failed to update");
        }
      } else {
        const res = await packagingMaterialQCApi.create(data);
        if (res.success) {
          setMessage("Record created successfully");
          setShowForm(false);
          setForm({
            materialType: "",
            materialName: "",
            batchNo: "",
            testDate: new Date().toISOString().slice(0, 10),
            supplier: "",
            supplierContact: "",
            supplierAddress: "",
            coaLink: "",
            coaNumber: "",
            coaDate: "",
            inspectionResults: "",
            testParameters: "",
            acceptanceNotes: "",
            rejectionNotes: "",
            remarks: "",
          });
          load();
        } else {
          setMessage(res.message || "Failed to create");
        }
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const notes = prompt("Acceptance notes:");
    if (notes === null) return;
    setLoading(true);
    try {
      const res = await packagingMaterialQCApi.approve(id, notes);
      if (res.success) {
        setMessage("Record approved successfully");
        load();
      } else {
        setMessage(res.message || "Failed to approve");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const notes = prompt("Rejection notes:");
    if (notes === null) return;
    setLoading(true);
    try {
      const res = await packagingMaterialQCApi.reject(id, notes);
      if (res.success) {
        setMessage("Record rejected");
        load();
      } else {
        setMessage(res.message || "Failed to reject");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Packaging Material QC Module</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">SRS 3.1.5 - Packaging material inspection/testing</p>
        </div>
        <button
          onClick={() => {
            setSelectedRecord(null);
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          + New Record
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
            {selectedRecord ? "Edit Packaging Material QC Record" : "New Packaging Material QC Record"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material Type *</label>
                <input
                  type="text"
                  required
                  value={form.materialType}
                  onChange={(e) => setForm({ ...form, materialType: e.target.value })}
                  placeholder="e.g., Bottle, Carton, Label"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={form.materialName}
                  onChange={(e) => setForm({ ...form, materialName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch No *</label>
                <input
                  type="text"
                  required
                  value={form.batchNo}
                  onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier *</label>
                <input
                  type="text"
                  required
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Contact</label>
                <input
                  type="text"
                  value={form.supplierContact}
                  onChange={(e) => setForm({ ...form, supplierContact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">COA Number</label>
                <input
                  type="text"
                  value={form.coaNumber}
                  onChange={(e) => setForm({ ...form, coaNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">COA Link</label>
                <input
                  type="text"
                  value={form.coaLink}
                  onChange={(e) => setForm({ ...form, coaLink: e.target.value })}
                  placeholder="URL to COA document"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Date</label>
                <input
                  type="date"
                  value={form.testDate}
                  onChange={(e) => setForm({ ...form, testDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
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
                }}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Packaging Material QC Records</h3>
        </div>
        {loading && !records.length ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Material Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Material Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Batch No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">COA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.materialType}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.materialName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.batchNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.supplier}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.coaNumber || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          record.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : record.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {record.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(record._id)}
                              className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(record._id)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
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

