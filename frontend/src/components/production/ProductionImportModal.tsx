"use client";

import React, { useState } from "react";
import { Modal } from "@/components/procurement/procurement-ui";
import { procurementFieldClass, procurementSecondaryButtonClass } from "@/components/procurement/procurementTheme";
import { DEPARTMENT_META, productionApi, type ProductionDepartment, type ProductionFactory } from "@/lib/productionApi";

const COLUMN_HELP: Record<ProductionDepartment, string> = {
  zrs: "Loading Date, Grade, Batch #, Reactor, Out Put, InPut",
  bfs: "Packing Date, Product Grade, Resin Batch No., Hardener Batdh No., Kit Size (KG), Kit Quantity, Total Output (KG)",
  lms: "Loading Date, Product Grade, Batch #, Machine, Input, Output",
  drymix: "Loading Date, Product Grade, Batch #, Machine, Input, Output",
};

export function ProductionImportModal({
  department,
  initialFactory = "",
  onClose,
  onImported,
}: {
  department: ProductionDepartment;
  initialFactory?: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [factory, setFactory] = useState<ProductionFactory | "">(
    initialFactory === "hub" || initialFactory === "site" || initialFactory === "lahore" ? initialFactory : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [rowErrors, setRowErrors] = useState<{ row: number; message: string }[]>([]);

  const download = (format: "xlsx" | "csv") => {
    setError("");
    productionApi.importTemplate(department, format).catch((err) => setError(err instanceof Error ? err.message : "Download failed"));
  };

  const upload = async () => {
    if (!factory) {
      setError("Select the factory these rows belong to");
      return;
    }
    if (!file) {
      setError("Choose a CSV or Excel file");
      return;
    }
    setBusy(true);
    setError("");
    setResult("");
    setRowErrors([]);
    try {
      const res = await productionApi.importFile(department, file, factory);
      setResult(`${res.createdCount} record${res.createdCount === 1 ? "" : "s"} added. ${res.skippedCount} skipped.`);
      setRowErrors(res.errors || []);
      if (res.createdCount) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Import ${DEPARTMENT_META[department].label}`} onClose={onClose} wide>
      <div className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
        <p>Use the {DEPARTMENT_META[department].label} columns from the Excel template. One row is one batch. Blank rows are ignored.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Columns: {COLUMN_HELP[department]}</li>
          <li>The template has no factory column. Choose Hub, SITE, or Lahore below before uploading.</li>
          <li>Dates can be a spreadsheet date, YYYY-MM-DD, or DD/MM/YYYY.</li>
          {department === "bfs" ? <li>Total output is kit size × kit quantity.</li> : null}
          <li>A batch that already exists on that date is skipped.</li>
        </ul>
        <label className="block">
          <span className="mb-1 block font-medium">Factory</span>
          <select className={procurementFieldClass} value={factory} onChange={(e) => setFactory(e.target.value as ProductionFactory | "")}>
            <option value="">Select factory</option>
            <option value="hub">Hub</option>
            <option value="site">SITE</option>
            <option value="lahore">Lahore</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={procurementSecondaryButtonClass} onClick={() => download("xlsx")}>
            Download Excel template
          </button>
          <button type="button" className={procurementSecondaryButtonClass} onClick={() => download("csv")}>
            Download CSV template
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block font-medium">File</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {error ? <p className="text-red-600">{error}</p> : null}
        {result ? <p className="font-medium">{result}</p> : null}
        {rowErrors.length ? (
          <ul className="max-h-40 space-y-1 overflow-auto text-red-700">
            {rowErrors.slice(0, 20).map((item) => (
              <li key={`${item.row}-${item.message}`}>
                Row {item.row}: {item.message}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={procurementSecondaryButtonClass} onClick={onClose}>
            Close
          </button>
          <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={busy} onClick={upload}>
            {busy ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
