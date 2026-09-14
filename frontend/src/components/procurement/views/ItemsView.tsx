"use client";

import React, { useCallback, useEffect, useState } from "react";
import { procurementApi, type ProcurementItem, type ProcurementSupplier } from "@/lib/procurementApi";
import { Alert, Field, FormLabel, LoadingText, Modal, PageShell, ProcurementSearchInput, Table, procurementControlClass } from "@/components/procurement/procurement-ui";
import { BulkImportModal } from "@/components/procurement/BulkImportModal";
import { DEFAULT_ITEM_UNIT } from "@/lib/procurementOptions";
import { UnitSelect } from "@/components/procurement/UnitSelect";
import { ItemCategorySelect } from "@/components/procurement/ItemCategorySelect";
import { filterItemsBySection, pageTitle } from "@/lib/procurementScope";
import { recordTotalLabel } from "@/lib/procurementRecordSummary";

const emptyForm = (): { name: string; hsCode: string; unit: string; category: string } => ({
  name: "",
  hsCode: "",
  unit: DEFAULT_ITEM_UNIT,
  category: "",
});

type Props = { section: "local" | "import" };

export function ItemsView({ section }: Props) {
  const [rows, setRows] = useState<ProcurementItem[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [itemsRes, supRes] = await Promise.all([
        procurementApi.listItems({
          ...(search ? { search } : {}),
          tradeScope: section,
        }),
        procurementApi.listSuppliers(),
      ]);
      setRows(filterItemsBySection(itemsRes.data || [], section));
      setSuppliers(supRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [search, section]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form, tradeScope: section };
      if (editingId) await procurementApi.updateItem(editingId, body);
      else await procurementApi.createItem(body);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const supplierName = (row: ProcurementItem) => {
    const ps = row.preferredSupplier;
    if (!ps) return "—";
    if (typeof ps === "string") return suppliers.find((s) => s._id === ps)?.name || "—";
    return ps.name;
  };

  const openItem = (item: ProcurementItem) => {
    setEditingId(item._id);
    setEditingCode(item.itemCode);
    setForm({
      name: item.name,
      hsCode: item.hsCode || "",
      unit: item.unit || DEFAULT_ITEM_UNIT,
      category: item.category || "",
    });
    setShowForm(true);
  };

  return (
    <PageShell
      title={pageTitle(section, "items")}
      summary={loading ? undefined : recordTotalLabel(rows.length, "item", "items", Boolean(search.trim()))}
      onBulkImport={() => setShowBulkImport(true)}
      onAdd={() => {
        setEditingId(null);
        setEditingCode("");
        setForm(emptyForm());
        setShowForm(true);
      }}
    >
      {error ? <Alert message={error} /> : null}
      <ProcurementSearchInput placeholder="Search code or name..." value={search} onChange={setSearch} />
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          onRowClick={(index) => openItem(rows[index])}
          headers={["Code", "Name", "HS code", "Unit", "Category", "Preferred supplier", ""]}
          rows={rows.map((r) => [
            r.itemCode,
            r.name,
            r.hsCode || "—",
            r.unit || DEFAULT_ITEM_UNIT,
            r.category || "—",
            supplierName(r),
            <span key={r._id} className="flex gap-2">
              <button type="button" className="text-blue-600 text-xs dark:text-blue-300" onClick={(e) => {
                e.stopPropagation();
                openItem(r);
              }}>Edit</button>
              <button type="button" className="text-red-600 text-xs" onClick={async (e) => {
                e.stopPropagation();
                if (!confirm("Deactivate this item?")) return;
                await procurementApi.deleteItem(r._id);
                await load();
              }}>Deactivate</button>
            </span>,
          ])}
        />
      )}
      {showForm ? (
        <Modal title={editingId ? "Edit item" : "New item"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editingId ? (
              <FormLabel className="sm:col-span-2">
                Item code
                <input
                  readOnly
                  value={editingCode}
                  className={`${procurementControlClass} mt-1 bg-blue-50`}
                />
              </FormLabel>
            ) : (
              <p className="text-sm text-blue-600 sm:col-span-2">
                Item code will be assigned automatically (e.g. ITM-2026-00001).
              </p>
            )}
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="HS code" value={form.hsCode} onChange={(v) => setForm({ ...form, hsCode: v })} />
            <FormLabel>
              Unit
              <div className="mt-1">
                <UnitSelect
                  required
                  value={form.unit}
                  onChange={(unit) => setForm({ ...form, unit })}
                />
              </div>
            </FormLabel>
            <FormLabel>
              Category
              <ItemCategorySelect
                required
                value={form.category}
                onChange={(category) => setForm({ ...form, category })}
              />
            </FormLabel>
            <footer className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">{saving ? "Saving..." : "Save"}</button>
            </footer>
          </form>
        </Modal>
      ) : null}
      <BulkImportModal
        entity="items"
        section={section}
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={load}
      />
    </PageShell>
  );
}
