"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  type ProcurementPayment,
  type ProcurementSupplierInvoice,
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
import { pageTitle, purchaseTypeForSection } from "@/lib/procurementScope";
import { formatProcurementAmount } from "@/lib/procurementMoney";

type Props = { section: "local" | "import" };

export function PaymentsView({ section }: Props) {
  const [rows, setRows] = useState<ProcurementPayment[]>([]);
  const [invoices, setInvoices] = useState<ProcurementSupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierInvoice: "",
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "bank_transfer",
    reference: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const pt = purchaseTypeForSection(section);
      const [payRes, invRes] = await Promise.all([
        procurementApi.listPayments({ purchaseType: pt }),
        procurementApi.listSupplierInvoices({ purchaseType: pt }),
      ]);
      setRows(payRes.data || []);
      setInvoices((invRes.data || []).filter((i) => i.status !== "cancelled" && i.status !== "paid"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  const createPayment = async () => {
    if (!form.supplierInvoice || !form.amount) {
      setError("Select an invoice and enter amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await procurementApi.createPayment({
        supplierInvoice: form.supplierInvoice,
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        purchaseType: purchaseTypeForSection(section),
      });
      setShowForm(false);
      setForm({
        supplierInvoice: "",
        amount: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        method: "bank_transfer",
        reference: "",
        notes: "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title={pageTitle(section, "payments")}
      summary="Record payments against supplier invoices (partial or full)."
      onAdd={() => setShowForm(true)}
      addLabel="Payment"
    >
      {error ? <Alert message={error} /> : null}
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          headers={["Payment #", "Invoice #", "Supplier", "Date", "Method", "Amount", "Status"]}
          rows={rows.map((r) => {
            const inv =
              typeof r.supplierInvoice === "object" && r.supplierInvoice
                ? r.supplierInvoice.invoiceNumber || "—"
                : "—";
            const supplier =
              typeof r.supplier === "object" && r.supplier ? r.supplier.name || "—" : "—";
            return [
              r.paymentNumber,
              inv,
              supplier,
              r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "—",
              (r.method || "bank_transfer").replace(/_/g, " "),
              formatProcurementAmount(r.amount || 0),
              <StatusBadge key={`st-${r._id}`} status={r.status || "posted"} />,
            ];
          })}
        />
      )}

      {showForm ? (
        <Modal title="Record payment" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <label className="block text-sm">
              <FormLabel>Supplier invoice</FormLabel>
              <select
                className={procurementFieldClass}
                value={form.supplierInvoice}
                onChange={(e) => {
                  const inv = invoices.find((i) => i._id === e.target.value);
                  const remaining = Math.max(0, (inv?.total || 0) - (inv?.amountPaid || 0));
                  setForm((p) => ({
                    ...p,
                    supplierInvoice: e.target.value,
                    amount: remaining ? String(remaining) : p.amount,
                  }));
                }}
              >
                <option value="">Select invoice…</option>
                {invoices.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.invoiceNumber} — due {formatProcurementAmount((i.total || 0) - (i.amountPaid || 0))}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <FormLabel>Amount</FormLabel>
              <input
                type="number"
                className={procurementFieldClass}
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <FormLabel>Payment date</FormLabel>
              <input
                type="date"
                className={procurementFieldClass}
                value={form.paymentDate}
                onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <FormLabel>Method</FormLabel>
              <select
                className={procurementFieldClass}
                value={form.method}
                onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="lc">LC</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm">
              <FormLabel>Reference</FormLabel>
              <input
                className={procurementFieldClass}
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
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
                onClick={createPayment}
              >
                {saving ? "Saving…" : "Post payment"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
