"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { procurementApi, type PurchaseDocument } from "@/lib/procurementApi";
import { downloadProcurementFile } from "@/lib/procurementDownload";
import { PR_DEPARTMENTS } from "@/lib/procurementOptions";
import { pageTitle, purchaseTypeForSection } from "@/lib/procurementScope";
import {
  Alert,
  FormLabel,
  LoadingText,
  PageShell,
  StatusBadge,
  Table,
  procurementControlClass,
  procurementSecondaryButtonClass,
  procurementUserLabel,
} from "@/components/procurement/procurement-ui";

type Props = { section: "local" | "import" };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function userLabel(value: PurchaseDocument["requestedBy"] | PurchaseDocument["assignedApprover"]) {
  return procurementUserLabel(value);
}

function itemCount(row: PurchaseDocument) {
  return Array.isArray(row.items) ? row.items.length : 0;
}

function qtyPair(row: PurchaseDocument) {
  if (row.stockStatus === "n_a" || !row.stockStatus) return "—";
  if (row.stockStatus === "awaiting_po") return "—";
  const ordered = Number(row.qtyOrdered) || 0;
  const received = Number(row.qtyReceived) || 0;
  return `${received} / ${ordered}`;
}

function reportDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function Truncate({ text, className = "max-w-[8rem]" }: { text: string; className?: string }) {
  return (
    <span className={`block truncate ${className}`} title={text}>
      {text}
    </span>
  );
}

export function PrReportsView({ section }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [dateField, setDateField] = useState<"createdAt" | "submittedAt" | "approvedAt">("createdAt");
  const [rows, setRows] = useState<PurchaseDocument[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    pending: number;
    awaitingReceipt?: number;
    partiallyReceived?: number;
    fullyReceived?: number;
    purchased?: number;
    partiallyDelivered?: number;
    completed?: number;
    byStatus: Record<string, number>;
    byStock?: Record<string, number>;
    byDepartment: Record<string, number>;
    byLocation?: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => current - i);
  }, [now]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await procurementApi.monthlyPrReport({
        year,
        month,
        purchaseType: purchaseTypeForSection(section),
        status: status || undefined,
        stockStatus: stockStatus || undefined,
        department: department || undefined,
        location: location || undefined,
        dateField,
      });
      setRows(res.data?.rows || []);
      setSummary(res.data?.summary || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PR report");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, status, stockStatus, department, location, dateField, section]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportReport = async (format: "xlsx" | "csv") => {
    setExporting(true);
    setError("");
    try {
      const path = procurementApi.monthlyPrReportExportPath({
        year,
        month,
        purchaseType: purchaseTypeForSection(section),
        status: status || undefined,
        stockStatus: stockStatus || undefined,
        department: department || undefined,
        location: location || undefined,
        dateField,
        format,
      });
      const monthPad = String(month).padStart(2, "0");
      await downloadProcurementFile(path, `pr-monthly-report-${year}-${monthPad}.${format}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell
      title={pageTitle(section, "reports")}
      summary={
        summary
          ? `${MONTH_NAMES[month - 1]} ${year} — ${summary.total} PR${summary.total === 1 ? "" : "s"}`
          : undefined
      }
      onBulkImport={() => void exportReport("xlsx")}
      bulkImportLabel={exporting ? "Exporting…" : "Export Excel"}
    >
      {error ? <Alert message={error} /> : null}

      <p className="mb-3 text-sm text-blue-700 dark:text-blue-300">
        Approval status stays on the PR. Purchase / delivery is derived from the linked PO (awaiting
        purchase → purchased → partially delivered → completed). Location is optional for site-wise
        filtering.
      </p>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 mb-4 w-full min-w-0">
        <FormLabel>
          Month
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </FormLabel>
        <FormLabel>
          Year
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </FormLabel>
        <FormLabel>
          Date basis
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={dateField}
            onChange={(e) => setDateField(e.target.value as "createdAt" | "submittedAt" | "approvedAt")}
          >
            <option value="createdAt">Created date</option>
            <option value="submittedAt">Submitted date</option>
            <option value="approvedAt">Approved date</option>
          </select>
        </FormLabel>
        <FormLabel>
          PR status
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All PR statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="partially_approved">Partially approved</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="held">Held</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </FormLabel>
        <FormLabel>
          Purchase / delivery
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
          >
            <option value="">All purchase / delivery</option>
            <option value="awaiting_po">Awaiting purchase</option>
            <option value="po_draft">PO draft</option>
            <option value="issued">Purchased</option>
            <option value="partial">Partially delivered</option>
            <option value="received">Completed</option>
            <option value="closed">Completed (closed)</option>
            <option value="n_a">N/A (not approved)</option>
          </select>
        </FormLabel>
        <FormLabel>
          Department
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All departments</option>
            {PR_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </FormLabel>
        <FormLabel>
          Location
          <input
            className={`mt-1 ${procurementControlClass}`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Filter by location / site"
            list="pr-report-locations"
          />
          <datalist id="pr-report-locations">
            {Object.keys(summary?.byLocation || {})
              .filter((loc) => loc && loc !== "Unspecified")
              .map((loc) => (
                <option key={loc} value={loc} />
              ))}
          </datalist>
        </FormLabel>
      </section>

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" className={procurementSecondaryButtonClass} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        <button
          type="button"
          className={procurementSecondaryButtonClass}
          onClick={() => void exportReport("csv")}
          disabled={exporting || loading}
        >
          Export CSV
        </button>
      </div>

      {summary ? (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            {[
              { label: "Total PRs", value: summary.total },
              { label: "Draft", value: summary.byStatus.draft || 0 },
              { label: "Submitted", value: summary.byStatus.submitted || 0 },
              { label: "Partially approved", value: summary.byStatus.partially_approved || 0 },
              { label: "Approved", value: summary.byStatus.approved || 0 },
              { label: "Rejected", value: summary.byStatus.rejected || 0 },
              { label: "Held / Pending", value: summary.pending || 0 },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-blue-100 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-xs text-blue-600 dark:text-blue-300">{card.label}</p>
                <p className="mt-1 text-xl font-semibold text-blue-900 dark:text-blue-100">{card.value}</p>
              </div>
            ))}
          </section>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Awaiting purchase", value: summary.byStock?.awaiting_po || 0 },
              { label: "Purchased", value: summary.purchased ?? summary.byStock?.issued ?? 0 },
              {
                label: "Partially delivered",
                value: summary.partiallyDelivered ?? summary.partiallyReceived ?? 0,
              },
              { label: "Completed", value: summary.completed ?? summary.fullyReceived ?? 0 },
              { label: "Awaiting PO / receipt", value: summary.awaitingReceipt || 0 },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-3 dark:border-emerald-900 dark:bg-emerald-950/30"
              >
                <p className="text-xs text-emerald-700 dark:text-emerald-300">{card.label}</p>
                <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-100">{card.value}</p>
              </div>
            ))}
          </section>
          {summary.byLocation && Object.keys(summary.byLocation).length > 0 ? (
            <section className="mb-4">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">By location</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byLocation).map(([loc, count]) => (
                  <button
                    key={loc}
                    type="button"
                    className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs text-blue-800 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-100"
                    onClick={() => setLocation(loc === "Unspecified" ? "" : loc)}
                  >
                    {loc}: <strong>{count}</strong>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <LoadingText>Loading monthly PR report…</LoadingText>
      ) : (
        <Table
          headers={[
            "PR #",
            "Department",
            "Status",
            "Delivery",
            "PO #",
            "Recv/Ord",
            "Created",
            "Requester",
            "Lines",
            "Total",
          ]}
          rows={rows.map((r) => {
            const dept = r.title || "—";
            const requester = userLabel(r.requestedBy || r.submittedBy);
            return [
              r.requisitionNumber || "—",
              <Truncate key={`dept-${r._id}`} text={dept} className="max-w-[12rem]" />,
              <StatusBadge key={`st-${r._id}`} status={r.status} />,
              <StatusBadge key={`stock-${r._id}`} status={r.stockStatus || "n_a"} />,
              r.poNumber || "—",
              qtyPair(r),
              reportDate(r.createdAt),
              <Truncate key={`req-${r._id}`} text={requester} className="max-w-[6rem]" />,
              String(itemCount(r)),
              String(r.total ?? 0),
            ];
          })}
        />
      )}

      {!loading && rows.length === 0 ? (
        <p className="mt-3 text-sm text-blue-600 dark:text-blue-300">No PRs found for the selected month and filters.</p>
      ) : null}
    </PageShell>
  );
}
