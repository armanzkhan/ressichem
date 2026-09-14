"use client";

import React, { useEffect, useMemo, useState } from "react";
import { filterTestsForModule } from "@/lib/qcModuleTestMatch";

export type QCTest = {
  _id: string;
  code: string;
  name: string;
  unit?: string;
  dataType?: "number" | "string" | "boolean";
  applicableModules?: string[];
};

export type QCResultValue = { test: QCTest | string; value: unknown; numericValue?: number; unit?: string; notes?: string };
export type QCResult = {
  _id: string;
  system: string;
  module: string;
  productCategory: string;
  productName?: string;
  grade?: string;
  batchNo: string;
  testDate: string;
  operator?: string;
  shift?: string;
  remarks?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  values: QCResultValue[];
  attachments?: { _id: string; path: string; originalName: string }[];
  rejectionReason?: string;
};

export type BatchFormState = {
  system: string;
  module: string;
  productCategory: string;
  productName: string;
  grade: string;
  batchNo: string;
  testDate: string;
  operator: string;
  shift: string;
  remarks: string;
};

const MODULE_OPTIONS = [
  "RESIN",
  "HARDENER",
  "DRY_MORTAR",
  "LMS_RESIN",
  "LMS_HARDENER",
  "LMS_FLOORING",
  "RAW_MATERIAL",
  "PACKAGING",
  "QA_BOTTLE_FILLING",
  "RND_TRIAL",
];

const QC_MODAL_FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 disabled:opacity-70";

type Props = {
  open: boolean;
  mode: "create" | "edit" | "view";
  result?: QCResult | null;
  tests: QCTest[];
  loading?: boolean;
  apiUrl?: string;
  onClose: () => void;
  onSave: (form: BatchFormState, valueMap: Record<string, unknown>) => Promise<void>;
  onUpload?: (file: File) => void;
  onReplace?: (attachmentId: string, file: File) => void;
  onDelete?: (attachmentId: string) => void;
  canModifyAttachments?: boolean;
};

function fileHref(apiUrl: string, path?: string) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function QcSiteResultModal({
  open,
  mode,
  result,
  tests,
  loading,
  apiUrl = "",
  onClose,
  onSave,
  onUpload,
  onReplace,
  onDelete,
  canModifyAttachments = false,
}: Props) {
  const readonly = mode === "view";
  const title = mode === "create" ? "New batch result" : mode === "edit" ? "Edit batch result" : "Batch details";

  const [form, setForm] = useState<BatchFormState>({
    system: "QC_SITE_AREA",
    module: "RESIN",
    productCategory: "Epoxy Resin",
    productName: "",
    grade: "",
    batchNo: "",
    testDate: new Date().toISOString().slice(0, 10),
    operator: "",
    shift: "",
    remarks: "",
  });
  const [valueMap, setValueMap] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    if (result && (mode === "edit" || mode === "view")) {
      setForm({
        system: result.system || "QC_SITE_AREA",
        module: result.module || "RESIN",
        productCategory: result.productCategory || "",
        productName: result.productName || "",
        grade: result.grade || "",
        batchNo: result.batchNo || "",
        testDate: result.testDate ? String(result.testDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        operator: result.operator || "",
        shift: result.shift || "",
        remarks: result.remarks || "",
      });
      const map: Record<string, unknown> = {};
      (result.values || []).forEach((v) => {
        const testId = typeof v.test === "string" ? v.test : v.test?._id;
        if (testId) map[testId] = v.value ?? "";
      });
      setValueMap(map);
    } else if (mode === "create") {
      setForm({
        system: "QC_SITE_AREA",
        module: "RESIN",
        productCategory: "Epoxy Resin",
        productName: "",
        grade: "",
        batchNo: "",
        testDate: new Date().toISOString().slice(0, 10),
        operator: "",
        shift: "",
        remarks: "",
      });
      setValueMap({});
    }
  }, [open, mode, result]);

  const visibleTests = useMemo(() => filterTestsForModule(tests, form.module), [tests, form.module]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readonly) return;
    await onSave(form, valueMap);
  };

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <article className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            {result ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Batch {result.batchNo} · {result.status}
                {result.status === "rejected" && result.rejectionReason ? ` · ${result.rejectionReason}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Module</span>
              <select
                disabled={readonly}
                value={form.module}
                onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))}
                className={QC_MODAL_FIELD_CLASS}
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Product category</span>
              <input
                readOnly={readonly}
                value={form.productCategory}
                onChange={(e) => setForm((p) => ({ ...p, productCategory: e.target.value }))}
                className={QC_MODAL_FIELD_CLASS}
              />
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Product / material name</span>
              <input
                readOnly={readonly}
                value={form.productName}
                onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
                placeholder="Material or product name"
                className={QC_MODAL_FIELD_CLASS}
              />
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Grade</span>
              <input
                readOnly={readonly}
                value={form.grade}
                onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
                className={QC_MODAL_FIELD_CLASS}
              />
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Batch no.</span>
              <input
                readOnly={readonly}
                required={!readonly}
                value={form.batchNo}
                onChange={(e) => setForm((p) => ({ ...p, batchNo: e.target.value }))}
                className={QC_MODAL_FIELD_CLASS}
              />
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Test date</span>
              <input
                type="date"
                readOnly={readonly}
                value={form.testDate}
                onChange={(e) => setForm((p) => ({ ...p, testDate: e.target.value }))}
                className={QC_MODAL_FIELD_CLASS}
              />
            </label>
            <label className="text-sm block">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Operator / shift</span>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly={readonly}
                  value={form.operator}
                  onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
                  placeholder="Operator"
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 disabled:opacity-70"
                />
                <input
                  readOnly={readonly}
                  value={form.shift}
                  onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
                  placeholder="Shift"
                  className="w-24 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 disabled:opacity-70"
                />
              </div>
            </label>
          </div>

          <label className="text-sm block">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Remarks</span>
            <textarea
              readOnly={readonly}
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-900 dark:border-gray-600 disabled:opacity-70"
            />
          </label>

          <fieldset className="rounded-xl border border-gray-200 dark:border-gray-600 p-4">
            <legend className="text-sm font-bold text-gray-900 dark:text-white px-1">
              Test values ({visibleTests.length})
            </legend>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
              {visibleTests.map((t) => (
                <div key={t._id} className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2">
                  <div className="w-36 shrink-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t.code} <span className="text-gray-500">({t.unit || "—"})</span>
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{t.name}</p>
                  </div>
                  {readonly ? (
                    <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white py-2">
                      {valueMap[t._id] !== undefined && valueMap[t._id] !== "" ? String(valueMap[t._id]) : "—"}
                    </p>
                  ) : (
                    <input
                      value={valueMap[t._id] !== undefined && valueMap[t._id] !== null ? String(valueMap[t._id]) : ""}
                      onChange={(e) => setValueMap((p) => ({ ...p, [t._id]: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                      placeholder={t.dataType === "number" ? "numeric" : "value"}
                    />
                  )}
                </div>
              ))}
              {!visibleTests.length ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 col-span-2">No tests configured for this module.</p>
              ) : null}
            </div>
          </fieldset>

          {(result?.attachments || []).length > 0 ? (
            <fieldset className="rounded-xl border border-gray-200 dark:border-gray-600 p-3">
              <legend className="text-sm font-medium px-1">Attachments</legend>
              <ul className="mt-2 space-y-2">
                {(result?.attachments || []).map((a, i) => {
                  const href = fileHref(apiUrl, a.path);
                  return (
                    <li
                      key={a._id || i}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1.5"
                    >
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-sky-700 dark:text-sky-300 hover:underline flex-1 truncate"
                        >
                          {a.originalName || "Download"}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 flex-1 truncate">{a.originalName || "File"}</span>
                      )}
                      {canModifyAttachments && a._id && onReplace && onDelete ? (
                        <>
                          <label className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && a._id) onReplace(a._id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => onDelete(a._id)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}

          {canModifyAttachments && onUpload && result ? (
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-400 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-900/40">
              + Add attachment
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}

          <footer className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {readonly ? "Close" : "Cancel"}
            </button>
            {!readonly ? (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {loading ? "Saving…" : mode === "edit" ? "Save changes" : "Save draft"}
              </button>
            ) : null}
          </footer>
        </form>
      </article>
    </section>
  );
}
