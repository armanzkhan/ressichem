"use client";

import { useMemo, useState } from "react";

/**
 * Shared selection + delete helpers for QC Hub list tables.
 */
export function useHubRowSelection<T extends { _id: string }>(rows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map((r) => r._id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedList,
    allSelected,
    someSelected,
    toggleOne,
    toggleAll,
    clearSelection,
    setSelectedIds,
  };
}

type HubDeleteBarProps = {
  selectedCount: number;
  deleting?: boolean;
  onBulkDelete: () => void;
  label?: string;
};

export function HubBulkDeleteButton({
  selectedCount,
  deleting,
  onBulkDelete,
  label = "Delete selected",
}: HubDeleteBarProps) {
  if (selectedCount <= 0) return null;
  return (
    <button
      type="button"
      disabled={deleting}
      onClick={onBulkDelete}
      className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
    >
      {deleting ? "Deleting…" : `${label} (${selectedCount})`}
    </button>
  );
}

type HubDeleteCellProps = {
  disabled?: boolean;
  onDelete: () => void;
};

export { useQcHubFullAccess } from "@/lib/qcHubAccess";

export function HubRowDeleteButton({ disabled, onDelete }: HubDeleteCellProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onDelete}
      className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-60"
    >
      Delete
    </button>
  );
}
