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
  titleClassName = "text-lg sm:text-xl font-bold tracking-tight",
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
    <section className="space-y-3 sm:space-y-4 w-full min-w-0 pb-20 sm:pb-0">
      <header className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-4 text-white shadow-lg shadow-blue-900/15 sm:rounded-none sm:border-0 sm:bg-none sm:from-transparent sm:via-transparent sm:to-transparent sm:p-0 sm:shadow-none dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 sm:dark:bg-transparent sm:dark:border-0 sm:dark:shadow-none">
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10 sm:hidden" aria-hidden />
        <div className="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-sky-300/20 sm:hidden" aria-hidden />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            {/* Avoid sm: + dark:sm: fights — light desktop uses blue-900; dark always uses light text */}
            <h1 className={`${titleClassName} text-white sm:text-blue-900 dark:text-blue-50`}>
              {title}
            </h1>
            {summary ? (
              <p className="mt-1 text-sm font-medium text-blue-50/90 sm:text-blue-600 dark:text-blue-200">
                {summary}
              </p>
            ) : null}
          </div>
          {onAdd || onBulkImport ? (
            <div className="hidden sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
              {onBulkImport ? (
                <button type="button" onClick={onBulkImport} className={procurementSecondaryButtonClass}>
                  {bulkImportLabel}
                </button>
              ) : null}
              {onAdd ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex items-center justify-center min-h-11 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
                >
                  + {addLabel}
                </button>
              ) : null}
            </div>
          ) : null}
          {onBulkImport ? (
            <button
              type="button"
              onClick={onBulkImport}
              className="relative sm:hidden inline-flex items-center justify-center min-h-10 w-full rounded-xl border border-white/35 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-sm active:bg-white/25"
            >
              {bulkImportLabel}
            </button>
          ) : null}
        </div>
      </header>

      <section className={`rounded-2xl p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 w-full min-w-0 ${procurementPanelClass}`}>
        {children}
      </section>

      {/* Mobile primary action — floating, always reachable */}
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="sm:hidden fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/30 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">+</span>
          {addLabel}
        </button>
      ) : null}
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
      enterKeyHint="search"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        // text-base (16px) on mobile avoids iOS zoom; full width so it isn't a tiny strip
        "block w-full min-h-11 rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-blue-900",
        "placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none",
        "dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50 dark:placeholder:text-slate-400 dark:focus:ring-blue-900/40",
        "sm:max-w-md",
        className,
      ].join(" ")}
    />
  );
}

/** Full-width search row for list pages (mobile-friendly). */
export function ProcurementSearchBar({
  label,
  value,
  onChange,
  placeholder,
  onClear,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end w-full min-w-0">
      <label className="block flex-1 min-w-0 w-full">
        {label ? (
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            {label}
          </span>
        ) : null}
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 dark:text-slate-400"
            aria-hidden
          >
            ⌕
          </span>
          <ProcurementSearchInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="max-w-none sm:max-w-none pl-10 bg-blue-50/60 border-blue-100 shadow-inner shadow-blue-900/5 dark:bg-slate-950"
          />
        </div>
      </label>
      {value.trim() && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-600 dark:text-blue-200 dark:hover:bg-slate-800 w-full sm:w-auto shrink-0"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

export function LoadingText({ children = "Loading..." }: { children?: React.ReactNode }) {
  return <p className="text-sm text-blue-600 dark:text-blue-300">{children}</p>;
}

function headerText(h: React.ReactNode): string {
  if (typeof h === "string" || typeof h === "number") return String(h);
  return "";
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
    <section className="w-full min-w-0">
      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-blue-200 bg-gradient-to-b from-blue-50/80 to-white px-4 py-10 text-center text-sm text-blue-600 dark:border-slate-600 dark:from-slate-900 dark:to-slate-950 dark:text-blue-300">
            No records yet.
          </p>
        ) : (
          rows.map((cells, i) => {
            const titleCell = cells[1] ?? cells[0];
            const codeCell = cells[0];
            const interactive = Boolean(onRowClick);
            const detailFields: React.ReactNode[] = [];
            const actionFields: React.ReactNode[] = [];

            headers.forEach((h, j) => {
              if (j === 0 || j === 1) return;
              const label = headerText(h);
              const value = cells[j];
              if (value == null || value === "") return;
              if (!label) {
                actionFields.push(
                  <div key={j} className="pt-2.5 mt-1 border-t border-blue-50 dark:border-slate-800">
                    {value}
                  </div>
                );
                return;
              }
              detailFields.push(
                <div key={j} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-xs uppercase tracking-wide text-blue-400 dark:text-blue-500">
                    {label}
                  </dt>
                  <dd className="min-w-0 text-right font-medium text-blue-900 dark:text-blue-100 break-words">
                    {value}
                  </dd>
                </div>
              );
            });

            return (
              <article
                key={i}
                className="relative w-full overflow-hidden rounded-2xl border border-blue-100/90 bg-white p-4 shadow-md shadow-blue-900/5 ring-1 ring-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none dark:ring-slate-800"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-sky-400" aria-hidden />
                {/* Clickable body — div, not button, so Edit/Deactivate buttons stay valid */}
                <div
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => onRowClick?.(i) : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick?.(i);
                          }
                        }
                      : undefined
                  }
                  className={[
                    "pl-2 outline-none",
                    interactive
                      ? "cursor-pointer rounded-xl active:bg-blue-50/70 dark:active:bg-slate-800/80"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] text-blue-950 dark:text-blue-50 break-words leading-snug">
                        {titleCell}
                      </p>
                      {codeCell != null && codeCell !== titleCell ? (
                        <p className="mt-1 inline-flex max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-blue-600 dark:bg-slate-800 dark:text-blue-300">
                          {codeCell}
                        </p>
                      ) : null}
                    </div>
                    {interactive ? (
                      <span className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-300">
                        ›
                      </span>
                    ) : null}
                  </div>
                  {detailFields.length ? <dl className="space-y-2.5">{detailFields}</dl> : null}
                </div>
                {actionFields.length ? <div className="pl-2">{actionFields}</div> : null}
              </article>
            );
          })
        )}
      </div>

      {/* Desktop / tablet: classic table — scroll only if content still exceeds panel */}
      <div className="hidden md:block overflow-x-auto overscroll-x-contain rounded-lg border border-blue-100 dark:border-slate-700">
        <table className="w-full table-auto text-sm text-blue-900 dark:text-slate-100">
          <thead>
            <tr className="border-b border-blue-200 text-left text-blue-800 dark:border-slate-600 dark:text-slate-100 bg-blue-50/80 dark:bg-slate-800">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={[
                    "py-2.5 px-3 font-semibold",
                    i === headers.length - 1 ? "whitespace-normal" : "whitespace-nowrap",
                  ].join(" ")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-6 px-3 text-blue-600 dark:text-slate-300">
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
                    <td
                      key={j}
                      className={[
                        "py-2.5 px-3 text-blue-900 dark:text-slate-100 align-top",
                        j === cells.length - 1 ? "whitespace-normal" : "whitespace-nowrap",
                      ].join(" ")}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
      className={`fixed inset-0 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 ${
        stacked ? "z-[110]" : "z-[100]"
      }`}
    >
      <article
        className={`w-full rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-xl max-h-[94dvh] sm:max-h-[92vh] overflow-y-auto overflow-x-hidden ${procurementPanelClass} ${widthClass}`}
      >
        <header className="flex justify-between items-center gap-3 mb-4 sticky top-0 z-10 bg-inherit pb-2">
          <h2 className={`${titleClassName} min-w-0 break-words`}>{title}</h2>
          <button type="button" onClick={onClose} className={`${closeClassName} shrink-0`}>
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

export function StatusBadge({ status, label: labelOverride }: { status: string; label?: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    submitted: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    partially_approved: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
    approved: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
    held: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
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
    partial_lines: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    po_draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    open: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
    done: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200",
    n_a: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  const labels: Record<string, string> = {
    held: "on hold",
    cancelled: "not reached",
    awaiting_po: "awaiting PO",
    po_draft: "PO draft",
    issued: "awaiting receipt",
    partial: "partially received",
    received: "fully received",
    partially_approved: "partially approved",
    open: "follow-up open",
    in_progress: "in progress",
    done: "done",
    n_a: "—",
  };
  const key = String(status || "draft");
  const label = labelOverride || labels[key] || key.replace(/_/g, " ");
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
