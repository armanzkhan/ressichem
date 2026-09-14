"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useUser } from "@/components/Auth/user-context";
import { useQcResultPermissions } from "@/lib/useQcResultPermissions";
import { getBackendUrl } from "@/lib/getBackendUrl";
import {
  QcSiteResultModal,
  type BatchFormState,
  type QCResult,
  type QCTest,
} from "@/components/qc/QcSiteResultModal";
import { onQcDataRowClick, qcDataRowClassName } from "@/lib/qcRowClick";
import { filterTestsForModule } from "@/lib/qcModuleTestMatch";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MODULE_OPTIONS = ["", "RESIN", "HARDENER", "LMS", "LMS_RESIN", "LMS_HARDENER", "LMS_FLOORING", "DRY_MORTAR", "RAW_MATERIAL", "PACKAGING", "QA_BOTTLE_FILLING", "RND_TRIAL"];
const STATUS_OPTIONS = ["", "draft", "submitted", "approved", "rejected"] as const;

const QC_FIELD_CLASS =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500";

const QC_OUTLINE_BTN_CLASS =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700";

function authHeaders(token: string, json = true) {
  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "RESSICHEM" : "RESSICHEM";
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-company-id": companyId,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function attachmentUrl(apiUrl: string, path?: string) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function valuesFromMap(visibleTests: QCTest[], valueMap: Record<string, unknown>) {
  return visibleTests
    .map((t) => ({
      test: t._id,
      value: valueMap[t._id],
      unit: t.unit || "",
    }))
    .filter((v) => v.value !== undefined && v.value !== null && String(v.value).trim() !== "");
}

export default function QCResultsPage() {
  const { user, loading: userLoading } = useUser();
  const { canSubmit, canApprove } = useQcResultPermissions();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const apiUrl = useMemo(() => getBackendUrl(), []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tests, setTests] = useState<QCTest[]>([]);
  const [results, setResults] = useState<QCResult[]>([]);
  const [standardCount, setStandardCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, QCResult>>({});
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ resultId: string; attachmentId?: string } | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [activeResult, setActiveResult] = useState<QCResult | null>(null);
  const syncedModulesRef = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token) return;
    if (!opts?.silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      if (!syncedModulesRef.current) {
        syncedModulesRef.current = true;
        void fetch(`${apiUrl}/api/qc/results/sync-modules`, {
          method: "POST",
          cache: "no-store",
          headers: authHeaders(token),
        })
          .then(() => load({ silent: true }))
          .catch(() => {});
      }

      const qs = new URLSearchParams({ limit: "200", system: "QC_SITE_AREA" });
      if (statusFilter) qs.set("status", statusFilter);
      if (moduleFilter) qs.set("module", moduleFilter);
      if (batchSearch.trim()) qs.set("batchNo", batchSearch.trim());

      const headers = authHeaders(token, false);
      const fetchOpts = { cache: "no-store" as RequestCache, headers };
      const [tRes, rRes, sRes] = await Promise.all([
        fetch(`${apiUrl}/api/qc/tests?active=true`, fetchOpts),
        fetch(`${apiUrl}/api/qc/results?${qs}`, fetchOpts),
        fetch(`${apiUrl}/api/qc/standards?active=true&system=QC_SITE_AREA`, fetchOpts),
      ]);
      const tData = await tRes.json();
      const rData = await rRes.json();
      const sData = await sRes.json().catch(() => ({}));
      if (!tRes.ok) throw new Error(tData?.message || "Failed to load tests");
      if (!rRes.ok) throw new Error(rData?.message || "Failed to load results");
      setTests(tData.data || []);
      setResults(rData.data || []);
      if (sRes.ok) setStandardCount(Array.isArray(sData?.data) ? sData.data.length : 0);
    } catch (e: unknown) {
      if (!opts?.silent) setMessage(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [apiUrl, batchSearch, moduleFilter, statusFilter, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const openCreate = () => {
    setActiveResult(null);
    setModalMode("create");
  };

  const openEdit = async (id: string) => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/results/${id}`, { headers: authHeaders(token, false) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load result");
      setActiveResult(data.data);
      setModalMode("edit");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  const openView = async (id: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/qc/results/${id}`, { headers: authHeaders(token, false) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load result");
      setActiveResult(data.data);
      setModalMode("view");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveResult(null);
  };

  const saveFromModal = async (form: BatchFormState, valueMap: Record<string, unknown>) => {
    if (!token) return;
    const visibleTests = filterTestsForModule(tests, form.module);

    const payload = {
      ...form,
      testDate: new Date(form.testDate).toISOString(),
      values: valuesFromMap(visibleTests, valueMap),
    };

    setLoading(true);
    setMessage("");
    setSuccess("");
    try {
      if (modalMode === "edit" && activeResult) {
        const res = await fetch(`${apiUrl}/api/qc/results/${activeResult._id}`, {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Update failed");
        setSuccess("Batch result updated.");
      } else {
        const res = await fetch(`${apiUrl}/api/qc/results`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Create failed");
        setSuccess("Draft batch result saved.");
      }
      closeModal();
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const postAction = async (url: string, body?: Record<string, string>) => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    setSuccess("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(token),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Action failed");
      setSuccess("Action completed.");
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = (resultId: string) => {
    uploadTargetRef.current = { resultId };
    fileInputRef.current?.click();
  };

  const triggerReplace = (resultId: string, attachmentId: string) => {
    uploadTargetRef.current = { resultId, attachmentId };
    replaceInputRef.current?.click();
  };

  const uploadFile = async (resultId: string, file: File, replaceAttachmentId?: string) => {
    if (!token) {
      setMessage("Session expired. Please sign in again.");
      return;
    }
    setUploadingId(resultId);
    setMessage("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = replaceAttachmentId
        ? `/api/qc/results/${resultId}/attachments/${replaceAttachmentId}`
        : `/api/qc/results/${resultId}/attachments`;
      const res = await fetch(url, {
        method: replaceAttachmentId ? "PUT" : "POST",
        headers: authHeaders(token, false),
        body: fd,
      });
      const text = await res.text();
      let data: { message?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new Error(text || `Upload failed (${res.status})`);
      }
      if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`);
      setSuccess(replaceAttachmentId ? `Replaced with: ${file.name}` : `Uploaded: ${file.name}`);
      setExpandedId(resultId);
      if (activeResult?._id === resultId) {
        const detail = await fetch(`${apiUrl}/api/qc/results/${resultId}`, { headers: authHeaders(token, false) });
        const detailJson = await detail.json();
        if (detail.ok) setActiveResult(detailJson.data);
      }
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const deleteAttachment = async (resultId: string, attachmentId: string) => {
    if (!token) return;
    if (!confirm("Remove this attachment?")) return;
    setUploadingId(resultId);
    setMessage("");
    setSuccess("");
    try {
      const res = await fetch(`/api/qc/results/${resultId}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: authHeaders(token, false),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      setSuccess("Attachment removed.");
      if (activeResult?._id === resultId) {
        const detail = await fetch(`${apiUrl}/api/qc/results/${resultId}`, { headers: authHeaders(token, false) });
        const detailJson = await detail.json();
        if (detail.ok) setActiveResult(detailJson.data);
      }
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setUploadingId(null);
    }
  };

  const canEdit = (r: QCResult) => r.status === "draft" || r.status === "rejected";

  const toggleExpanded = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (expandedDetails[id] || !token) return;
    setExpandingId(id);
    try {
      const res = await fetch(`${apiUrl}/api/qc/results/${id}`, { cache: "no-store", headers: authHeaders(token, false) });
      const data = await res.json();
      if (res.ok && data?.data) {
        setExpandedDetails((prev) => ({ ...prev, [id]: data.data }));
      }
    } catch {
      // list row still expands with summary data
    } finally {
      setExpandingId(null);
    }
  };

  const [trendTestId, setTrendTestId] = useState("");
  const [trendSeries, setTrendSeries] = useState<{ x: number; y: number; batchNo: string }[]>([]);

  const loadTrends = async () => {
    if (!token || !trendTestId) return;
    setLoading(true);
    setMessage("");
    try {
      const qs = new URLSearchParams({
        testId: trendTestId,
        module: moduleFilter || "RESIN",
        system: "QC_SITE_AREA",
      });
      const res = await fetch(`${apiUrl}/api/qc/results/trends?${qs}`, {
        headers: authHeaders(token, false),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load trends");
      setTrendSeries(
        (data.data || []).map((p: { testDate: string; y: number; batchNo: string }) => ({
          x: new Date(p.testDate).getTime(),
          y: Number(p.y),
          batchNo: p.batchNo,
        }))
      );
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to load trends");
    } finally {
      setLoading(false);
    }
  };

  const chartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: true },
        foreColor: isDark ? "#cbd5e1" : "#374151",
        background: "transparent",
      },
      theme: { mode: isDark ? "dark" : "light" },
      stroke: { width: 3, curve: "smooth" },
      markers: { size: 4 },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: isDark ? "#cbd5e1" : "#4b5563" } },
      },
      yaxis: {
        labels: { style: { colors: isDark ? "#cbd5e1" : "#4b5563" } },
      },
      grid: { borderColor: isDark ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.35)" },
      tooltip: { theme: isDark ? "dark" : "light" },
      legend: { labels: { colors: isDark ? "#e2e8f0" : "#374151" } },
    }),
    [isDark]
  );

  const userDisplayName = useMemo(() => {
    const fn = (user?.firstName || "").trim();
    const ln = (user?.lastName || "").trim();
    const full = `${fn} ${ln}`.trim();
    return full || user?.email || "QC User";
  }, [user?.email, user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const parts = userDisplayName.split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || "Q"}${parts[1]?.[0] || "C"}`.toUpperCase();
  }, [userDisplayName]);

  const stats = useMemo(() => {
    const byStatus = results.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { draft: 0, submitted: 0, approved: 0, rejected: 0 } as Record<QCResult["status"], number>
    );
    return { tests: tests.length, standards: standardCount, results: results.length, pending: byStatus.submitted, byStatus };
  }, [results, standardCount, tests.length]);

  const statusBadge = (s: QCResult["status"]) => {
    const cls =
      s === "approved"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200"
        : s === "submitted"
          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200"
          : s === "rejected"
            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200"
            : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-200";
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>{s}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-sky-600 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-extrabold">
                {initials}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold">Welcome, {userDisplayName}</h2>
                <p className="text-sm text-white/90">
                  {userLoading ? "Loading…" : `${user?.email || ""} · QC Site · Results`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-2 rounded-xl bg-white text-emerald-800 text-sm font-bold hover:bg-white/90"
              >
                + New batch
              </button>
              <Link href="/qc/site/standards" className="px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-semibold">
                Standards
              </Link>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Active tests", stats.tests],
            ["Standards", stats.standards ?? "—"],
            ["Results shown", stats.results],
            ["Pending", stats.pending],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/50 p-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {success ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200">
          {success}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {message}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Batch results</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Click a row to expand · Draft & rejected → Edit · Submitted → Approve/Reject</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={QC_FIELD_CLASS}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={QC_FIELD_CLASS}>
              <option value="">All modules</option>
              {MODULE_OPTIONS.filter(Boolean).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              placeholder="Search batch #"
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              className={`${QC_FIELD_CLASS} w-36`}
            />
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {loading ? "…" : "Apply"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto text-gray-800 dark:text-gray-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                <th className="py-2 pr-3 w-8" />
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4">Module / product</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const expanded = expandedId === r._id;
                const detail = expandedDetails[r._id] || r;
                const valueRows = detail.values || [];
                return (
                  <React.Fragment key={r._id}>
                    <tr
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      onClick={(e) => onQcDataRowClick(e, () => void toggleExpanded(r._id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void toggleExpanded(r._id);
                        }
                      }}
                      className={qcDataRowClassName(expanded, "border-t border-gray-100 dark:border-gray-700")}
                    >
                      <td className="py-3 pr-2" data-no-row-click>
                        <button
                          type="button"
                          onClick={() => void toggleExpanded(r._id)}
                          className="w-7 h-7 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-bold"
                          aria-label={expanded ? "Collapse" : "Expand"}
                        >
                          {expandingId === r._id ? "…" : expanded ? "−" : "+"}
                        </button>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">{r.batchNo}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{r.module}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{r.productCategory}</p>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-700 dark:text-gray-200">
                        {new Date(r.testDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        {statusBadge(r.status)}
                        {r.rejectionReason ? (
                          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 max-w-[180px]">{r.rejectionReason}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4" data-no-row-click>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openView(r._id)}
                            className={QC_OUTLINE_BTN_CLASS}
                          >
                            View
                          </button>
                          {canEdit(r) ? (
                            <button
                              type="button"
                              onClick={() => openEdit(r._id)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                            >
                              Edit
                            </button>
                          ) : null}
                          {canSubmit ? (
                            <button
                              type="button"
                              onClick={() => postAction(`${apiUrl}/api/qc/results/${r._id}/submit`)}
                              disabled={loading || (r.status !== "draft" && r.status !== "rejected")}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-40"
                            >
                              Submit
                            </button>
                          ) : null}
                          {canApprove ? (
                            <>
                              <button
                                type="button"
                                onClick={() => postAction(`${apiUrl}/api/qc/results/${r._id}/approve`)}
                                disabled={loading || r.status !== "submitted"}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = prompt("Rejection reason?");
                                  if (reason === null) return;
                                  postAction(`${apiUrl}/api/qc/results/${r._id}/reject`, { reason });
                                }}
                                disabled={loading || r.status !== "submitted"}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-40"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            disabled={!!uploadingId}
                            onClick={() => triggerUpload(r._id)}
                            className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-50"
                          >
                            {uploadingId === r._id ? "Uploading…" : "Upload file"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-gray-50/90 dark:bg-gray-900/50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
                            {detail.operator ? <span>Operator: <strong>{detail.operator}</strong></span> : null}
                            {detail.shift ? <span>Shift: <strong>{detail.shift}</strong></span> : null}
                            {detail.remarks ? <span>Remarks: <strong>{detail.remarks}</strong></span> : null}
                          </div>
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Test values</p>
                          {valueRows.length ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {valueRows.map((v, i) => {
                                const t = typeof v.test === "object" ? v.test : null;
                                return (
                                  <div
                                    key={i}
                                    className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5"
                                  >
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t?.code || t?.name || "—"}</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {v.value !== undefined && v.value !== null ? String(v.value) : "—"}
                                      {v.unit ? ` ${v.unit}` : ""}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              No test values recorded for this batch. Use <strong>Edit</strong> to add values, or enter them in the module page (Resin, Hardener, etc.).
                            </p>
                          )}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Attachments</p>
                            {(detail.attachments || []).length === 0 ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">No files yet.</p>
                            ) : (
                              <ul className="space-y-2">
                                {(detail.attachments || []).map((a, i) => {
                                  const att = typeof a === "object" && a !== null ? a : null;
                                  const href = attachmentUrl(apiUrl, att?.path);
                                  const name = att?.originalName || "File";
                                  const attId = att?._id;
                                  return (
                                    <li
                                      key={attId || i}
                                      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5"
                                    >
                                      {href ? (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-sm text-sky-700 dark:text-sky-300 hover:underline flex-1 min-w-0 truncate"
                                        >
                                          {name}
                                        </a>
                                      ) : (
                                        <span className="text-sm text-gray-500 flex-1 truncate">{name}</span>
                                      )}
                                      {canEdit(r) && attId ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={!!uploadingId}
                                            onClick={() => triggerReplace(r._id, attId)}
                                            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                                          >
                                            Replace
                                          </button>
                                          <button
                                            type="button"
                                            disabled={!!uploadingId}
                                            onClick={() => deleteAttachment(r._id, attId)}
                                            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
              {!results.length && !loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No results match your filters.{" "}
                    <button type="button" onClick={openCreate} className="text-sky-600 dark:text-sky-300 font-semibold underline">
                      Create one
                    </button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex-1">Trend graph</h3>
          <select value={trendTestId} onChange={(e) => setTrendTestId(e.target.value)} className={QC_FIELD_CLASS}>
            <option value="">Select test…</option>
            {tests
              .filter((t) => (t.dataType || "number") === "number")
              .map((t) => (
                <option key={t._id} value={t._id}>
                  {t.code} — {t.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={loadTrends}
            disabled={loading || !trendTestId}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Load
          </button>
        </div>
        {trendSeries.length ? (
          <Chart options={chartOptions} series={[{ name: "Value", data: trendSeries as never }]} type="line" height={260} />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a test and load trend data.</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const target = uploadTargetRef.current;
          if (file && target) uploadFile(target.resultId, file);
          e.target.value = "";
          uploadTargetRef.current = null;
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const target = uploadTargetRef.current;
          if (file && target?.attachmentId) uploadFile(target.resultId, file, target.attachmentId);
          e.target.value = "";
          uploadTargetRef.current = null;
        }}
      />

      <QcSiteResultModal
        open={modalMode !== null}
        mode={modalMode === null ? "view" : modalMode}
        result={activeResult}
        tests={tests}
        loading={loading}
        apiUrl={apiUrl}
        onClose={closeModal}
        onSave={saveFromModal}
        onUpload={activeResult ? (file) => uploadFile(activeResult._id, file) : undefined}
        onReplace={
          activeResult && canEdit(activeResult)
            ? (attachmentId, file) => uploadFile(activeResult._id, file, attachmentId)
            : undefined
        }
        onDelete={
          activeResult && canEdit(activeResult)
            ? (attachmentId) => deleteAttachment(activeResult._id, attachmentId)
            : undefined
        }
        canModifyAttachments={activeResult ? canEdit(activeResult) : false}
      />
    </div>
  );
}
