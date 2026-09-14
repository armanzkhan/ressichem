"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  type ProcurementItem,
  type ProcurementSupplier,
  type PurchaseDocument,
} from "@/lib/procurementApi";
import {
  applyExportCustomerToForm,
  applySupplierToForm,
  commercialFormToPayload,
  docToCommercialForm,
  emptyCommercialForm,
  type CommercialDocumentForm,
} from "@/lib/procurementDocumentTypes";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { openProcurementPrint } from "@/lib/procurementPrint";
import { DocumentLineEditor } from "@/components/procurement/DocumentLineEditor";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import {
  ProcurementCommercialForm,
  TermsConditionsField,
} from "@/components/procurement/ProcurementCommercialForm";
import { Alert, Field, Modal, PageShell, StatusBadge, Table } from "@/components/procurement/procurement-ui";
import {
  filterPfiByFlow,
  filterSuppliersBySection,
  pageTitle,
  pfiFlowForPage,
  type PfiFlow,
  type TradeModule,
  type TradeSection,
} from "@/lib/procurementScope";
import { recordTotalLabel } from "@/lib/procurementRecordSummary";
import { isProcurementAdmin } from "@/lib/procurementAccess";

function supplierLabel(s: ProcurementSupplier | string | undefined, suppliers: ProcurementSupplier[]) {
  if (!s) return "—";
  if (typeof s === "string") return suppliers.find((x) => x._id === s)?.name || s;
  return s.name;
}

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-GB");
}

function openSourceFile(doc?: PurchaseDocument["sourceDocument"]) {
  if (!doc?.path) return;
  window.open(`${getBackendUrl()}${doc.path}`, "_blank", "noopener,noreferrer");
}

type Props = {
  section: TradeSection;
  module: Extract<TradeModule, "pfi" | "pfi-received">;
};

const emptyUploadForm = () => ({
  supplier: "",
  supplierPfiNumber: "",
  documentDate: new Date().toISOString().slice(0, 10),
  notes: "",
  file: null as File | null,
});

export function PfiView({ section, module }: Props) {
  const pfiFlow: PfiFlow = pfiFlowForPage(section, module)!;
  const isReceivedUpload = module === "pfi-received";
  const isImportReceived = isReceivedUpload && section === "import";
  const isExportReceived = pfiFlow === "export_received";
  const isOutgoing = pfiFlow === "export_issued";
  const uploadActionLabel = isImportReceived ? "Upload PFI & Document" : "Upload PFI";

  const [rows, setRows] = useState<PurchaseDocument[]>([]);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CommercialDocumentForm>(emptyCommercialForm());
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    setCanDelete(isProcurementAdmin());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, itemsRes, supRes] = await Promise.all([
        procurementApi.listPFI({ pfiFlow }),
        isReceivedUpload ? Promise.resolve({ data: [] }) : procurementApi.listItems({ tradeScope: "import" }),
        procurementApi.listSuppliers(),
      ]);
      setRows(filterPfiByFlow(res.data || [], pfiFlow));
      setItems(itemsRes.data || []);
      setSuppliers(
        isOutgoing || pfiFlow === "export_received"
          ? supRes.data || []
          : filterSuppliersBySection(supRes.data || [], "import")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PFI");
    } finally {
      setLoading(false);
    }
  }, [pfiFlow, isReceivedUpload, isOutgoing]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError("");
    if (isReceivedUpload) {
      setUploadForm(emptyUploadForm());
      setShowForm(true);
      return;
    }
    setEditingId(null);
    setForm({
      ...emptyCommercialForm(),
      status: "draft",
      purchaseType: "foreign",
      currency: "USD",
      portOfLoading: isOutgoing ? "Karachi, Pakistan" : "",
    });
    setShowForm(true);
  };

  const openEdit = async (id: string) => {
    setFormLoading(true);
    setError("");
    try {
      const res = await procurementApi.getPFI(id);
      setForm(docToCommercialForm(res.data as unknown as Record<string, unknown>, "draft"));
      setEditingId(id);
      setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PFI");
    } finally {
      setFormLoading(false);
    }
  };

  const printDoc = async (id: string) => {
    try {
      await openProcurementPrint(`/api/procurement/pfi/${id}/print`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Print failed");
    }
  };

  const uploadPfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.supplier) {
      setError(isExportReceived ? "Select the customer who sent this PFI" : "Select the supplier who sent this PFI");
      return;
    }
    if (!uploadForm.file) {
      setError("Choose the PFI file to upload");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", uploadForm.file);
      fd.append("supplier", uploadForm.supplier);
      fd.append("pfiFlow", pfiFlow);
      // Import received PFI numbers are assigned by the server; export received may keep a customer ref.
      if (isExportReceived && uploadForm.supplierPfiNumber.trim()) {
        fd.append("supplierPfiNumber", uploadForm.supplierPfiNumber.trim());
      }
      if (uploadForm.documentDate) fd.append("documentDate", uploadForm.documentDate);
      if (uploadForm.notes.trim()) fd.append("notes", uploadForm.notes.trim());
      await procurementApi.uploadReceivedPFI(fd);
      setShowForm(false);
      setUploadForm(emptyUploadForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier) {
      setError(isOutgoing ? "Select a customer" : "Select a supplier");
      return;
    }
    if (form.lines.length === 0) {
      setError("Add at least one line item");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...commercialFormToPayload(form),
        pfiFlow,
        purchaseType: "foreign",
      };
      if (editingId) await procurementApi.updatePFI(editingId, payload);
      else await procurementApi.createPFI(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const supplierSection = section === "local" ? "local" : "import";

  const onSupplierChange = (supplierId: string) => {
    setForm((prev) => {
      const sup = suppliers.find((s) => s._id === supplierId);
      const next = { ...prev, supplier: supplierId, suppliers: supplierId ? [supplierId] : [] };
      if (isOutgoing) return applyExportCustomerToForm(next, sup);
      return applySupplierToForm(next, sup, "foreign");
    });
  };

  const onSupplierCreated = (supplier: ProcurementSupplier) => {
    if (!supplier?._id) return;
    setSuppliers((prev) => (prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]));
    setForm((prev) => {
      const next = { ...prev, supplier: supplier._id, suppliers: [supplier._id] };
      if (isOutgoing) return applyExportCustomerToForm(next, supplier);
      return applySupplierToForm(next, supplier, "foreign");
    });
  };

  const deleteReceivedPfi = async (id: string, label: string) => {
    if (!window.confirm(`Delete this PFI upload (${label})? This cannot be undone.`)) return;
    setError("");
    try {
      await procurementApi.deletePFI(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <PageShell
      title={pageTitle(section, module)}
      summary={loading ? undefined : recordTotalLabel(rows.length, "PFI record", "PFI records")}
      onAdd={openCreate}
      addLabel={isReceivedUpload ? uploadActionLabel : isOutgoing ? "Create PFI" : "Add"}
    >
      {error ? <Alert message={error} /> : null}
      {isReceivedUpload ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isExportReceived
            ? "Upload proforma invoices received from export customers (PDF, Word, Excel, or image)."
            : "Upload proforma invoices received from foreign suppliers (PDF, Word, Excel, or image)."}
        </p>
      ) : null}
      {isOutgoing ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Issue a proforma invoice to an export customer. Printed layout matches the Ressichem export PFI format (Consignee, notify address, packing, GRADE, HS codes).
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : isReceivedUpload ? (
        <Table
          onRowClick={(index) => {
            const r = rows[index];
            if (r.sourceDocument?.path) openSourceFile(r.sourceDocument);
          }}
          headers={
            isExportReceived
              ? ["Our ref #", "Customer PFI #", "Customer", "File", "Date", "Status", "Actions"]
              : ["PFI #", "Supplier", "File", "Date", "Status", "Actions"]
          }
          rows={rows.map((r) => {
            const actions = (
              <span key={`act-${r._id}`} className="flex flex-wrap gap-2">
                {r.sourceDocument?.path ? (
                  <button
                    type="button"
                    className="text-emerald-700 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSourceFile(r.sourceDocument);
                    }}
                  >
                    View file
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">No file</span>
                )}
                {canDelete && r.status !== "converted" ? (
                  <button
                    type="button"
                    className="text-red-600 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReceivedPfi(r._id, r.pfiNumber || r.quoteNumber || "record");
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </span>
            );
            if (isExportReceived) {
              return [
                r.pfiNumber || "—",
                r.quoteNumber || "—",
                supplierLabel(r.supplier, suppliers),
                r.sourceDocument?.originalName || "—",
                formatDate(r.documentDate as string | undefined),
                <StatusBadge key={`st-${r._id}`} status={r.status} />,
                actions,
              ];
            }
            return [
              r.pfiNumber || r.quoteNumber || "—",
              supplierLabel(r.supplier, suppliers),
              r.sourceDocument?.originalName || "—",
              formatDate(r.documentDate as string | undefined),
              <StatusBadge key={`st-${r._id}`} status={r.status} />,
              actions,
            ];
          })}
        />
      ) : (
        <Table
          onRowClick={(index) => openEdit(rows[index]._id)}
          headers={["PFI #", "Party", "Status", "Currency", "Total", "Actions"]}
          rows={rows.map((r) => [
            r.pfiNumber || "—",
            supplierLabel(r.supplier, suppliers),
            <StatusBadge key={`st-${r._id}`} status={r.status} />,
            r.currency || "USD",
            (r.total ?? 0).toFixed(2),
            <span key={`act-${r._id}`} className="flex flex-wrap gap-2">
              <button type="button" className="text-blue-600 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(r._id); }}>
                Edit
              </button>
              <button type="button" className="text-emerald-700 text-xs" onClick={(e) => { e.stopPropagation(); printDoc(r._id); }}>
                Print
              </button>
              {r.sourceDocument?.path ? (
                <button type="button" className="text-emerald-700 text-xs" onClick={(e) => { e.stopPropagation(); openSourceFile(r.sourceDocument); }}>
                  View file
                </button>
              ) : null}
              {section === "import" && r.status !== "converted" ? (
                <button
                  type="button"
                  className="text-indigo-600 text-xs"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await procurementApi.convertPFIToPO(r._id);
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Convert failed");
                    }
                  }}
                >
                  Convert to PO
                </button>
              ) : null}
            </span>,
          ])}
        />
      )}
      {showForm && isReceivedUpload ? (
        <Modal
          title={isExportReceived ? "Upload received export PFI" : "Upload received PFI"}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={uploadPfi} className="space-y-4">
            <label className="text-sm block">
              {isExportReceived ? "Customer *" : "Supplier *"}
              <div className="mt-1">
                <SupplierSelect
                  required
                  value={uploadForm.supplier}
                  onChange={(supplier) => setUploadForm({ ...uploadForm, supplier })}
                  suppliers={suppliers}
                  section={supplierSection}
                  purpose={isExportReceived ? "customer" : "supplier"}
                  placeholder={isExportReceived ? "Select customer" : "Select supplier"}
                  addLabel={isExportReceived ? "+ Add customer…" : "+ Add supplier…"}
                  onSupplierCreated={(supplier) => {
                    if (!supplier?._id) return;
                    setSuppliers((prev) => (prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]));
                    setUploadForm((prev) => ({ ...prev, supplier: supplier._id }));
                  }}
                />
              </div>
            </label>
            {isExportReceived ? (
              <Field
                label="Customer PFI number"
                value={uploadForm.supplierPfiNumber}
                onChange={(v) => setUploadForm({ ...uploadForm, supplierPfiNumber: v })}
                placeholder="Reference from customer document"
              />
            ) : (
              <label className="text-sm block">
                Supplier PFI number
                <input
                  readOnly
                  value="Assigned automatically on upload"
                  className="mt-1 w-full rounded border px-3 py-2 text-sm bg-blue-50 text-blue-800 dark:bg-slate-800 dark:text-blue-100"
                />
                <span className="text-xs text-gray-500">System assigns the next PFI number (e.g. PFI-2026-00008).</span>
              </label>
            )}
            <Field
              label="PFI date"
              value={uploadForm.documentDate}
              onChange={(v) => setUploadForm({ ...uploadForm, documentDate: v })}
              type="date"
            />
            <label className="text-sm block">
              PFI file *
              <input
                required
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/*"
                className="mt-1 w-full text-sm"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
              />
              <span className="text-xs text-gray-500">PDF, Word, Excel, or image — max 25 MB</span>
            </label>
            <Field
              label="Notes"
              value={uploadForm.notes}
              onChange={(v) => setUploadForm({ ...uploadForm, notes: v })}
              multiline
              rows={2}
            />
            <footer className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Uploading..." : uploadActionLabel}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
      {showForm && !isReceivedUpload ? (
        <Modal
          wide
          title={editingId ? "Edit PFI" : isOutgoing ? "New export PFI" : "Register received PFI"}
          onClose={() => setShowForm(false)}
        >
          {formLoading ? (
            <p className="text-sm text-gray-500">Loading document...</p>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <label className="text-sm block">
                {isOutgoing ? "Buyer / customer" : "Supplier"}
                <div className="mt-1">
                  <SupplierSelect
                    required
                    value={form.supplier}
                    onChange={onSupplierChange}
                    suppliers={suppliers}
                    section={supplierSection}
                    purpose={isOutgoing ? "customer" : "supplier"}
                    placeholder={isOutgoing ? "Select customer" : "Select supplier"}
                    addLabel={isOutgoing ? "+ Add customer…" : "+ Add supplier…"}
                    onSupplierCreated={onSupplierCreated}
                  />
                </div>
              </label>
              <ProcurementCommercialForm
                form={form}
                onChange={setForm}
                showPfiFields
                isExportPfi={isOutgoing}
                showTermsField={false}
                showNotesField={false}
              />
              <DocumentLineEditor
                lines={form.lines}
                items={items}
                currency={form.currency}
                purchaseType="foreign"
                lineContext={isOutgoing ? "export" : "import"}
                tradeScope="import"
                onItemCreated={(item) => setItems((prev) => [...prev, item])}
                onChange={(lines) => setForm({ ...form, lines })}
              />
              <TermsConditionsField
                value={form.termsAndConditions}
                onChange={(termsAndConditions) => setForm({ ...form, termsAndConditions })}
                placeholder={
                  isOutgoing ? "Printed at the end of the export PFI" : "Printed at the end of the PFI"
                }
              />
              <label className="text-xs block">
                Notes
                <textarea
                  className="mt-0.5 w-full rounded border px-2 py-1.5 dark:bg-gray-800"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              <footer className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                {editingId ? (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => printDoc(editingId)}
                  >
                    Print preview
                  </button>
                ) : null}
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                  {saving ? "Saving..." : editingId ? "Update PFI" : "Create PFI"}
                </button>
              </footer>
            </form>
          )}
        </Modal>
      ) : null}
    </PageShell>
  );
}
