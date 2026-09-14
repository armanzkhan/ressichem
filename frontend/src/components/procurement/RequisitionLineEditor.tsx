"use client";

import React from "react";
import type { ProcurementItem } from "@/lib/procurementApi";
import { DEFAULT_ITEM_UNIT } from "@/lib/procurementOptions";
import { ItemSelect } from "@/components/procurement/ItemSelect";
import { UnitSelect } from "@/components/procurement/UnitSelect";
import { TermSelect } from "@/components/procurement/TermSelect";
import {
  FormLabel,
  procurementFieldClass,
  procurementFieldsetClass,
  procurementHintClass,
} from "@/components/procurement/procurement-ui";

export type RequisitionLine = {
  item: string;
  quantity: string;
  unit: string;
  description: string;
  department: string;
};

type Props = {
  lines: RequisitionLine[];
  items: ProcurementItem[];
  tradeScope: "local" | "import";
  departmentOptions: string[];
  defaultDepartment?: string;
  onItemCreated?: (item: ProcurementItem) => void;
  onChange: (lines: RequisitionLine[]) => void;
  allowQuickAdd?: boolean;
};

const emptyLine = (defaultDepartment = ""): RequisitionLine => ({
  item: "",
  quantity: "1",
  unit: DEFAULT_ITEM_UNIT,
  description: "",
  department: defaultDepartment,
});

export function RequisitionLineEditor({
  lines,
  items,
  tradeScope,
  departmentOptions,
  defaultDepartment = "",
  onItemCreated,
  onChange,
  allowQuickAdd = true,
}: Props) {
  const updateLine = (index: number, patch: Partial<RequisitionLine>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const pickItem = (index: number, itemId: string) => {
    const catalog = items.find((x) => x._id === itemId);
    updateLine(index, {
      item: itemId,
      unit: catalog?.unit || DEFAULT_ITEM_UNIT,
      description: catalog?.name || lines[index]?.description || "",
    });
  };

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-100">Line items</h3>
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => onChange([...lines, emptyLine(defaultDepartment)])}
        >
          + Add line
        </button>
      </header>
      {lines.length === 0 ? (
        <p
          className={`rounded-xl border border-dashed border-blue-200 px-4 py-4 text-center dark:border-slate-600 ${procurementHintClass}`}
        >
          Add at least one item. Each line needs its own department (multi-dept PRs notify each mapped
          approver).
        </p>
      ) : (
        <section className="space-y-3">
          {lines.map((line, index) => (
            <article
              key={index}
              className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-4 ${procurementFieldsetClass}`}
            >
              <FormLabel className="sm:col-span-2">
                Item
                <div className="mt-1">
                  <ItemSelect
                    required
                    value={line.item}
                    onChange={(itemId) => pickItem(index, itemId)}
                    items={items}
                    tradeScope={tradeScope}
                    onItemCreated={onItemCreated}
                    allowQuickAdd={allowQuickAdd}
                  />
                </div>
              </FormLabel>
              <FormLabel className="sm:col-span-2">
                Department <span className="text-red-600">*</span>
                <div className="mt-1">
                  <TermSelect
                    required
                    value={line.department}
                    onChange={(department) => updateLine(index, { department })}
                    options={departmentOptions}
                    placeholder="Select department for this line"
                    allowAdd
                    addLabel="+ Add department…"
                  />
                </div>
              </FormLabel>
              <FormLabel>
                Quantity
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  className={procurementFieldClass}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                />
              </FormLabel>
              <FormLabel>
                Unit
                <div className="mt-1">
                  <UnitSelect
                    required
                    value={line.unit}
                    onChange={(unit) => updateLine(index, { unit })}
                  />
                </div>
              </FormLabel>
              <FormLabel className="sm:col-span-2">
                Description
                <textarea
                  className={procurementFieldClass}
                  rows={2}
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  placeholder="Details, specs, or notes for this line"
                />
              </FormLabel>
              <footer className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-red-600 dark:text-red-400"
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                >
                  Remove line
                </button>
              </footer>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
