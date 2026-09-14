"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  type ProcurementExportRecord,
  type ProcurementSupplier,
} from "@/lib/procurementApi";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import {
  emptyShipmentTrackingForm,
  ShipmentTrackingPaperForm,
  shipmentRecordToForm,
  type ShipmentTrackingFormValues,
} from "@/components/procurement/ShipmentTrackingPaperForm";
import { Alert, LoadingText, Modal, PageShell, Table, procurementSecondaryButtonClass } from "@/components/procurement/procurement-ui";

function customerLabel(c: ProcurementSupplier | string | undefined, suppliers: ProcurementSupplier[]) {
  if (!c) return "—";
  if (typeof c === "string") return suppliers.find((s) => s._id === c)?.name || c;
  return c.name;
}

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-GB");
}

export function ExportShipmentDetailsView() {
  const [shipments, setShipments] = useState<ProcurementExportRecord[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentTrackingFormValues>(emptyShipmentTrackingForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [shipRes, supRes] = await Promise.all([
        procurementApi.listExportRecords({ recordType: "shipment" }),
        procurementApi.listSuppliers(),
      ]);
      setShipments(shipRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shipment details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSupplierCreated = (supplier: ProcurementSupplier) => {
    setSuppliers((prev) => (prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]));
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyShipmentTrackingForm());
    setShowFormModal(true);
  };

  const openEdit = async (id: string) => {
    setError("");
    try {
      const res = await procurementApi.getExportRecord(id);
      const r = res.data;
      const customerId = typeof r.customer === "string" ? r.customer : r.customer?._id || "";
      setEditingId(id);
      setForm(shipmentRecordToForm(r, customerId));
      setShowFormModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shipment");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer) {
      setError("Select the export customer");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await procurementApi.updateExportShipment(editingId, { ...form });
      } else {
        await procurementApi.createExportShipment({ ...form });
      }
      setShowFormModal(false);
      setEditingId(null);
      setForm(emptyShipmentTrackingForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Delete this shipment record?")) return;
    setError("");
    try {
      await procurementApi.deleteExportRecord(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <PageShell
      title="Export — Shipment Details"
      onAdd={openNew}
      addLabel="New shipment form"
    >
      {error ? <Alert message={error} /> : null}

      <p className="text-sm text-blue-700 dark:text-blue-300">
        Create and fill the export shipment form: Shipment (vessel, ETS, ETA), and Documents (dispatch, receive,
        D.H.L. No.).
      </p>

      {loading ? (
        <LoadingText />
      ) : (
        <Table
          onRowClick={(index) => openEdit(shipments[index]._id)}
          headers={["Ref #", "Customer", "Vessel", "ETS", "ETA", "D.H.L. No.", "Actions"]}
          rows={shipments.map((r) => [
            r.recordNumber || "—",
            customerLabel(r.customer, suppliers),
            r.vesselName || "—",
            formatDate(r.ets),
            formatDate(r.eta),
            r.dhlNumber || "—",
            <span key={`ship-${r._id}`} className="flex flex-wrap gap-2">
              <button type="button" className="text-blue-600 text-xs dark:text-blue-300" onClick={(e) => { e.stopPropagation(); openEdit(r._id); }}>
                Edit
              </button>
              <button type="button" className="text-red-600 text-xs dark:text-red-400" onClick={(e) => { e.stopPropagation(); deleteRecord(r._id); }}>
                Delete
              </button>
            </span>,
          ])}
        />
      )}

      {showFormModal ? (
        <Modal
          wide
          title={editingId ? "Edit shipment details" : "New shipment details"}
          onClose={() => setShowFormModal(false)}
        >
          <form onSubmit={save} className="space-y-4">
            <ShipmentTrackingPaperForm
              form={form}
              onChange={setForm}
              customerField={
                <label className="text-sm block max-w-md mx-auto font-semibold text-blue-800 dark:text-blue-200">
                  Customer *
                  <div className="mt-1">
                    <SupplierSelect
                      required
                      value={form.customer}
                      onChange={(customer) => setForm({ ...form, customer })}
                      suppliers={suppliers}
                      section="import"
                      purpose="customer"
                      placeholder="Select export customer"
                      addLabel="+ Add customer…"
                      onSupplierCreated={(supplier) => {
                        onSupplierCreated(supplier);
                        setForm((prev) => ({ ...prev, customer: supplier._id }));
                      }}
                    />
                  </div>
                </label>
              }
            />
            <footer className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={procurementSecondaryButtonClass}
                onClick={() => setShowFormModal(false)}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Saving..." : editingId ? "Update form" : "Save form"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
