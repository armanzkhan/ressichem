"use client";

import React, { useMemo, useState } from "react";
import type { ProcurementSupplier } from "@/lib/procurementApi";
import { SearchableSelect } from "./SearchableSelect";
import { QuickAddSupplierModal } from "./QuickAddSupplierModal";

function supplierDisplayName(s: ProcurementSupplier): string {
  return (s.name || s.companyName || "").trim() || "Unnamed supplier";
}

type Props = {
  values: string[];
  onChange: (supplierIds: string[]) => void;
  suppliers: ProcurementSupplier[];
  section: "local" | "import";
  onSupplierCreated?: (supplier: ProcurementSupplier) => void;
  required?: boolean;
  placeholder?: string;
  addLabel?: string;
};

export function SupplierMultiSelect({
  values,
  onChange,
  suppliers,
  section,
  onSupplierCreated,
  required,
  placeholder = "Type supplier name…",
  addLabel = "+ Add supplier…",
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [pickerValue, setPickerValue] = useState("");

  const selectedRecords = useMemo(
    () => values.map((id) => suppliers.find((s) => s._id === id)).filter(Boolean) as ProcurementSupplier[],
    [values, suppliers]
  );

  const availableOptions = useMemo(
    () =>
      suppliers
        .filter((s) => !values.includes(s._id))
        .map((s) => ({ value: s._id, label: supplierDisplayName(s) })),
    [suppliers, values]
  );

  const addSupplier = (id: string) => {
    if (!id || values.includes(id)) return;
    onChange([...values, id]);
    setPickerValue("");
  };

  const removeSupplier = (id: string) => {
    onChange(values.filter((v) => v !== id));
  };

  return (
    <div className="space-y-2">
      {selectedRecords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedRecords.map((s) => (
            <span
              key={s._id}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
            >
              {supplierDisplayName(s)}
              <button
                type="button"
                className="leading-none text-emerald-700 hover:text-red-600 dark:text-emerald-300"
                onClick={() => removeSupplier(s._id)}
                aria-label={`Remove ${supplierDisplayName(s)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <SearchableSelect
        value={pickerValue}
        onChange={(id) => addSupplier(id)}
        options={availableOptions}
        placeholder={placeholder}
        addLabel={addLabel}
        onAdd={() => setShowAdd(true)}
        required={required && values.length === 0}
      />
      {suppliers.length === 0 ? (
        <p className="text-xs text-gray-500">No suppliers in catalog. Use {addLabel} in the field above.</p>
      ) : null}
      {showAdd ? (
        <QuickAddSupplierModal
          section={section}
          onClose={() => setShowAdd(false)}
          onCreated={(supplier) => {
            onSupplierCreated?.(supplier);
            addSupplier(supplier._id);
          }}
        />
      ) : null}
    </div>
  );
}
