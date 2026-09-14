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
import { resinQCApi } from "@/lib/qcSiteApi";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { useQcResultPermissions } from "@/lib/useQcResultPermissions";
import { onQcDataRowClick, qcDataRowClassName } from "@/lib/qcRowClick";

type ResinQC = {
  _id: string;
  batchNo: string;
  productName: string;
  grade: string;
  testDate: string;
  color: string;
  transparency: string;
  eew: number;
  gelTime: number;
  gelTimeUnit?: string;
  viscosity: number;
  viscosityUnit?: string;
  mixViscosity: number;
  mixViscosityUnit?: string;
  exothermicTemperature: number;
  exothermicTemperatureUnit?: string;
  hycl: number;
  hyclUnit?: string;
  solidContent: number;
  solidContentUnit?: string;
  remarks: string;
  rejectionReason?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
};

type ResinQCTest = {
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

/** Maps QCTest codes to ResinQC document fields (SRS 3.1.1). */
const RESIN_TEST_FIELD_MAP: Record<string, keyof ResinQC> = {
  EEW: "eew",
  VISCOSITY: "viscosity",
  VISCOSITY_25C: "viscosity",
  GEL_TIME: "gelTime",
  MIX_VISCOSITY: "mixViscosity",
  HYCL: "hycl",
  SOLIDS: "solidContent",
  COLOR: "color",
  TRANSPARENCY: "transparency",
  EXO: "exothermicTemperature",
};

const RESIN_FIELD_UNIT_KEY: Partial<Record<keyof ResinQC, keyof ResinQC>> = {
  gelTime: "gelTimeUnit",
  viscosity: "viscosityUnit",
  mixViscosity: "mixViscosityUnit",
  exothermicTemperature: "exothermicTemperatureUnit",
  hycl: "hyclUnit",
  solidContent: "solidContentUnit",
};

function batchKey(batchNo: string | undefined | null): string {
  return String(batchNo || "").trim().toUpperCase();
}

function formatResinTestValue(
  record: ResinQC,
  test: ResinQCTest,
  qcValuesByBatch: Map<string, QcResultValueRow[]>
): string {
  const field = RESIN_TEST_FIELD_MAP[test.code];
  if (field) {
    const val = record[field];
    if (val !== undefined && val !== null && val !== "") {
      if (typeof val === "number") {
        const unitKey = RESIN_FIELD_UNIT_KEY[field];
        const unit = (unitKey && record[unitKey]) || test.unit || "";
        return `${val}${unit ? ` ${unit}` : ""}`;
      }
      return String(val);
    }
  }

  const batchValues = qcValuesByBatch.get(batchKey(record.batchNo)) || [];
  const hit = batchValues.find((v) => {
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

function resinTestSortKey(test: ResinQCTest): string {
  return RESIN_TEST_FIELD_MAP[test.code] || test.code.toLowerCase();
}

const FALLBACK_RESIN_TESTS: ResinQCTest[] = [
  { _id: "eew", code: "EEW", name: "Epoxy Equivalent Weight (EEW)", unit: "g/eq", applicableModules: ["RESIN"] },
  { _id: "viscosity", code: "VISCOSITY", name: "Viscosity at 25C", unit: "cP", applicableModules: ["RESIN"] },
  { _id: "gel", code: "GEL_TIME", name: "Gel Time", unit: "min", applicableModules: ["RESIN"] },
  { _id: "mix", code: "MIX_VISCOSITY", name: "Mix Viscosity", unit: "cP", applicableModules: ["RESIN"] },
  { _id: "exo", code: "EXO", name: "Exothermic Temperature", unit: "°C", applicableModules: ["RESIN"] },
  { _id: "hycl", code: "HYCL", name: "Hydrolyzable Chloride Content", unit: "ppm", applicableModules: ["RESIN"] },
  { _id: "solids", code: "SOLIDS", name: "Solid Content", unit: "%", applicableModules: ["RESIN"] },
  { _id: "color", code: "COLOR", name: "Color", unit: "Visual", applicableModules: ["RESIN"] },
  { _id: "transparency", code: "TRANSPARENCY", name: "Transparency", unit: "Visual", applicableModules: ["RESIN"] },
];

export default function ResinQCPage() {
  const { canSubmit, canApprove } = useQcResultPermissions();
  const [records, setRecords] = useState<ResinQC[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ResinQC | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ResinQC | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    batchNo: "",
    productName: "",
    grade: "",
    status: "",
    from: "",
    to: "",
    search: "",
  });
  const [draftFilters, setDraftFilters] = useState({
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
  const [resinTests, setResinTests] = useState<ResinQCTest[]>(FALLBACK_RESIN_TESTS);
  const [qcValuesByBatch, setQcValuesByBatch] = useState<Map<string, QcResultValueRow[]>>(new Map());

  /** All active tests for RESIN module — same list as Results dashboard. */
  const resinModuleTests = useMemo(() => {
    const seenCodes = new Set<string>();
    return resinTests.filter((test) => {
      if (seenCodes.has(test.code)) return false;
      seenCodes.add(test.code);
      return true;
    });
  }, [resinTests]);

  const SUMMARY_TEST_CODES = ["EEW", "VISCOSITY", "VISCOSITY_25C", "GEL_TIME"];

  const summaryTests = useMemo(() => {
    const picked: ResinQCTest[] = [];
    const usedFields = new Set<string>();
    for (const code of SUMMARY_TEST_CODES) {
      const test = resinModuleTests.find((t) => t.code === code);
      if (!test) continue;
      const field = RESIN_TEST_FIELD_MAP[test.code];
      if (field && usedFields.has(field)) continue;
      if (field) usedFields.add(field);
      picked.push(test);
      if (picked.length >= 3) break;
    }
    return picked;
  }, [resinModuleTests]);

  const loadResinTests = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const apiUrl = getBackendUrl();
      const companyId = localStorage.getItem("company_id") || "RESSICHEM";
      const res = await fetch(`${apiUrl}/api/qc/tests?active=true`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId,
        },
      });
      const data = await res.json();
      if (!res.ok) return;
      const tests = (data.data || []).filter((t: ResinQCTest) =>
        (t.applicableModules || []).includes("RESIN")
      );
      tests.sort((a: ResinQCTest, b: ResinQCTest) => a.code.localeCompare(b.code));
      if (tests.length) setResinTests(tests);
    } catch {
      // keep fallback columns
    }
  };

  const loadQcResultValues = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const apiUrl = getBackendUrl();
      const companyId = localStorage.getItem("company_id") || "RESSICHEM";
      const qs = new URLSearchParams({ limit: "500", module: "RESIN", system: "QC_SITE_AREA" });
      const res = await fetch(`${apiUrl}/api/qc/results?${qs}`, {
        cache: "no-store",
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
      // optional merge from Results dashboard data
    }
  };

  const [form, setForm] = useState({
    batchNo: "",
    productName: "",
    grade: "",
    testDate: new Date().toISOString().slice(0, 10),
    color: "",
    transparency: "",
    eew: "",
    gelTime: "",
    viscosity: "",
    mixViscosity: "",
    exothermicTemperature: "",
    hycl: "",
    solidContent: "",
    remarks: "",
  });

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await resinQCApi.getAll({
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
        void loadQcResultValues();
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
  }, [page, limit, filters.batchNo, filters.productName, filters.grade, filters.status, filters.from, filters.to]);

  useEffect(() => {
    loadResinTests();
    loadQcResultValues();
  }, []);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
  };
  const resetFilters = () => {
    const empty = { batchNo: "", productName: "", grade: "", status: "", from: "", to: "", search: "" };
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

  const changeTestSort = (test: ResinQCTest) => {
    changeSort(resinTestSortKey(test));
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
      if (aVal === undefined || bVal === undefined) {
        const aStr = aVal === undefined || aVal === null ? "" : String(aVal);
        const bStr = bVal === undefined || bVal === null ? "" : String(bVal);
        return sort.dir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      }
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
        eew: form.eew ? Number(form.eew) : undefined,
        gelTime: form.gelTime ? Number(form.gelTime) : undefined,
        viscosity: form.viscosity ? Number(form.viscosity) : undefined,
        mixViscosity: form.mixViscosity ? Number(form.mixViscosity) : undefined,
        exothermicTemperature: form.exothermicTemperature ? Number(form.exothermicTemperature) : undefined,
        hycl: form.hycl ? Number(form.hycl) : undefined,
        solidContent: form.solidContent ? Number(form.solidContent) : undefined,
      };

      if (selectedRecord) {
        const res = await resinQCApi.update(selectedRecord._id, data);
        if (res.success) {
          setMessage("Record updated successfully");
          setShowForm(false);
          setSelectedRecord(null);
          load();
        } else {
          setMessage(res.message || "Failed to update");
        }
      } else {
        const res = await resinQCApi.create(data);
        if (res.success) {
          setMessage("Record created successfully");
          setShowForm(false);
          setForm({
            batchNo: "",
            productName: "",
            grade: "",
            testDate: new Date().toISOString().slice(0, 10),
            color: "",
            transparency: "",
            eew: "",
            gelTime: "",
            viscosity: "",
            mixViscosity: "",
            exothermicTemperature: "",
            hycl: "",
            solidContent: "",
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
      const res = await resinQCApi.submit(id);
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
      const res = await resinQCApi.approve(id);
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
      const res = await resinQCApi.reject(id, reason);
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
      const res = await resinQCApi.getTrends({
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
      const res = await resinQCApi.remove(id);
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resin QC Module</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            SRS 3.1.1 — Epoxy resin QC records (key tests in table; full details on View)
          </p>
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
            {selectedRecord ? "Edit Resin QC Record" : "New Resin QC Record"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EEW (Epoxy Equivalent Weight)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.eew}
                  onChange={(e) => setForm({ ...form, eew: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mix Viscosity (cP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.mixViscosity}
                  onChange={(e) => setForm({ ...form, mixViscosity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exothermic Temperature (°C)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.exothermicTemperature}
                  onChange={(e) => setForm({ ...form, exothermicTemperature: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HyCl (ppm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.hycl}
                  onChange={(e) => setForm({ ...form, hycl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solid Content (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.solidContent}
                  onChange={(e) => setForm({ ...form, solidContent: e.target.value })}
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trend Graphs (SRS 3.1.1)</h3>
            <button
              onClick={() => setShowTrends(false)}
              className="px-3 py-1 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { key: "eew", label: "EEW (g/eq)", color: "#2563eb" },
              { key: "viscosity", label: "Viscosity (cP)", color: "#10b981" },
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Resin QC Records</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click a row to view full batch details</p>
          <div className="text-xs text-gray-500">
            Page {page} of {pagination.totalPages} • Total {pagination.total}
          </div>
        </div>
        {loading && !records.length ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found</div>
        ) : (
          <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                    onClick={() => changeSort("batchNo")}
                  >
                    Batch No
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                    onClick={() => changeSort("productName")}
                  >
                    Product
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hidden sm:table-cell"
                    onClick={() => changeSort("testDate")}
                  >
                    Test date
                  </th>
                  {summaryTests.map((test) => (
                    <th
                      key={test._id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                      onClick={() => changeTestSort(test)}
                      title={test.name}
                    >
                      {test.code}
                    </th>
                  ))}
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                    onClick={() => changeSort("status")}
                  >
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleRecords.map((record) => (
                    <tr
                      key={record._id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => onQcDataRowClick(e, () => setDetailRecord(record))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailRecord(record);
                        }
                      }}
                      className={qcDataRowClassName(detailRecord?._id === record._id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{record.batchNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {record.productName}
                          {record.grade ? ` · ${record.grade}` : ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hidden sm:table-cell">
                          {record.testDate ? new Date(record.testDate).toLocaleDateString() : "—"}
                        </td>
                        {summaryTests.map((test) => (
                          <td key={`${record._id}-${test._id}`} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {formatResinTestValue(record, test, qcValuesByBatch)}
                          </td>
                        ))}
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
                    <td className="px-4 py-3 text-sm" data-no-row-click>
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
                                  batchNo: record.batchNo,
                                  productName: record.productName || "",
                                  grade: record.grade || "",
                                  testDate: record.testDate ? new Date(record.testDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                                  color: record.color || "",
                                  transparency: record.transparency || "",
                                  eew: record.eew?.toString() || "",
                                  gelTime: record.gelTime?.toString() || "",
                                  viscosity: record.viscosity?.toString() || "",
                                  mixViscosity: record.mixViscosity?.toString() || "",
                                  exothermicTemperature: record.exothermicTemperature?.toString() || "",
                                  hycl: record.hycl?.toString() || "",
                                  solidContent: record.solidContent?.toString() || "",
                                  remarks: record.remarks || "",
                                });
                                setShowForm(true);
                              }}
                              className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            {canSubmit ? (
                              <button
                                onClick={() => handleSubmitForApproval(record._id)}
                                className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                              >
                                Submit
                              </button>
                            ) : null}
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
                        {record.status === "submitted" && canApprove ? (
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
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Resin QC Details</h4>
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
            <div className="p-5 space-y-4 text-xs text-gray-700 dark:text-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold">Product:</span> {detailRecord.productName} {detailRecord.grade}
                </div>
                <div>
                  <span className="font-semibold">Test date:</span>{" "}
                  {detailRecord.testDate ? new Date(detailRecord.testDate).toLocaleDateString() : "—"}
                </div>
                <div>
                  <span className="font-semibold">Status:</span> {detailRecord.status}
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white mb-2">
                  All resin module tests ({resinModuleTests.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {resinModuleTests.map((test) => (
                    <div
                      key={test._id}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1.5"
                    >
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{test.code}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{test.name}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                        {formatResinTestValue(detailRecord, test, qcValuesByBatch)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-semibold">Remarks:</span> {detailRecord.remarks || "—"}
              </div>
              {detailRecord.rejectionReason ? (
                <div className="text-red-600 dark:text-red-400">
                  <span className="font-semibold">Rejection reason:</span> {detailRecord.rejectionReason}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

