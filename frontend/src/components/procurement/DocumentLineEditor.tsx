"use client";

import React, { useState } from "react";
import { type LineItem, type ProcurementItem, type ProcurementSupplier } from "@/lib/procurementApi";
import {
  computeLineSubtotal,
  computeTaxAmountFromSaleTax,
  type PurchaseType,
} from "@/lib/procurementDocumentTypes";
import { DEFAULT_ITEM_UNIT } from "@/lib/procurementOptions";
import { CurrencySelect } from "@/components/procurement/CurrencySelect";
import { ItemSelect } from "@/components/procurement/ItemSelect";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import { UnitSelect } from "@/components/procurement/UnitSelect";
import {
  procurementCompactLabelClass,
  procurementFieldClass,
  procurementHintClass,
} from "@/components/procurement/procurement-ui";
import { amountInWords, formatProcurementAmount } from "@/lib/procurementMoney";

type Props = {
  lines: LineItem[];
  items: ProcurementItem[];
  currency: string;
  purchaseType?: PurchaseType;
  lineContext?: "import" | "export" | "local";
  tradeScope: "local" | "import";
  /** Local PO sales tax rate (e.g. "18%") — used for totals under the grid */
  saleTax?: string;
  onItemCreated?: (item: ProcurementItem) => void;
  selectedSuppliers?: ProcurementSupplier[];
  onSupplierCreated?: (supplier: ProcurementSupplier) => void;
  onChange: (lines: LineItem[]) => void;
};

const inputClass = `${procurementFieldClass} mt-0 min-w-0 w-full`;

function parseDecimalField(raw: string): number {
  if (raw === "" || raw === ".") return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Decimal qty/price field — avoids stripping "20." while typing. */
function DecimalField({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : value === 0 ? "" : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        onChange(parseDecimalField(raw));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function contextHint(context: "import" | "export" | "local") {
  if (context === "export") {
    return {
      title: "Export PFI line items",
      body: "Select the item, enter HS code for the printed PFI, and use Material for the GRADE column on the export invoice.",
    };
  }
  if (context === "import") {
    return {
      title: "Import line items",
      body: "HS code is required on the printed purchase document.",
    };
  }
  return {
    title: "Local line items",
    body: "HS code is optional for local purchase orders.",
  };
}

export function DocumentLineEditor({
  lines,
  items,
  currency,
  purchaseType = "foreign",
  lineContext,
  tradeScope,
  saleTax = "",
  onItemCreated,
  selectedSuppliers = [],
  onSupplierCreated,
  onChange,
}: Props) {
  const isForeign = purchaseType === "foreign";
  const context = lineContext || (isForeign ? "import" : "local");
  const multiSupplier = selectedSuppliers.length > 1;
  const hint = contextHint(context);
  const isLocal = context === "local";
  const showTaxTotals = isLocal && Boolean(saleTax);

  const subtotal = computeLineSubtotal(lines);
  const taxAmount = showTaxTotals ? computeTaxAmountFromSaleTax(subtotal, saleTax) : 0;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

  const updateLine = (index: number, patch: Partial<LineItem>) => {
    const next = lines.map((l, i) => {
      if (i !== index) return l;
      const merged = { ...l, ...patch };
      if (patch.item) {
        const found = items.find((it) => it._id === patch.item);
        if (found) {
          merged.itemCode = found.itemCode;
          merged.itemName = found.name;
          merged.unit = found.unit || DEFAULT_ITEM_UNIT;
          if (found.hsCode && !merged.hsCode) merged.hsCode = found.hsCode;
        }
      }
      merged.lineTotal = Math.round((merged.quantity || 0) * (merged.unitPrice || 0) * 100) / 100;
      return merged;
    });
    onChange(next);
  };

  const addLine = () => {
    onChange([
      ...lines,
      {
        item: "",
        itemCode: "",
        itemName: "",
        unit: DEFAULT_ITEM_UNIT,
        quantity: 1,
        unitPrice: 0,
        currency,
        lineTotal: 0,
      },
    ]);
  };

  const removeLine = (index: number) => onChange(lines.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-100">Line items</p>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-slate-600 dark:bg-slate-900/80 dark:text-blue-100">
          <p className="font-medium text-blue-800 dark:text-blue-200">{hint.title}</p>
          <p className={`mt-1 leading-relaxed ${procurementHintClass}`}>{hint.body}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-blue-200 p-3 dark:border-slate-600 sm:p-4">
        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-blue-200 px-4 py-6 text-center text-sm text-blue-600 dark:border-slate-600 dark:text-blue-300">
            No lines yet. Use <strong>+ Add new item</strong> below to add the first row.
          </p>
        ) : null}

        {lines.map((line, idx) => {
          const lineTotal = (line.lineTotal ?? line.quantity * line.unitPrice) || 0;
          return (
            <article
              key={idx}
              className="space-y-3 rounded-xl border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60 sm:p-4"
            >
              <header className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                  Line {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </header>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
                {multiSupplier ? (
                  <div className="sm:col-span-2 lg:col-span-12">
                    <label className={procurementCompactLabelClass}>
                      Supplier <span className="text-red-600">*</span>
                      <div className="mt-0.5">
                        <SupplierSelect
                          required
                          className={inputClass}
                          placeholder="Supplier"
                          value={line.supplier || ""}
                          onChange={(supplierId) => {
                            const sup = selectedSuppliers.find((s) => s._id === supplierId);
                            updateLine(idx, {
                              supplier: supplierId,
                              supplierName: sup?.name || "",
                            });
                          }}
                          suppliers={selectedSuppliers}
                          section={tradeScope}
                          onSupplierCreated={(supplier) => {
                            onSupplierCreated?.(supplier);
                            updateLine(idx, {
                              supplier: supplier._id,
                              supplierName: supplier.name || "",
                            });
                          }}
                        />
                      </div>
                    </label>
                  </div>
                ) : null}

                <div className={isForeign ? "lg:col-span-5" : "sm:col-span-2 lg:col-span-6"}>
                  <label className={procurementCompactLabelClass}>
                    Item / description <span className="text-red-600">*</span>
                    <div className="mt-0.5">
                      <ItemSelect
                        className={inputClass}
                        value={line.item || ""}
                        onChange={(itemId) => updateLine(idx, { item: itemId })}
                        items={items}
                        tradeScope={tradeScope}
                        onItemCreated={onItemCreated}
                      />
                    </div>
                  </label>
                </div>

                {isForeign ? (
                  <div className="lg:col-span-3">
                    <label className={procurementCompactLabelClass}>
                      HS code <span className="text-red-600">*</span>
                      <input
                        required
                        className={inputClass}
                        value={line.hsCode || ""}
                        onChange={(e) => updateLine(idx, { hsCode: e.target.value })}
                        placeholder="e.g. 3907.30.00"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="lg:col-span-2">
                    <label className={procurementCompactLabelClass}>
                      HS code
                      <input
                        className={inputClass}
                        value={line.hsCode || ""}
                        onChange={(e) => updateLine(idx, { hsCode: e.target.value })}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                )}

                <div className="lg:col-span-2">
                  <label className={procurementCompactLabelClass}>
                    Qty <span className="text-red-600">*</span>
                    <DecimalField
                      className={inputClass}
                      value={line.quantity}
                      onChange={(quantity) => updateLine(idx, { quantity })}
                    />
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className={procurementCompactLabelClass}>
                    Unit <span className="text-red-600">*</span>
                    <div className="mt-0.5">
                      <UnitSelect
                        className={inputClass}
                        allowEmpty={false}
                        value={line.unit || DEFAULT_ITEM_UNIT}
                        onChange={(unit) => updateLine(idx, { unit })}
                      />
                    </div>
                  </label>
                </div>

                <div className="lg:col-span-2">
                  <label className={procurementCompactLabelClass}>
                    Unit price <span className="text-red-600">*</span>
                    <DecimalField
                      className={inputClass}
                      value={line.unitPrice}
                      onChange={(unitPrice) => updateLine(idx, { unitPrice })}
                    />
                  </label>
                </div>

                {!isLocal ? (
                  <div className="lg:col-span-2">
                    <label className={procurementCompactLabelClass}>
                      Currency
                      <div className="mt-0.5">
                        <CurrencySelect
                          className={inputClass}
                          value={line.currency || currency}
                          onChange={(curr) => updateLine(idx, { currency: curr })}
                        />
                      </div>
                    </label>
                  </div>
                ) : null}

                <div className={isLocal ? "lg:col-span-2" : "lg:col-span-2"}>
                  <label className={procurementCompactLabelClass}>
                    Line total
                    <div className="mt-0.5 flex h-[42px] items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-900 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-100">
                      {formatProcurementAmount(lineTotal)} {line.currency || currency}
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t border-blue-100 pt-3 dark:border-slate-700">
                <p className={`${procurementCompactLabelClass} mb-2 uppercase tracking-wide`}>
                  Additional details
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={procurementCompactLabelClass}>
                    Packing
                    <input
                      className={inputClass}
                      value={line.packing || ""}
                      onChange={(e) => updateLine(idx, { packing: e.target.value })}
                      placeholder="e.g. Drum, Bag"
                    />
                  </label>
                  <label className={procurementCompactLabelClass}>
                    Size
                    <input
                      className={inputClass}
                      value={line.size || ""}
                      onChange={(e) => updateLine(idx, { size: e.target.value })}
                      placeholder="e.g. 25 KG"
                    />
                  </label>
                  <label className={procurementCompactLabelClass}>
                    {context === "export" ? "Material (GRADE)" : "Material"}
                    <input
                      className={inputClass}
                      value={line.material || ""}
                      onChange={(e) => updateLine(idx, { material: e.target.value })}
                      placeholder={context === "export" ? "GRADE for print" : "Material spec"}
                    />
                  </label>
                  <label className={procurementCompactLabelClass}>
                    Price UOM
                    <input
                      className={inputClass}
                      value={line.priceUom || ""}
                      onChange={(e) => updateLine(idx, { priceUom: e.target.value })}
                      placeholder="e.g. Per KG"
                    />
                  </label>
                  {context !== "export" ? (
                    <label className={procurementCompactLabelClass}>
                      Shipment note
                      <input
                        className={inputClass}
                        value={line.shipmentNote || ""}
                        onChange={(e) => updateLine(idx, { shipmentNote: e.target.value })}
                        placeholder="Shipment reference"
                      />
                    </label>
                  ) : null}
                  <label className={procurementCompactLabelClass}>
                    Remarks
                    <input
                      className={inputClass}
                      value={line.remarks || ""}
                      onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </label>
                </div>
              </div>
            </article>
          );
        })}

        <button
          type="button"
          onClick={addLine}
          className="w-full rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:border-blue-500 hover:bg-blue-100 dark:border-slate-500 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
        >
          + Add new item
        </button>
      </div>

      {lines.length > 0 ? (
        <div className="ml-auto w-full max-w-2xl space-y-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 text-blue-800 dark:text-blue-100">
            <span>Subtotal</span>
            <span className="font-semibold">
              {formatProcurementAmount(subtotal)} {currency}
            </span>
          </div>
          {showTaxTotals ? (
            <div className="flex items-center justify-between gap-4 text-blue-800 dark:text-blue-100">
              <span>Sales tax ({saleTax})</span>
              <span className="font-semibold">
                {formatProcurementAmount(taxAmount)} {currency}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-blue-100 pt-2 text-blue-900 dark:border-slate-700 dark:text-blue-50">
            <span className="shrink-0 text-base font-bold">Grand total</span>
            <span className="min-w-0 text-right text-base font-bold leading-snug">
              {formatProcurementAmount(grandTotal)} {currency}
              <span className="ml-2 text-xs font-semibold italic text-blue-800 dark:text-blue-100">
                ({amountInWords(grandTotal, currency, { localPurchase: isLocal })})
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
