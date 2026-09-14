"use client";

import React, { useMemo, useState } from "react";
import type { ProcurementSupplier } from "@/lib/procurementApi";
import { SearchableSelect } from "./SearchableSelect";
import { QuickAddSupplierModal } from "./QuickAddSupplierModal";

function supplierDisplayName(s: ProcurementSupplier): string {
  return (s.name || s.companyName || "").trim() || "Unnamed supplier";
}

type Props = {
  value: string;
  onChange: (supplierId: string) => void;
  suppliers: ProcurementSupplier[];
  section: "local" | "import";
  onSupplierCreated?: (supplier: ProcurementSupplier) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  addLabel?: string;
  purpose?: "supplier" | "customer";
};

export function SupplierSelect({
  value,
  onChange,
  suppliers,
  section,
  onSupplierCreated,
  className,
  required,
  placeholder = "Type supplier name…",
  addLabel = "+ Add supplier…",
  purpose = "supplier",
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<ProcurementSupplier[]>([]);

  const catalog = useMemo(() => {
    const seen = new Set(suppliers.map((s) => s._id));
    return [...suppliers, ...recentlyCreated.filter((s) => s._id && !seen.has(s._id))];
  }, [suppliers, recentlyCreated]);

  const options = useMemo(
    () =>
      catalog.map((s) => ({
        value: s._id,
        label: supplierDisplayName(s),
      })),
    [catalog]
  );

  const handleCreated = (supplier: ProcurementSupplier) => {
    if (!supplier?._id) return;
    setRecentlyCreated((prev) => (prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]));
    setShowAdd(false);
    onSupplierCreated?.(supplier);
    onChange(supplier._id);
  };

  return (
    <>
      <SearchableSelect
        required={required}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        addLabel={addLabel}
        onAdd={() => setShowAdd(true)}
        options={options}
      />
      {showAdd ? (
        <QuickAddSupplierModal
          section={section}
          purpose={purpose}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
}
