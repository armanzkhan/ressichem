"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  type ProcurementExportRecord,
  type ProcurementSupplier,
} from "@/lib/procurementApi";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import { Alert, Field, FormLabel, LoadingText, Modal, PageShell, Table, procurementSecondaryButtonClass } from "@/components/procurement/procurement-ui";

const DOCUMENT_CATEGORIES = [
  "PFI (Proforma Invoice)",
  "Commercial Invoice",
  "Packing List",
  "Bill of Lading",
  "Air Waybill",
  "Certificate of Origin",
  "Insurance",
  "Other",
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

function customerLabel(c: ProcurementSupplier | string | undefined, suppliers: ProcurementSupplier[]) {
  if (!c) return "—";
  if (typeof c === "string") return suppliers.find((s) => s._id === c)?.name || c;
  return c.name || c.companyName || "—";
}

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-GB");
}

function openFile(path?: string) {
  if (!path) return;
  const url =
    path.startsWith("http://") || path.startsWith("https://") ? path : `${getBackendUrl()}${path}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

const emptyDocumentForm = (): {
  customer: string;
  documentCategory: DocumentCategory;
  referenceNumber: string;
  documentDate: string;
  notes: string;
  file: File | null;
} => ({
  customer: "",
  documentCategory: DOCUMENT_CATEGORIES[0],
  referenceNumber: "",
  documentDate: new Date().toISOString().slice(0, 10),
  notes: "",
  file: null,
});

export function ExportDocumentsView() {
  const [documents, setDocuments] = useState<ProcurementExportRecord[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [docRes, supRes] = await Promise.all([
        procurementApi.listExportRecords({ recordType: "document" }),
        procurementApi.listSuppliers(),
      ]);
      setDocuments(docRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentForm.customer) {
      setError("Select the export customer");
      return;
    }
    if (!documentForm.file) {
      setError("Choose a document file to upload");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", documentForm.file);
      fd.append("customer", documentForm.customer);
      fd.append("documentCategory", documentForm.documentCategory);
      if (documentForm.referenceNumber.trim()) fd.append("referenceNumber", documentForm.referenceNumber.trim());
      if (documentForm.documentDate) fd.append("documentDate", documentForm.documentDate);
      if (documentForm.notes.trim()) fd.append("notes", documentForm.notes.trim());
      await procurementApi.uploadExportDocument(fd);
      setShowDocModal(false);
      setDocumentForm(emptyDocumentForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Export — Documents Upload"
      onAdd={() => {
        setDocumentForm(emptyDocumentForm());
        setShowDocModal(true);
      }}
      addLabel="Upload document"
    >
      {error ? <Alert message={error} /> : null}

      {loading ? (
        <LoadingText />
      ) : documents.length === 0 ? (
        <section className="space-y-4 rounded-xl border border-dashed border-blue-200 px-4 py-8 text-center text-sm text-blue-600 dark:border-slate-600 dark:text-blue-300">
          <p className="text-base font-medium text-blue-800 dark:text-blue-100">No documents uploaded yet</p>
          <p>Click the button below to add commercial invoices, packing lists, BL/AWB, certificates, and other export files.</p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
            onClick={() => {
              setDocumentForm(emptyDocumentForm());
              setShowDocModal(true);
            }}
          >
            + Upload document
          </button>
        </section>
      ) : (
        <Table
          onRowClick={(index) => {
            const r = documents[index];
            if (r.sourceDocument?.path) openFile(r.sourceDocument.path);
          }}
          headers={["Ref #", "Category", "Customer ref", "Customer", "File", "Date", "Actions"]}
          rows={documents.map((r) => [
            r.recordNumber || "—",
            r.documentCategory || "—",
            r.referenceNumber || "—",
            customerLabel(r.customer, suppliers),
            r.sourceDocument?.originalName || "—",
            formatDate(r.documentDate),
            <span key={`doc-${r._id}`} className="flex flex-wrap gap-2">
              {r.sourceDocument?.path ? (
                <button
                  type="button"
                  className="text-emerald-700 text-xs dark:text-emerald-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFile(r.sourceDocument?.path);
                  }}
                >
                  View
                </button>
              ) : (
                <span className="text-xs text-gray-400 dark:text-slate-500">No file</span>
              )}
              <button
                type="button"
                className="text-red-600 text-xs dark:text-red-400"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!window.confirm("Delete this document?")) return;
                  try {
                    await procurementApi.deleteExportRecord(r._id);
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Delete failed");
                  }
                }}
              >
                Delete
              </button>
            </span>,
          ])}
        />
      )}

      {showDocModal ? (
        <Modal title="Upload document" onClose={() => setShowDocModal(false)}>
          <form onSubmit={uploadDocument} className="space-y-4">
            <FormLabel>
              Customer *
              <div className="mt-1">
                <SupplierSelect
                  required
                  value={documentForm.customer}
                  onChange={(customer) => setDocumentForm({ ...documentForm, customer })}
                  suppliers={suppliers}
                  section="import"
                  purpose="customer"
                  placeholder="Select export customer"
                  addLabel="+ Add customer…"
                  onSupplierCreated={(supplier) => {
                    setSuppliers((prev) => (prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]));
                    setDocumentForm((prev) => ({ ...prev, customer: supplier._id }));
                  }}
                />
              </div>
            </FormLabel>
            <FormLabel>
              Document type *
              <select
                required
                className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm text-blue-900 dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50"
                value={documentForm.documentCategory}
                onChange={(e) =>
                  setDocumentForm({
                    ...documentForm,
                    documentCategory: e.target.value as DocumentCategory,
                  })
                }
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormLabel>
            <Field
              label="Reference number (on document)"
              value={documentForm.referenceNumber}
              onChange={(v) => setDocumentForm({ ...documentForm, referenceNumber: v })}
              placeholder="Customer invoice / PFI / BL number"
            />
            <Field
              label="Document date"
              type="date"
              value={documentForm.documentDate}
              onChange={(v) => setDocumentForm({ ...documentForm, documentDate: v })}
            />
            <FormLabel>
              Document file *
              <input
                required
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,image/*"
                className="mt-1 w-full text-sm text-blue-800 dark:text-blue-100"
                onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })}
              />
              <span className="text-xs text-blue-600 dark:text-blue-300">PDF, Word, Excel, CSV, or image — max 25 MB</span>
            </FormLabel>
            <Field
              label="Notes"
              value={documentForm.notes}
              onChange={(v) => setDocumentForm({ ...documentForm, notes: v })}
              multiline
              rows={2}
            />
            <footer className="flex justify-end gap-2 pt-2">
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setShowDocModal(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Uploading..." : "Upload document"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
