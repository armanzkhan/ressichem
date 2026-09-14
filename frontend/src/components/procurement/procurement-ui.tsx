"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  procurementCompactControlClass,
  procurementCompactFieldClass,
  procurementCompactLabelClass,
  procurementControlClass,
  procurementFieldClass,
  procurementFieldsetClass,
  procurementHintClass,
  procurementLabelClass,
  procurementLegendClass,
  procurementPanelClass,
  procurementReadonlyClass,
  procurementSecondaryButtonClass,
} from "./procurementTheme";

export {
  procurementCompactControlClass,
  procurementCompactFieldClass,
  procurementCompactLabelClass,
  procurementControlClass,
  procurementFieldClass,
  procurementFieldsetClass,
  procurementHintClass,
  procurementLabelClass,
  procurementLegendClass,
  procurementPanelClass,
  procurementReadonlyClass,
  procurementSecondaryButtonClass,
} from "./procurementTheme";

export function FormLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <label className={[procurementLabelClass, className].filter(Boolean).join(" ")}>{children}</label>;
}

export function PageShell({
  title,
  summary,
  onAdd,
  addLabel = "Add",
  onBulkImport,
  bulkImportLabel = "Bulk import",
  titleClassName = "text-xl font-bold text-blue-700 dark:text-blue-300",
  children,
}: {
  title: string;
  /** e.g. "65 suppliers" shown under the page title */
  summary?: string;
  onAdd?: () => void;
  addLabel?: string;
  onBulkImport?: () => void;
  bulkImportLabel?: string;
  titleClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={titleClassName}>{title}</h1>
          {summary ? (
            <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-300">{summary}</p>
          ) : null}
        </div>
        {onAdd || onBulkImport ? (
          <div className="flex flex-wrap items-center gap-2">
            {onBulkImport ? (
              <button type="button" onClick={onBulkImport} className={procurementSecondaryButtonClass}>
                {bulkImportLabel}
              </button>
            ) : null}
            {onAdd ? (
              <button type="button" onClick={onAdd} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
                + {addLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      <section className={`rounded-2xl p-6 space-y-4 ${procurementPanelClass}`}>
        {children}
      </section>
    </section>
  );
}

export function Alert({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{message}</p>;
}

export function ProcurementSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "w-full max-w-md rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900",
        "placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none",
        "dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50 dark:placeholder:text-slate-400 dark:focus:ring-blue-900/40",
        className,
      ].join(" ")}
    />
  );
}

export function LoadingText({ children = "Loading..." }: { children?: React.ReactNode }) {
  return <p className="text-sm text-blue-600 dark:text-blue-300">{children}</p>;
}

export function Table({
  headers,
  rows,
  onRowClick,
}: {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <section className="overflow-x-auto">
      <table className="w-full text-sm text-blue-800 dark:text-blue-100">
        <thead>
          <tr className="border-b border-blue-200 text-left text-blue-700 dark:border-slate-600 dark:text-blue-300">
            {headers.map((h, i) => (
              <th key={i} className="py-2 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-6 text-blue-600 dark:text-blue-300">
                No records.
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr
                key={i}
                className={[
                  "border-b border-blue-100 dark:border-slate-700",
                  onRowClick ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800/80" : "",
                ].join(" ")}
                onClick={onRowClick ? () => onRowClick(i) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(i);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
              >
                {cells.map((cell, j) => (
                  <td key={j} className="py-2 pr-4 text-blue-800 dark:text-blue-100">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  sheet,
  stacked,
  titleClassName = "font-semibold text-lg text-blue-700 dark:text-blue-300",
  closeClassName = "text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Near full-viewport width for spreadsheet-style forms (avoids forced horizontal scroll). */
  sheet?: boolean;
  /** Use when opening a modal on top of another modal (e.g. quick-add supplier inside PFI). */
  stacked?: boolean;
  titleClassName?: string;
  closeClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const widthClass = sheet
    ? "max-w-[min(98vw,1700px)]"
    : wide
      ? "max-w-6xl"
      : "max-w-2xl";

  const overlay = (
    <section
      className={`fixed inset-0 flex items-center justify-center bg-black/50 p-2 sm:p-4 ${
        stacked ? "z-[110]" : "z-[100]"
      }`}
    >
      <article
        className={`w-full rounded-2xl p-6 shadow-xl max-h-[92vh] overflow-y-auto ${procurementPanelClass} ${widthClass}`}
      >
        <header className="flex justify-between items-center mb-4">
          <h2 className={titleClassName}>{title}</h2>
          <button type="button" onClick={onClose} className={closeClassName}>
            Close
          </button>
        </header>
        {children}
      </article>
    </section>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

export function Field({
  label,
  value,
  onChange,
  required,
  disabled,
  type = "text",
  multiline,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const safeValue = value ?? "";
  const className = procurementFieldClass;
  return (
    <label className={procurementLabelClass}>
      {label}
      {multiline ? (
        <textarea
          required={required}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      ) : (
        <input
          type={type}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      )}
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    submitted: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    partially_approved: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
    approved: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
    held: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    issued: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
    partial: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    received: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    posted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    matched: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
    unmatched: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    variance: "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    paid: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
    partially_paid: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    awaiting_po: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    po_draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    n_a: "bg-transparent text-slate-400 dark:text-slate-500",
  };
  const labels: Record<string, string> = {
    held: "on hold",
    awaiting_po: "awaiting PO",
    po_draft: "PO draft",
    issued: "awaiting receipt",
    partial: "partially received",
    received: "fully received",
    partially_approved: "partially approved",
    n_a: "—",
  };
  const key = String(status || "draft");
  const label = labels[key] || key.replace(/_/g, " ");
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[key] || styles.draft}`}>
      {label}
    </span>
  );
}

type UserLike = { firstName?: string; lastName?: string; email?: string } | string | null | undefined;

export function procurementUserLabel(user?: UserLike): string {
  if (!user) return "—";
  if (typeof user === "string") return user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "—";
}

export function procurementDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
