"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  type ProcurementItem,
  type ProcurementSupplier,
  type PurchaseDocument,
} from "@/lib/procurementApi";
import {
  applySupplierToForm,
  commercialFormToPayload,
  computeLineSubtotal,
  computeTaxAmountFromSaleTax,
  docToCommercialForm,
  emptyCommercialForm,
  type CommercialDocumentForm,
} from "@/lib/procurementDocumentTypes";
import { openProcurementPrint } from "@/lib/procurementPrint";
import { DocumentLineEditor } from "@/components/procurement/DocumentLineEditor";
import { SupplierMultiSelect } from "@/components/procurement/SupplierMultiSelect";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import {
  ProcurementCommercialForm,
  TermsConditionsField,
} from "@/components/procurement/ProcurementCommercialForm";
import { Alert, FormLabel, LoadingText, Modal, PageShell, StatusBadge, Table, procurementFieldClass } from "@/components/procurement/procurement-ui";
import { BulkImportModal } from "@/components/procurement/BulkImportModal";
import {
  filterItemsBySection,
  filterPurchaseOrdersBySection,
  filterSuppliersBySection,
  pageTitle,
  purchaseTypeForSection,
} from "@/lib/procurementScope";
import { recordTotalLabel } from "@/lib/procurementRecordSummary";
import { RESSICHEM_BUYER_DEFAULT } from "@/lib/procurementDocumentTypes";
import { isProcurementAdmin } from "@/lib/procurementAccess";
import { formatProcurementAmount } from "@/lib/procurementMoney";

function supplierLabel(s: ProcurementSupplier | string | undefined, suppliers: ProcurementSupplier[]) {
  if (!s) return "-";
  if (typeof s === "string") return suppliers.find((x) => x._id === s)?.name || s;
  return s.name;
}

function poSuppliersLabel(row: PurchaseDocument, suppliers: ProcurementSupplier[]) {
  if (row.suppliers?.length) {
    return row.suppliers.map((s) => supplierLabel(s, suppliers)).join(", ");
  }
  return supplierLabel(row.supplier, suppliers);
}

function formatPoListDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

type Props = { section: "local" | "import" };

export function PurchaseOrdersView({ section }: Props) {
  const lockedPurchaseType = purchaseTypeForSection(section);
  const [rows, setRows] = useState<PurchaseDocument[]>([]);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingPo, setCreatingPo] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CommercialDocumentForm>(emptyCommercialForm());
  const [canDelete, setCanDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [receivePo, setReceivePo] = useState<PurchaseDocument | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    setCanDelete(isProcurementAdmin());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, itemsRes, supRes] = await Promise.all([
        procurementApi.listPurchaseOrders({ purchaseType: purchaseTypeForSection(section) }),
        procurementApi.listItems({ tradeScope: section }),
        procurementApi.listSuppliers(),
      ]);
      setRows(filterPurchaseOrdersBySection(res.data || [], section));
      setItems(filterItemsBySection(itemsRes.data || [], section));
      setSuppliers(filterSuppliersBySection(supRes.data || [], section));
      setSelectedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setCreatingPo(true);
    const isLocal = lockedPurchaseType === "local";
    setForm({
      ...emptyCommercialForm(),
      status: "draft",
      purchaseType: lockedPurchaseType,
      currency: isLocal ? "PKR" : "USD",
      exchangeRate: "1",
      placeOfDelivery: isLocal ? "Karachi, Pakistan" : "",
      billTo: isLocal ? { ...RESSICHEM_BUYER_DEFAULT } : emptyCommercialForm().billTo,
      shipTo: isLocal ? { ...RESSICHEM_BUYER_DEFAULT } : emptyCommercialForm().shipTo,
    });
    setShowForm(true);
  };

  const openEdit = async (id: string) => {
    setFormLoading(true);
    setError("");
    try {
      const res = await procurementApi.getPurchaseOrder(id);
      const loaded = docToCommercialForm(res.data as unknown as Record<string, unknown>, "draft");
      setForm({ ...loaded, purchaseType: lockedPurchaseType });
      setEditingId(id);
      setCreatingPo(false);
      setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchase order");
    } finally {
      setFormLoading(false);
    }
  };

  const openReceive = async (id: string) => {
    setError("");
    try {
      const res = await procurementApi.getPurchaseOrder(id);
      const po = res.data;
      const qtys: Record<string, string> = {};
      for (const line of po.items || []) {
        if (!line._id) continue;
        const remaining = Math.max(0, (Number(line.quantity) || 0) - (Number(line.receivedQuantity) || 0));
        qtys[line._id] = remaining > 0 ? String(remaining) : "0";
      }
      setReceivePo(po);
      setReceiveQtys(qtys);
      setReceiveNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open receive");
    }
  };

  const submitReceive = async () => {
    if (!receivePo) return;
    setReceiving(true);
    setError("");
    try {
      const items = Object.entries(receiveQtys)
        .map(([poLineId, qty]) => ({
          poLineId,
          receivedQuantity: Number(qty) || 0,
        }))
        .filter((row) => row.receivedQuantity > 0);
      await procurementApi.receivePurchaseOrder(receivePo._id, {
        notes: receiveNotes,
        items,
      });
      setReceivePo(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Receive failed");
    } finally {
      setReceiving(false);
    }
  };

  const printDoc = async (id: string) => {
    try {
      await openProcurementPrint(`/api/procurement/purchase-orders/${id}/print`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Print failed");
    }
  };

  const deletePo = async (id: string, label: string) => {
    if (!window.confirm(`Delete purchase order ${label}? This cannot be undone.`)) return;
    setError("");
    try {
      await procurementApi.deletePurchaseOrder(id);
      if (editingId === id) setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : rows.map((r) => r._id));
  };

  const bulkDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected purchase order(s)? This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError("");
    try {
      await procurementApi.bulkDeletePurchaseOrders(selectedIds);
      if (editingId && selectedIds.includes(editingId)) setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const selectedSupplierIds = form.suppliers.length ? form.suppliers : form.supplier ? [form.supplier] : [];
  const selectedSupplierRecords = suppliers.filter((s) => selectedSupplierIds.includes(s._id));

  const validateForm = () => {
    if (!selectedSupplierIds.length) {
      setError("Select at least one supplier");
      return false;
    }
    if (selectedSupplierIds.length > 1 && form.lines.some((l) => !l.supplier)) {
      setError("Assign a supplier to each line item");
      return false;
    }
    if (form.lines.length === 0) {
      setError("Add at least one line item");
      return false;
    }
    if (lockedPurchaseType === "foreign" && form.lines.some((l) => !l.hsCode?.trim())) {
      setError("Import PO: enter HS code on every line (or set HS code on items in catalog)");
      return false;
    }
    return true;
  };

  const savePurchaseOrder = async (options: { closeAfterSave: boolean }) => {
    if (!validateForm()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...commercialFormToPayload(form),
        purchaseType: lockedPurchaseType,
        status: form.status || "draft",
      };
      if (editingId) {
        await procurementApi.updatePurchaseOrder(editingId, payload);
      } else {
        const created = await procurementApi.createPurchaseOrder(payload);
        const createdId = (created as { data?: { _id?: string } })?.data?._id;
        if (createdId) setEditingId(createdId);
      }
      if (options.closeAfterSave) setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePurchaseOrder({ closeAfterSave: true });
  };

  const applySupplierSelection = async (nextIds: string[]) => {
    const uniqueIds = nextIds.filter((id, i, arr) => arr.indexOf(id) === i);
    const primaryId = uniqueIds[0] || "";
    const clearedLines =
      uniqueIds.length <= 1
        ? form.lines.map((line) => {
            const { supplier: _s, supplierName: _n, ...rest } = line;
            return rest;
          })
        : form.lines.map((line) =>
            line.supplier && !uniqueIds.includes(line.supplier) ? { ...line, supplier: "", supplierName: "" } : line
          );
    let nextForm: CommercialDocumentForm = {
      ...form,
      suppliers: uniqueIds,
      supplier: primaryId,
      lines: clearedLines,
    };
    if (primaryId) {
      let sup = suppliers.find((s) => s._id === primaryId);
      try {
        // Always re-fetch so banking saved from a previous PO is on the master record.
        const res = await procurementApi.getSupplier(primaryId);
        if (res.data) {
          sup = res.data;
          setSuppliers((prev) => {
            const idx = prev.findIndex((s) => s._id === primaryId);
            if (idx < 0) return [...prev, res.data];
            const copy = [...prev];
            copy[idx] = res.data;
            return copy;
          });
        }
      } catch {
        /* keep cached supplier */
      }
      nextForm = applySupplierToForm(nextForm, sup, lockedPurchaseType);
    }
    setForm(nextForm);
  };

  const handleSupplierCreated = (supplier: ProcurementSupplier) => {
    setSuppliers((prev) => (prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]));
    const currentIds = form.suppliers.length ? form.suppliers : form.supplier ? [form.supplier] : [];
    const nextIds = currentIds.includes(supplier._id) ? currentIds : [...currentIds, supplier._id];
    applySupplierSelection(nextIds);
  };

  return (
    <PageShell
      title={pageTitle(section, "po")}
      summary={loading ? undefined : recordTotalLabel(rows.length, "purchase order", "purchase orders")}
      onBulkImport={() => setShowBulkImport(true)}
      onAdd={openCreate}
    >
      {error ? <Alert message={error} /> : null}
      {canDelete && selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">{selectedIds.length} selected</p>
          <button
            type="button"
            disabled={bulkDeleting}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
            onClick={bulkDeleteSelected}
          >
            {bulkDeleting ? "Deleting..." : "Bulk delete"}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-sm hover:bg-blue-50"
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </button>
        </div>
      ) : null}
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          onRowClick={(index) => openEdit(rows[index]._id)}
          headers={
            canDelete
              ? [
                  <input
                    key="select-all"
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all purchase orders"
                    className="h-4 w-4 accent-blue-600"
                    onChange={toggleSelectAll}
                  />,
                  "PO #",
                  "PO Date",
                  "Type",
                  "Supplier",
                  "Status",
                  "Currency",
                  "Total",
                  "Actions",
                ]
              : ["PO #", "PO Date", "Type", "Supplier", "Status", "Currency", "Total", "Actions"]
          }
          rows={rows.map((r) => {
            const actionCell = (
              <span key={`act-${r._id}`} className="flex flex-wrap gap-2">
                <button type="button" className="text-blue-600 text-xs dark:text-blue-300" onClick={(e) => { e.stopPropagation(); openEdit(r._id); }}>
                  Edit
                </button>
                <button type="button" className="text-blue-700 text-xs dark:text-blue-300" onClick={(e) => { e.stopPropagation(); printDoc(r._id); }}>
                  Print
                </button>
                {r.status === "draft" ? (
                  <button
                    type="button"
                    className="text-indigo-600 text-xs dark:text-indigo-300"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await procurementApi.issuePurchaseOrder(r._id);
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Issue failed");
                      }
                    }}
                  >
                    Issue
                  </button>
                ) : null}
                {r.status === "issued" || r.status === "partial" ? (
                  <button
                    type="button"
                    className="text-emerald-700 text-xs dark:text-emerald-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      openReceive(r._id);
                    }}
                  >
                    Receive
                  </button>
                ) : null}
                {r.status === "received" || r.status === "partial" ? (
                  <button
                    type="button"
                    className="text-slate-600 text-xs dark:text-slate-300"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await procurementApi.closePurchaseOrder(r._id);
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Close failed");
                      }
                    }}
                  >
                    Close
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    className="text-red-600 text-xs dark:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePo(r._id, r.poNumber || "this PO");
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </span>
            );

            const baseCells = [
              r.poNumber || "-",
              formatPoListDate(r.documentDate),
              r.purchaseType === "local" ? "Local" : "Import",
              poSuppliersLabel(r, suppliers),
              <StatusBadge key={`st-${r._id}`} status={r.status} />,
              r.currency || "USD",
              formatProcurementAmount(r.total ?? 0),
              actionCell,
            ];

            if (!canDelete) return baseCells;

            return [
              <input
                key={`chk-${r._id}`}
                type="checkbox"
                checked={selectedIds.includes(r._id)}
                aria-label={`Select ${r.poNumber || r._id}`}
                className="h-4 w-4 accent-blue-600"
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelected(r._id)}
              />,
              ...baseCells,
            ];
          })}
        />
      )}
      {showForm ? (
        <Modal
          wide
          title={
            editingId
              ? lockedPurchaseType === "local"
                ? "Edit local purchase order"
                : "Edit import purchase order"
              : lockedPurchaseType === "local"
                ? "New local purchase order"
                : "New import purchase order"
          }
          onClose={() => setShowForm(false)}
        >
          {formLoading ? (
            <LoadingText>Loading document...</LoadingText>
          ) : (
            <form onSubmit={save} className="space-y-4">
              {section === "local" ? (
                <FormLabel>
                  Supplier *
                  <div className="mt-1">
                    <SupplierSelect
                      required
                      value={form.supplier}
                      onChange={(supplierId) => applySupplierSelection(supplierId ? [supplierId] : [])}
                      suppliers={suppliers}
                      section={section}
                      onSupplierCreated={handleSupplierCreated}
                      placeholder="Type supplier name..."
                    />
                  </div>
                  {suppliers.length === 0 ? (
                    <p className="mt-1 text-xs text-blue-600">
                      No local suppliers in catalog. Use + Add supplier... in the field above.
                    </p>
                  ) : null}
                </FormLabel>
              ) : (
                <FormLabel>
                  Suppliers *
                  <div className="mt-1">
                    <SupplierMultiSelect
                      required
                      values={selectedSupplierIds}
                      onChange={applySupplierSelection}
                      suppliers={suppliers}
                      section={section}
                      onSupplierCreated={handleSupplierCreated}
                      placeholder="Type supplier name..."
                    />
                  </div>
                  {selectedSupplierIds.length > 1 ? (
                    <p className="mt-2 text-xs text-blue-700">
                      Multiple suppliers: assign each line item to a supplier below.
                    </p>
                  ) : null}
                </FormLabel>
              )}
              <ProcurementCommercialForm
                form={form}
                onChange={setForm}
                showPoFields
                lockPurchaseType={lockedPurchaseType}
                showTermsField={false}
              />
              <DocumentLineEditor
                lines={form.lines}
                items={items}
                currency={form.currency}
                purchaseType={lockedPurchaseType}
                tradeScope={section}
                saleTax={form.saleTax}
                onItemCreated={(item) => setItems((prev) => [...prev, item])}
                selectedSuppliers={selectedSupplierRecords}
                onSupplierCreated={handleSupplierCreated}
                onChange={(lines) => {
                  const subtotal = computeLineSubtotal(lines);
                  const taxAmount = computeTaxAmountFromSaleTax(subtotal, form.saleTax);
                  setForm({ ...form, lines, taxAmount: String(taxAmount) });
                }}
              />
              <TermsConditionsField
                value={form.termsAndConditions}
                onChange={(termsAndConditions) => setForm({ ...form, termsAndConditions })}
              />
              <footer className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowForm(false)}
                >
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
                {creatingPo ? (
                  <button
                    type="button"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => savePurchaseOrder({ closeAfterSave: false })}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                ) : null}
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                  {saving ? "Saving..." : creatingPo ? "Create PO" : "Save"}
                </button>
              </footer>
            </form>
          )}
        </Modal>
      ) : null}
      {receivePo ? (
        <Modal title={`Purchase receipt — ${receivePo.poNumber || ""}`} onClose={() => setReceivePo(null)} wide>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enter quantities received for this shipment. Remaining qty is pre-filled. PO status becomes{" "}
              <strong>partial</strong> or <strong>received</strong>.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Ordered</th>
                    <th className="px-3 py-2 text-right">Already recv.</th>
                    <th className="px-3 py-2 text-right">Receive now</th>
                  </tr>
                </thead>
                <tbody>
                  {(receivePo.items || []).map((line) => {
                    const id = line._id || "";
                    const ordered = Number(line.quantity) || 0;
                    const already = Number(line.receivedQuantity) || 0;
                    return (
                      <tr key={id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2">{line.itemName || line.itemCode || "—"}</td>
                        <td className="px-3 py-2 text-right">{ordered}</td>
                        <td className="px-3 py-2 text-right">{already}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max={Math.max(0, ordered - already)}
                            step="any"
                            className={`${procurementFieldClass} max-w-[8rem] ml-auto`}
                            value={receiveQtys[id] || "0"}
                            onChange={(e) => setReceiveQtys((p) => ({ ...p, [id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <label className="block text-sm">
              <FormLabel>Notes</FormLabel>
              <input
                className={procurementFieldClass}
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setReceivePo(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={receiving}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white"
                onClick={submitReceive}
              >
                {receiving ? "Posting…" : "Post purchase receipt"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      <BulkImportModal
        entity="purchase-orders"
        section={section}
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={load}
      />
    </PageShell>
  );
}
