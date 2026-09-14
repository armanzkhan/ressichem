"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { lmsQCApi } from "@/lib/qcSiteApi";

type LMSQC = {
  _id: string;
  productType: "LMS_EPOXY_HARDENER" | "LMS_EPOXY_RESIN" | "LMS_EPOXY_FLOORING";
  batchNo: string;
  productName: string;
  grade: string;
  testDate: string;
  physicalTests: any;
  chemicalTests: any;
  color: string;
  transparency: string;
  viscosity: number;
  viscosityUnit?: string;
  gelTime: number;
  gelTimeUnit?: string;
  testResults: any;
  remarks: string;
  rejectionReason?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
};

export default function LMSQCPage() {
  const [records, setRecords] = useState<LMSQC[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LMSQC | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [detailRecord, setDetailRecord] = useState<LMSQC | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    productType: "",
    batchNo: "",
    productName: "",
    grade: "",
    status: "",
    from: "",
    to: "",
    search: "",
  });
  const [draftFilters, setDraftFilters] = useState({
    productType: "",
    batchNo: "",
    productName: "",
    grade: "",
    status: "",
    from: "",
    to: "",
    search: "",
  });
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({
    key: "testDate",
    dir: "desc",
  });

  const [form, setForm] = useState({
    productType: "LMS_EPOXY_HARDENER" as "LMS_EPOXY_HARDENER" | "LMS_EPOXY_RESIN" | "LMS_EPOXY_FLOORING",
    batchNo: "",
    productName: "",
    grade: "",
    testDate: new Date().toISOString().slice(0, 10),
    color: "",
    transparency: "",
    viscosity: "",
    gelTime: "",
    remarks: "",
  });

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await lmsQCApi.getAll({
        productType: filters.productType || undefined,
        batchNo: filters.batchNo || undefined,
        productName: filters.productName || undefined,
        grade: filters.grade || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit,
      });
      if (res.success) {
        setRecords(res.data || []);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total || 0,
            totalPages: res.pagination.totalPages || 1,
          });
        }
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
  }, [page, limit, filters.productType, filters.batchNo, filters.productName, filters.grade, filters.status, filters.from, filters.to]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
  };
  const resetFilters = () => {
    const empty = { productType: "", batchNo: "", productName: "", grade: "", status: "", from: "", to: "", search: "" };
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
  };
  const changeSort = (key: string) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  };

  const visibleRecords = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    let rows = [...records];
    if (term) {
      rows = rows.filter((r) => {
        return (
          r.batchNo?.toLowerCase().includes(term) ||
          r.productName?.toLowerCase().includes(term) ||
          r.grade?.toLowerCase().includes(term)
        );
      });
    }
    rows.sort((a: any, b: any) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.dir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sort.dir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return rows;
  }, [records, filters.search, sort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = {
        ...form,
        viscosity: form.viscosity ? Number(form.viscosity) : undefined,
        gelTime: form.gelTime ? Number(form.gelTime) : undefined,
        physicalTests: {},
        chemicalTests: {},
        testResults: {},
      };

      if (selectedRecord) {
        const res = await lmsQCApi.update(selectedRecord._id, data);
        if (res.success) {
          setMessage("Record updated successfully");
          setShowForm(false);
          setSelectedRecord(null);
          load();
        } else {
          setMessage(res.message || "Failed to update");
        }
      } else {
        const res = await lmsQCApi.create(data);
        if (res.success) {
          setMessage("Record created successfully");
          setShowForm(false);
          setForm({
            productType: "LMS_EPOXY_HARDENER",
            batchNo: "",
            productName: "",
            grade: "",
            testDate: new Date().toISOString().slice(0, 10),
            color: "",
            transparency: "",
            viscosity: "",
            gelTime: "",
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

  const handleSubmitForApproval = async (id: string) => {
    if (!confirm("Submit this record for approval?")) return;
    setLoading(true);
    try {
      const res = await lmsQCApi.submit(id);
      if (res.success) {
        setMessage("Record submitted successfully");
        load();
      } else {
        setMessage(res.message || "Failed to submit");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this record?")) return;
    setLoading(true);
    try {
      const res = await lmsQCApi.approve(id);
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
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setLoading(true);
    try {
      const res = await lmsQCApi.reject(id, reason);
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

  const loadTrends = async () => {
    setLoading(true);
    try {
      const res = await lmsQCApi.getTrends({
        productType: filters.productType || undefined,
        productName: filters.productName || undefined,
        grade: filters.grade || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      if (res.success) {
        setTrends(res.data);
        setShowTrends(true);
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load trends");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await lmsQCApi.remove(id);
      if (res.success) {
        setMessage("Record deleted");
        load();
      } else {
        setMessage(res.message || "Failed to delete");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case "LMS_EPOXY_HARDENER":
        return "LMS Epoxy Hardener";
      case "LMS_EPOXY_RESIN":
        return "LMS Epoxy Resin";
      case "LMS_EPOXY_FLOORING":
        return "LMS Epoxy Flooring";
      default:
        return type;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">LMS Department QC Module</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">SRS 3.1.3 - LMS Epoxy hardener, resin, and flooring QC records</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadTrends}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            View Trends
          </button>
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
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={draftFilters.productType}
            onChange={(e) => setDraftFilters((p) => ({ ...p, productType: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
          >
            <option value="">Product Type</option>
            <option value="LMS_EPOXY_HARDENER">LMS Epoxy Hardener</option>
            <option value="LMS_EPOXY_RESIN">LMS Epoxy Resin</option>
            <option value="LMS_EPOXY_FLOORING">LMS Epoxy Flooring</option>
          </select>
          <input
            value={draftFilters.batchNo}
            onChange={(e) => setDraftFilters((p) => ({ ...p, batchNo: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Batch No"
          />
          <input
            value={draftFilters.productName}
            onChange={(e) => setDraftFilters((p) => ({ ...p, productName: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Product Name"
          />
          <input
            value={draftFilters.grade}
            onChange={(e) => setDraftFilters((p) => ({ ...p, grade: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Grade"
          />
          <select
            value={draftFilters.status}
            onChange={(e) => setDraftFilters((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
          >
            <option value="">Status</option>
            <option value="draft">draft</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <input
            type="date"
            value={draftFilters.from}
            onChange={(e) => setDraftFilters((p) => ({ ...p, from: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={draftFilters.to}
            onChange={(e) => setDraftFilters((p) => ({ ...p, to: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={draftFilters.search}
            onChange={(e) => setDraftFilters((p) => ({ ...p, search: e.target.value }))}
            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs"
            placeholder="Search (current page)"
          />
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Reset
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-2 py-1.5 text-xs"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {selectedRecord ? "Edit LMS QC Record" : "New LMS QC Record"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type *</label>
                <select
                  required
                  value={form.productType}
                  onChange={(e) => setForm({ ...form, productType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="LMS_EPOXY_HARDENER">LMS Epoxy Hardener</option>
                  <option value="LMS_EPOXY_RESIN">LMS Epoxy Resin</option>
                  <option value="LMS_EPOXY_FLOORING">LMS Epoxy Flooring</option>
                </select>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                <input
                  type="text"
                  required
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transparency</label>
                <input
                  type="text"
                  value={form.transparency}
                  onChange={(e) => setForm({ ...form, transparency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Viscosity (cP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.viscosity}
                  onChange={(e) => setForm({ ...form, viscosity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gel Time (min)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.gelTime}
                  onChange={(e) => setForm({ ...form, gelTime: e.target.value })}
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

      {showTrends && trends && (
        <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trend Graphs (SRS 3.1.3)</h3>
            <button
              onClick={() => setShowTrends(false)}
              className="px-3 py-1 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { key: "viscosity", label: "Viscosity (cP)", color: "#2563eb" },
              { key: "gelTime", label: "Gel Time (min)", color: "#f59e0b" },
            ].map((chart) => (
              <div key={chart.key} className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{chart.label}</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={(trends[chart.key] || []).map((r: any) => ({
                      date: r.date ? new Date(r.date).toLocaleDateString() : "NA",
                      value: r.value ?? 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">LMS QC Records</h3>
          <div className="text-xs text-gray-500">
            Page {page} of {pagination.totalPages} • Total {pagination.total}
          </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => changeSort("productType")}>Product Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => changeSort("batchNo")}>Batch No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => changeSort("productName")}>Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => changeSort("viscosity")}>Viscosity (cP)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => changeSort("gelTime")}>Gel Time (min)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => changeSort("status")}>Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{getProductTypeLabel(record.productType)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.batchNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.productName} {record.grade}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.viscosity ?? "-"}{record.viscosityUnit ? ` ${record.viscosityUnit}` : ""}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.gelTime ?? "-"}{record.gelTimeUnit ? ` ${record.gelTimeUnit}` : ""}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          record.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : record.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : record.status === "submitted"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDetailRecord(record)}
                          className="px-2 py-1 rounded bg-slate-600 text-white text-xs hover:bg-slate-700"
                        >
                          View
                        </button>
                        {record.status === "draft" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRecord(record);
                                setForm({
                                  productType: record.productType,
                                  batchNo: record.batchNo,
                                  productName: record.productName || "",
                                  grade: record.grade || "",
                                  testDate: record.testDate ? new Date(record.testDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                                  color: record.color || "",
                                  transparency: record.transparency || "",
                                  viscosity: record.viscosity?.toString() || "",
                                  gelTime: record.gelTime?.toString() || "",
                                  remarks: record.remarks || "",
                                });
                                setShowForm(true);
                              }}
                              className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSubmitForApproval(record._id)}
                              className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => handleDelete(record._id)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {record.status === "rejected" && (
                          <button
                            onClick={() => handleDelete(record._id)}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                        {record.status === "submitted" && (
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <div className="text-xs text-gray-500">
            Page {page} of {pagination.totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-2 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-white/30 dark:border-gray-700/50">
            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 px-5 py-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">LMS QC Details</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{detailRecord.batchNo}</p>
              </div>
              <button
                onClick={() => setDetailRecord(null)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-200">
              <div><span className="font-semibold">Product Type:</span> {getProductTypeLabel(detailRecord.productType)}</div>
              <div><span className="font-semibold">Product:</span> {detailRecord.productName} {detailRecord.grade}</div>
              <div><span className="font-semibold">Test Date:</span> {detailRecord.testDate ? new Date(detailRecord.testDate).toLocaleDateString() : "-"}</div>
              <div><span className="font-semibold">Color:</span> {detailRecord.color || "-"}</div>
              <div><span className="font-semibold">Transparency:</span> {detailRecord.transparency || "-"}</div>
              <div><span className="font-semibold">Viscosity:</span> {detailRecord.viscosity ?? "-"} {detailRecord.viscosityUnit || ""}</div>
              <div><span className="font-semibold">Gel Time:</span> {detailRecord.gelTime ?? "-"} {detailRecord.gelTimeUnit || ""}</div>
              <div className="md:col-span-2"><span className="font-semibold">Remarks:</span> {detailRecord.remarks || "-"}</div>
              {detailRecord.rejectionReason && (
                <div className="md:col-span-2 text-red-600"><span className="font-semibold">Rejection Reason:</span> {detailRecord.rejectionReason}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

