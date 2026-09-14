"use client";

import React, { useState } from "react";
import { procurementApi, type ProcurementItem } from "@/lib/procurementApi";
import { DEFAULT_ITEM_UNIT } from "@/lib/procurementOptions";
import { Field, Modal } from "@/components/procurement/procurement-ui";
import { UnitSelect } from "./UnitSelect";
import { ItemCategorySelect } from "./ItemCategorySelect";

type Props = {
  tradeScope: "local" | "import";
  onClose: () => void;
  onCreated: (item: ProcurementItem) => void;
};

export function QuickAddItemModal({ tradeScope, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [unit, setUnit] = useState<string>(DEFAULT_ITEM_UNIT);
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Item name is required");
      return;
    }
    if (!category) {
      setError("Category is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await procurementApi.createItem({
        name: name.trim(),
        hsCode: hsCode.trim(),
        unit,
        category,
        tradeScope,
      });
      const item = res.data as ProcurementItem;
      if (item?._id) onCreated(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add item" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Field label="Name" value={name} onChange={setName} required />
        <Field label="HS code" value={hsCode} onChange={setHsCode} />
        <label className="text-sm block">
          Unit
          <div className="mt-1">
            <UnitSelect value={unit} onChange={setUnit} allowEmpty={false} />
          </div>
        </label>
        <label className="text-sm block">
          Category
          <ItemCategorySelect required value={category} onChange={setCategory} />
        </label>
        <footer className="flex justify-end gap-2 pt-2">
          <button type="button" className="px-4 py-2 rounded-lg border" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
            {saving ? "Saving…" : "Add item"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
