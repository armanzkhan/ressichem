"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  type ProcurementSupplier,
  type ProcurementSupplierInvoice,
  type PurchaseDocument,
} from "@/lib/procurementApi";
import {
  Alert,
  FormLabel,
  LoadingText,
  Modal,
  PageShell,
  StatusBadge,
  Table,
  procurementFieldClass,
  procurementSecondaryButtonClass,
} from "@/components/procurement/procurement-ui";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import {
  filterPurchaseOrdersBySection,
  filterSuppliersBySection,
  pageTitle,
  purchaseTypeForSection,
} from "@/lib/procurementScope";
import { formatProcurementAmount } from "@/lib/procurementMoney";

type Props = { section: "local" | "import" };

export function SupplierInvoicesView({ section }: Props) {
  const [rows, setRows] = useState<ProcurementSupplierInvoice[]>([]);
  const [pos, setPos] = useState<PurchaseDocument[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier: "",
    purchaseOrder: "",
    supplierInvoiceNo: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    total: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const pt = purchaseTypeForSection(section);
      const [invRes, poRes, supRes] = await Promise.all([
        procurementApi.listSupplierInvoices({ purchaseType: pt }),
        procurementApi.listPurchaseOrders({ purchaseType: pt }),
        procurementApi.listSuppliers(),
      ]);
      setRows(invRes.data || []);
      setPos(filterPurchaseOrdersBySection(poRes.data || [], section));
      setSuppliers(filterSuppliersBySection(supRes.data || [], section));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  const createInvoice = async () => {
    if (!form.supplier) {
      setError("Select a supplier");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const selectedPo = pos.find((p) => p._id === form.purchaseOrder);
      await procurementApi.createSupplierInvoice({
        supplier: form.supplier,
        purchaseOrder: form.purchaseOrder || undefined,
        supplierInvoiceNo: form.supplierInvoiceNo,
        invoiceDate: form.invoiceDate,
        purchaseType: purchaseTypeForSection(section),
        currency: selectedPo?.currency || (section === "local" ? "PKR" : "USD"),
        total: form.total ? Number(form.total) : selectedPo?.total || 0,
        notes: form.notes,
      });
      setShowForm(false);
      setForm({
        supplier: "",
        purchaseOrder: "",
        supplierInvoiceNo: "",
        invoiceDate: new Date().toISOString().slice(0, 10),
        total: "",
        notes: "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title={pageTitle(section, "invoices")}
      summary="Match supplier invoices against purchase orders and received quantities."
      onAdd={() => setShowForm(true)}
      addLabel="Supplier invoice"
    >
      {error ? <Alert message={error} /> : null}
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          headers={["Invoice #", "Supplier inv #", "PO #", "Supplier", "Total", "Match", "Status", "Actions"]}
          rows={rows.map((r) => {
            const po =
              typeof r.purchaseOrder === "object" && r.purchaseOrder
                ? r.purchaseOrder.poNumber || "—"
                : "—";
            const supplier =
              typeof r.supplier === "object" && r.supplier ? r.supplier.name || "—" : "—";
            return [
              r.invoiceNumber,
              r.supplierInvoiceNo || "—",
              po,
              supplier,
              formatProcurementAmount(r.total || 0),
              <StatusBadge key={`m-${r._id}`} status={r.matchStatus || "unmatched"} />,
              <StatusBadge key={`s-${r._id}`} status={r.status || "draft"} />,
              <button
                key={`a-${r._id}`}
                type="button"
                className="text-indigo-600 text-xs dark:text-indigo-300"
                onClick={async () => {
                  try {
                    await procurementApi.matchSupplierInvoice(r._id);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Match failed");
                  }
                }}
              >
                Match
              </button>,
            ];
          })}
        />
      )}

      {showForm ? (
        <Modal title="New supplier invoice" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <div>
              <FormLabel>Supplier</FormLabel>
              <SupplierSelect
                section={section}
                suppliers={suppliers}
                value={form.supplier}
                onChange={(id) => setForm((p) => ({ ...p, supplier: id }))}
              />
            </div>
            <label className="block text-sm">
              <FormLabel>Link PO (optional)</FormLabel>
              <select
                className={procurementFieldClass}
                value={form.purchaseOrder}
                onChange={(e) => {
                  const po = pos.find((p) => p._id === e.target.value);
                  setForm((p) => ({
                    ...p,
                    purchaseOrder: e.target.value,
                    supplier:
                      p.supplier ||
                      (typeof po?.supplier === "object" ? po?.supplier?._id || "" : String(po?.supplier || "")),
                    total: po?.total != null ? String(po.total) : p.total,
                  }));
                }}
              >
                <option value="">Select PO…</option>
                {pos.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.poNumber} — {p.status} — {formatProcurementAmount(p.total || 0)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <FormLabel>Supplier invoice #</FormLabel>
              <input
                className={procurementFieldClass}
                value={form.supplierInvoiceNo}
                onChange={(e) => setForm((p) => ({ ...p, supplierInvoiceNo: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <FormLabel>Invoice date</FormLabel>
              <input
                type="date"
                className={procurementFieldClass}
                value={form.invoiceDate}
                onChange={(e) => setForm((p) => ({ ...p, invoiceDate: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <FormLabel>Total (leave blank to use PO total)</FormLabel>
              <input
                type="number"
                className={procurementFieldClass}
                value={form.total}
                onChange={(e) => setForm((p) => ({ ...p, total: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <FormLabel>Notes</FormLabel>
              <input
                className={procurementFieldClass}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                disabled={saving}
                onClick={createInvoice}
              >
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
