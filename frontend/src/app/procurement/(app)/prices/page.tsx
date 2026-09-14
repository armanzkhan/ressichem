"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  procurementApi,
  CURRENCIES,
  type ProcurementItem,
  type ProcurementItemPrice,
  type ProcurementSupplier,
} from "@/lib/procurementApi";
import { Alert, Field, Modal, PageShell, Table } from "@/components/procurement/procurement-ui";

export default function ProcurementPricesPage() {
  const [rows, setRows] = useState<ProcurementItemPrice[]>([]);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [filterCurrency, setFilterCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ item: "", supplier: "", currency: "USD", unitPrice: "0", minOrderQty: "1", leadTimeDays: "0" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pricesRes, itemsRes, supRes] = await Promise.all([
        procurementApi.listPrices(filterCurrency ? { currency: filterCurrency } : undefined),
        procurementApi.listItems(),
        procurementApi.listSuppliers(),
      ]);
      setRows(pricesRes.data || []);
      setItems(itemsRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, [filterCurrency]);

  useEffect(() => { load(); }, [load]);

  const itemLabel = (ref: ProcurementItem | string) => {
    if (typeof ref === "string") {
      const f = items.find((x) => x._id === ref);
      return f ? `${f.itemCode} — ${f.name}` : ref;
    }
    return ref ? `${ref.itemCode} — ${ref.name}` : "—";
  };

  const supplierLabel = (ref: ProcurementSupplier | string) => {
    if (typeof ref === "string") {
      const f = suppliers.find((x) => x._id === ref);
      return f ? `${f.supplierCode} — ${f.name}` : ref;
    }
    return ref ? `${ref.supplierCode} — ${ref.name}` : "—";
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        item: form.item,
        supplier: form.supplier,
        currency: form.currency,
        unitPrice: Number(form.unitPrice),
        minOrderQty: Number(form.minOrderQty),
        leadTimeDays: Number(form.leadTimeDays),
      };
      if (editingId) await procurementApi.updatePrice(editingId, body);
      else await procurementApi.createPrice(body);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Multi-currency prices" onAdd={() => { setEditingId(null); setForm({ item: "", supplier: "", currency: "USD", unitPrice: "0", minOrderQty: "1", leadTimeDays: "0" }); setShowForm(true); }}>
      {error ? <Alert message={error} /> : null}
      <label className="text-sm block max-w-xs">
        Filter currency
        <select className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-gray-800" value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)}>
          <option value="">All</option>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
        <Table
          headers={["Item", "Supplier", "Currency", "Unit price", "MOQ", "Lead (days)", ""]}
          rows={rows.map((r) => [
            itemLabel(r.item as ProcurementItem | string),
            supplierLabel(r.supplier as ProcurementSupplier | string),
            r.currency,
            r.unitPrice.toFixed(2),
            String(r.minOrderQty ?? 1),
            String(r.leadTimeDays ?? 0),
            <button key={r._id} type="button" className="text-blue-600 text-xs" onClick={() => {
              setEditingId(r._id);
              setForm({
                item: typeof r.item === "string" ? r.item : r.item._id,
                supplier: typeof r.supplier === "string" ? r.supplier : r.supplier._id,
                currency: r.currency,
                unitPrice: String(r.unitPrice),
                minOrderQty: String(r.minOrderQty ?? 1),
                leadTimeDays: String(r.leadTimeDays ?? 0),
              });
              setShowForm(true);
            }}>Edit</button>,
          ])}
        />
      )}
      {showForm ? (
        <Modal title={editingId ? "Edit price" : "New price"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Item
              <select required className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-gray-800" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} disabled={!!editingId}>
                <option value="">Select</option>
                {items.map((i) => <option key={i._id} value={i._id}>{i.itemCode} — {i.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Supplier
              <select required className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-gray-800" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} disabled={!!editingId}>
                <option value="">Select</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.supplierCode} — {s.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Currency
              <select className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-gray-800" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={!!editingId}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <Field label="Unit price" value={form.unitPrice} onChange={(v) => setForm({ ...form, unitPrice: v })} type="number" />
            <Field label="Min order qty" value={form.minOrderQty} onChange={(v) => setForm({ ...form, minOrderQty: v })} type="number" />
            <Field label="Lead time (days)" value={form.leadTimeDays} onChange={(v) => setForm({ ...form, leadTimeDays: v })} type="number" />
            <footer className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">{saving ? "Saving..." : "Save"}</button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
