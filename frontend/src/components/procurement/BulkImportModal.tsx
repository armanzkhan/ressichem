"use client";

import React, { useState } from "react";
import {
  procurementApi,
  type ProcurementImportEntity,
  type ProcurementImportResult,
} from "@/lib/procurementApi";
import { getImportGuidelines } from "@/lib/procurementBulkImportGuidelines";
import { Alert, Modal, procurementControlClass, procurementSecondaryButtonClass } from "@/components/procurement/procurement-ui";

const ENTITY_LABELS: Record<ProcurementImportEntity, string> = {
  suppliers: "Suppliers",
  items: "Items",
  requisitions: "Purchase requisitions",
  "purchase-orders": "Purchase orders",
};

type Props = {
  entity: ProcurementImportEntity;
  section: "local" | "import";
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ImportGuidelinesPanel({
  entity,
  section,
}: {
  entity: ProcurementImportEntity;
  section: "local" | "import";
}) {
  const guidelines = getImportGuidelines(entity, section);
  const sectionName = section === "local" ? "Local" : "Import";

  return (
    <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-slate-600 dark:bg-slate-900/40">
      <header className="space-y-1">
        <h3 className="font-semibold text-blue-800 dark:text-blue-100">
          Guidelines — {ENTITY_LABELS[entity]} ({sectionName})
        </h3>
        <p className="text-blue-700 dark:text-blue-200">{guidelines.summary}</p>
      </header>

      <div>
        <h4 className="mb-1.5 font-medium text-blue-800 dark:text-blue-100">Steps</h4>
        <ol className="list-decimal space-y-1 pl-5 text-blue-800 dark:text-blue-100">
          {guidelines.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="mb-1.5 font-medium text-blue-800 dark:text-blue-100">Column reference</h4>
        <div className="max-h-48 overflow-auto rounded-lg border border-blue-100 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-blue-100/90 text-blue-900 dark:bg-slate-800 dark:text-blue-100">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Column</th>
                <th className="px-2 py-1.5 font-semibold">Required</th>
                <th className="px-2 py-1.5 font-semibold">Description</th>
                <th className="px-2 py-1.5 font-semibold">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 dark:divide-slate-700">
              {guidelines.columns.map((col) => (
                <tr key={col.column} className="text-blue-900 dark:text-blue-50">
                  <td className="px-2 py-1.5 font-mono whitespace-nowrap">{col.column}</td>
                  <td className="px-2 py-1.5">{col.required ? "Yes" : "—"}</td>
                  <td className="px-2 py-1.5">{col.description}</td>
                  <td className="px-2 py-1.5 font-mono text-blue-600 dark:text-blue-300">{col.example || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {guidelines.notes.length ? (
        <div>
          <h4 className="mb-1.5 font-medium text-blue-800 dark:text-blue-100">Notes</h4>
          <ul className="list-disc space-y-1 pl-5 text-blue-800 dark:text-blue-100">
            {guidelines.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {guidelines.warnings?.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
          <h4 className="mb-1.5 font-medium text-amber-900 dark:text-amber-100">Important</h4>
          <ul className="list-disc space-y-1 pl-5 text-amber-900 dark:text-amber-100">
            {guidelines.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {guidelines.examples?.length ? (
        <div className="space-y-3">
          <h4 className="font-medium text-blue-800 dark:text-blue-100">Examples</h4>
          {guidelines.examples.map((example, i) => (
            <div
              key={i}
              className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20"
            >
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">{example.title}</p>
              <p className="mt-1 text-emerald-800 dark:text-emerald-200">{example.description}</p>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-emerald-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-emerald-950 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-100">
                {example.rows}
              </pre>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function BulkImportModal({ entity, section, open, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState<"xlsx" | "csv" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProcurementImportResult | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);

  const reset = () => {
    setFile(null);
    setError("");
    setResult(null);
    setDownloading(null);
    setUploading(false);
    setShowGuidelines(true);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = async (format: "xlsx" | "csv") => {
    setDownloading(format);
    setError("");
    try {
      const { blob, filename } = await procurementApi.downloadImportTemplate(entity, format);
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download template");
    } finally {
      setDownloading(null);
    }
  };

  const upload = async () => {
    if (!file) {
      setError("Choose a CSV or Excel file first");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const res = await procurementApi.uploadImport(entity, section, file);
      setResult(res);
      if (res.createdCount > 0) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal title={`Bulk import — ${ENTITY_LABELS[entity]}`} onClose={handleClose} wide>
      <div className="space-y-4 text-sm text-blue-900 dark:text-blue-50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-blue-700 dark:text-blue-200">
            {section === "local" ? "Local" : "Import"} section — download a template, fill it in, then upload.
          </p>
          <button
            type="button"
            onClick={() => setShowGuidelines((v) => !v)}
            className={procurementSecondaryButtonClass}
          >
            {showGuidelines ? "Hide guidelines" : "Show guidelines"}
          </button>
        </div>

        {showGuidelines ? <ImportGuidelinesPanel entity={entity} section={section} /> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => downloadTemplate("xlsx")}
            className={procurementSecondaryButtonClass}
          >
            {downloading === "xlsx" ? "Downloading…" : "Download Excel template"}
          </button>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => downloadTemplate("csv")}
            className={procurementSecondaryButtonClass}
          >
            {downloading === "csv" ? "Downloading…" : "Download CSV template"}
          </button>
        </div>

        <label className="block space-y-2">
          <span className="font-medium text-blue-800 dark:text-blue-100">Upload file</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className={procurementControlClass}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
          />
        </label>

        {error ? <Alert message={error} /> : null}

        {result ? (
          <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-slate-600 dark:bg-slate-900/50">
            <p>
              Created <strong>{result.createdCount}</strong>
              {result.updatedCount ? (
                <>
                  {" "}
                  · Updated <strong>{result.updatedCount}</strong>
                </>
              ) : null}
              {result.skippedCount ? (
                <>
                  {" "}
                  · Skipped duplicates <strong>{result.skippedCount}</strong>
                </>
              ) : null}
              {result.failedCount ? (
                <>
                  {" "}
                  · Failed rows <strong>{result.failedCount}</strong>
                </>
              ) : null}
            </p>
            {result.created.length ? (
              <ul className="max-h-32 overflow-y-auto list-disc pl-5 text-blue-800 dark:text-blue-100">
                {result.created.slice(0, 20).map((row, i) => (
                  <li key={i}>
                    {String(row.requisitionNumber || row.poNumber || row.supplierCode || row.itemCode || row.name || row.id)}
                  </li>
                ))}
                {result.created.length > 20 ? <li>…and {result.created.length - 20} more</li> : null}
              </ul>
            ) : null}
            {result.skipped?.length ? (
              <div className="max-h-32 overflow-y-auto space-y-1 text-amber-900 dark:text-amber-100">
                {result.skipped.slice(0, 20).map((row, i) => (
                  <p key={i}>
                    Row {row.row}: {row.message}
                  </p>
                ))}
                {result.skipped.length > 20 ? <p>…and {result.skipped.length - 20} more skipped</p> : null}
              </div>
            ) : null}
            {result.failed.length ? (
              <div className="max-h-40 overflow-y-auto space-y-1 text-red-800 dark:text-red-200">
                {result.failed.slice(0, 30).map((row, i) => (
                  <p key={i}>
                    Row {row.row}: {row.message}
                  </p>
                ))}
                {result.failed.length > 30 ? <p>…and {result.failed.length - 30} more errors</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={handleClose} className={procurementSecondaryButtonClass}>
            Close
          </button>
          <button
            type="button"
            disabled={uploading || !file}
            onClick={upload}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {uploading ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
