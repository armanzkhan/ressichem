"use client";

import React, { useMemo, useState } from "react";
import type { ProcurementItem } from "@/lib/procurementApi";
import { SearchableSelect } from "./SearchableSelect";
import { QuickAddItemModal } from "./QuickAddItemModal";

function itemDisplayLabel(it: ProcurementItem): string {
  const code = (it.itemCode || "").trim();
  const name = (it.name || "").trim() || "Unnamed item";
  return code ? `${code} — ${name}` : name;
}

type Props = {
  value: string;
  onChange: (itemId: string) => void;
  items: ProcurementItem[];
  tradeScope: "local" | "import";
  onItemCreated?: (item: ProcurementItem) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  allowQuickAdd?: boolean;
};

export function ItemSelect({
  value,
  onChange,
  items,
  tradeScope,
  onItemCreated,
  className,
  required,
  placeholder = "Type item code or name…",
  allowQuickAdd = true,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<ProcurementItem[]>([]);

  const catalog = useMemo(() => {
    const seen = new Set(items.map((it) => it._id));
    return [...items, ...recentlyCreated.filter((it) => it._id && !seen.has(it._id))];
  }, [items, recentlyCreated]);

  const options = useMemo(
    () =>
      catalog.map((it) => ({
        value: it._id,
        label: itemDisplayLabel(it),
      })),
    [catalog]
  );

  const handleCreated = (item: ProcurementItem) => {
    if (!item?._id) return;
    setRecentlyCreated((prev) => (prev.some((x) => x._id === item._id) ? prev : [...prev, item]));
    setShowAdd(false);
    onItemCreated?.(item);
    onChange(item._id);
  };

  return (
    <>
      <SearchableSelect
        required={required}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        addLabel={allowQuickAdd ? "+ Add item…" : undefined}
        onAdd={allowQuickAdd ? () => setShowAdd(true) : undefined}
        options={options}
      />
      {showAdd && allowQuickAdd ? (
        <QuickAddItemModal
          tradeScope={tradeScope}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
}
