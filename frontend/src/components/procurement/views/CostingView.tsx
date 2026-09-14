"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  procurementApi,
  type CostingScenario,
  type ProcurementCosting,
} from "@/lib/procurementApi";
import {
  Alert,
  Field,
  LoadingText,
  Modal,
  PageShell,
  StatusBadge,
  Table,
  procurementFieldClass,
  procurementSecondaryButtonClass,
} from "@/components/procurement/procurement-ui";
import { pageTitle } from "@/lib/procurementScope";
import { recordTotalLabel } from "@/lib/procurementRecordSummary";
import { openProcurementPrint } from "@/lib/procurementPrint";
import { downloadProcurementFile } from "@/lib/procurementDownload";

type Props = { section: "local" | "import" };

type CostingForm = {
  product: string;
  productDetail: string;
  hsCode: string;
  bondCiDate: string;
  documentDate: string;
  qtyExBond: string;
  currency: string;
  exchangeRate: string;
  taxPurposeUnitPrice: string;
  taxPurposeInsuranceUsd: string;
  taxPurposeLandingPct: string;
  inclusiveUnitPrice: string;
  inclusiveInsuranceUsd: string;
  inclusiveLandingPct: string;
  cdPct: string;
  addCdPct: string;
  adSalesTaxPct: string;
  salesTaxPct: string;
  incomeTaxPct: string;
  whsc: string;
  dutiesBond: string;
  agentBill: string;
  insurancePkr: string;
  bankComm: string;
  otherCharges: string;
  notes: string;
  status: string;
};

function emptyForm(section: "local" | "import"): CostingForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    product: "",
    productDetail: "",
    hsCode: "",
    bondCiDate: "",
    documentDate: today,
    qtyExBond: "",
    currency: section === "local" ? "PKR" : "USD",
    exchangeRate: section === "local" ? "1" : "280",
    taxPurposeUnitPrice: "",
    taxPurposeInsuranceUsd: "0",
    taxPurposeLandingPct: section === "local" ? "0" : "1",
    inclusiveUnitPrice: "",
    inclusiveInsuranceUsd: "0",
    inclusiveLandingPct: section === "local" ? "0" : "1",
    cdPct: "0",
    addCdPct: "0",
    adSalesTaxPct: "0",
    salesTaxPct: "18",
    incomeTaxPct: section === "local" ? "0" : "2",
    whsc: "0",
    dutiesBond: "0",
    agentBill: "0",
    insurancePkr: "0",
    bankComm: "0",
    otherCharges: "0",
    notes: "",
    status: "draft",
  };
}

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formToPayload(form: CostingForm, section: "local" | "import") {
  return {
    tradeScope: section,
    status: form.status,
    documentDate: form.documentDate || undefined,
    product: form.product.trim(),
    productDetail: form.productDetail.trim(),
    hsCode: form.hsCode.trim(),
    bondCiDate: form.bondCiDate.trim() || form.hsCode.trim(),
    qtyExBond: num(form.qtyExBond),
    currency: form.currency,
    exchangeRate: num(form.exchangeRate) || 1,
    taxPurposeUnitPrice: num(form.taxPurposeUnitPrice),
    taxPurposeInsuranceUsd: num(form.taxPurposeInsuranceUsd),
    taxPurposeLandingPct: num(form.taxPurposeLandingPct),
    inclusiveUnitPrice: num(form.inclusiveUnitPrice),
    inclusiveInsuranceUsd: num(form.inclusiveInsuranceUsd),
    inclusiveLandingPct: num(form.inclusiveLandingPct),
    cdPct: num(form.cdPct),
    addCdPct: num(form.addCdPct),
    adSalesTaxPct: num(form.adSalesTaxPct),
    salesTaxPct: num(form.salesTaxPct),
    incomeTaxPct: num(form.incomeTaxPct),
    whsc: num(form.whsc),
    dutiesBond: num(form.dutiesBond),
    agentBill: num(form.agentBill),
    insurancePkr: num(form.insurancePkr),
    bankComm: num(form.bankComm),
    otherCharges: num(form.otherCharges),
    notes: form.notes.trim(),
  };
}

function docToForm(row: ProcurementCosting): CostingForm {
  return {
    product: row.product || "",
    productDetail: row.productDetail || "",
    hsCode: row.hsCode || "",
    bondCiDate: row.bondCiDate || "",
    documentDate: row.documentDate ? String(row.documentDate).slice(0, 10) : "",
    qtyExBond: String(row.qtyExBond ?? ""),
    currency: row.currency || "USD",
    exchangeRate: String(row.exchangeRate ?? 1),
    taxPurposeUnitPrice: String(row.taxPurposeUnitPrice ?? ""),
    taxPurposeInsuranceUsd: String(row.taxPurposeInsuranceUsd ?? 0),
    taxPurposeLandingPct: String(row.taxPurposeLandingPct ?? 1),
    inclusiveUnitPrice: String(row.inclusiveUnitPrice ?? ""),
    inclusiveInsuranceUsd: String(row.inclusiveInsuranceUsd ?? 0),
    inclusiveLandingPct: String(row.inclusiveLandingPct ?? 1),
    cdPct: String(row.cdPct ?? 0),
    addCdPct: String(row.addCdPct ?? 0),
    adSalesTaxPct: String(row.adSalesTaxPct ?? 0),
    salesTaxPct: String(row.salesTaxPct ?? 18),
    incomeTaxPct: String(row.incomeTaxPct ?? 2),
    whsc: String(row.whsc ?? 0),
    dutiesBond: String(row.dutiesBond ?? 0),
    agentBill: String(row.agentBill ?? 0),
    insurancePkr: String(row.insurancePkr ?? 0),
    bankComm: String(row.bankComm ?? 0),
    otherCharges: String(row.otherCharges ?? 0),
    notes: row.notes || "",
    status: row.status || "draft",
  };
}

function money(n?: number, digits = 2) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function CellInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      className={`${procurementFieldClass} !mt-0 !py-1 !px-1.5 text-xs text-right ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SheetRow({
  label,
  form,
  scenario,
  rateKey,
  insuranceKey,
  landingKey,
  onPatch,
  highlight,
}: {
  label: string;
  form: CostingForm;
  scenario?: CostingScenario | null;
  rateKey: "taxPurposeUnitPrice" | "inclusiveUnitPrice";
  insuranceKey: "taxPurposeInsuranceUsd" | "inclusiveInsuranceUsd";
  landingKey: "taxPurposeLandingPct" | "inclusiveLandingPct";
  onPatch: (key: keyof CostingForm, value: string) => void;
  highlight?: boolean;
}) {
  const rate = num(form.exchangeRate) || 1;
  const landingPkr = Number(scenario?.landingUsd || 0) * rate;
  return (
    <tr className={highlight ? "bg-amber-50/60 dark:bg-amber-950/20" : "bg-white dark:bg-slate-900"}>
      <td className="sticky left-0 z-[1] bg-inherit font-semibold whitespace-nowrap px-2 py-1 border border-blue-200 dark:border-slate-600">
        {label}
      </td>
      <td className="px-1 py-1 border border-blue-200 dark:border-slate-600 min-w-[7rem]">
        <CellInput value={form.documentDate} onChange={(v) => onPatch("documentDate", v)} className="!text-left" />
      </td>
      <td className="px-1 py-1 border border-blue-200 dark:border-slate-600 min-w-[10rem]">
        <div className="space-y-1">
          <CellInput value={form.product} onChange={(v) => onPatch("product", v)} className="!text-left" />
          <CellInput
            value={form.productDetail}
            onChange={(v) => onPatch("productDetail", v)}
            className="!text-left opacity-80"
          />
        </div>
      </td>
      <td className="px-1 py-1 border border-blue-200 dark:border-slate-600 min-w-[5.5rem]">
        <CellInput value={form.qtyExBond} onChange={(v) => onPatch("qtyExBond", v)} />
      </td>
      <td className="px-1 py-1 border border-yellow-300 dark:border-yellow-800 min-w-[5rem]">
        <CellInput value={form[rateKey]} onChange={(v) => onPatch(rateKey, v)} />
      </td>
      <td className="px-2 py-1 border border-yellow-300 dark:border-yellow-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.amountUsd)}
      </td>
      <td className="px-1 py-1 border border-yellow-300 dark:border-yellow-800 min-w-[5rem]">
        <CellInput value={form[insuranceKey]} onChange={(v) => onPatch(insuranceKey, v)} />
      </td>
      <td className="px-1 py-1 border border-yellow-300 dark:border-yellow-800 min-w-[5rem]">
        <CellInput value={form[landingKey]} onChange={(v) => onPatch(landingKey, v)} />
        <div className="text-[10px] text-right text-blue-600 dark:text-blue-300">{money(scenario?.landingUsd)}</div>
      </td>
      <td className="px-2 py-1 border border-yellow-300 dark:border-yellow-800 text-right text-xs whitespace-nowrap">
        {money(landingPkr, 0)}
      </td>
      <td className="px-2 py-1 border border-yellow-300 dark:border-yellow-800 text-right text-xs font-medium whitespace-nowrap">
        {money(scenario?.amountPkr, 0)}
      </td>
      <td className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.cd, 0)}
      </td>
      <td className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.addCd, 0)}
      </td>
      <td className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.adSalesTax, 0)}
      </td>
      <td className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.salesTax, 0)}
      </td>
      <td className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.incomeTax, 0)}
      </td>
      <td className="px-2 py-1 border border-amber-300 dark:border-amber-800 text-right text-xs font-semibold whitespace-nowrap">
        {money(scenario?.totalDuties, 0)}
      </td>
      <td className="px-2 py-1 border border-yellow-200 dark:border-yellow-900 text-right text-xs whitespace-nowrap">
        {money(num(form.whsc), 0)}
      </td>
      <td className="px-2 py-1 border border-yellow-200 dark:border-yellow-900 text-right text-xs whitespace-nowrap">
        {money(num(form.dutiesBond), 0)}
      </td>
      <td className="px-2 py-1 border border-yellow-200 dark:border-yellow-900 text-right text-xs whitespace-nowrap">
        {money(num(form.agentBill), 0)}
      </td>
      <td className="px-2 py-1 border border-yellow-200 dark:border-yellow-900 text-right text-xs whitespace-nowrap">
        {money(num(form.insurancePkr), 0)}
      </td>
      <td className="px-2 py-1 border border-yellow-200 dark:border-yellow-900 text-right text-xs whitespace-nowrap">
        {money(num(form.bankComm), 0)}
      </td>
      <td className="px-2 py-1 border border-emerald-300 dark:border-emerald-800 text-right text-xs font-bold whitespace-nowrap">
        {money(scenario?.gTotal, 0)}
      </td>
      <td
        className={`px-2 py-1 border border-emerald-300 dark:border-emerald-800 text-right text-xs font-bold whitespace-nowrap ${
          highlight ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200" : ""
        }`}
      >
        {money(scenario?.priceInclAllTaxes, 2)}
      </td>
      <td className="px-2 py-1 border border-emerald-300 dark:border-emerald-800 text-right text-xs whitespace-nowrap">
        {money(scenario?.priceWithoutSalesTax, 2)}
      </td>
    </tr>
  );
}

export function CostingView({ section }: Props) {
  const [rows, setRows] = useState<ProcurementCosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(section));
  const [preview, setPreview] = useState<{
    taxPurpose: CostingScenario;
    allInclusive: CostingScenario;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await procurementApi.listCosting({ tradeScope: section });
      setRows((res.data || []).filter((r) => r.status !== "cancelled"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load costing sheets");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setForm(emptyForm(section));
    setPreview(null);
    setShowForm(false);
    setEditingId(null);
  }, [section]);

  const payload = useMemo(() => formToPayload(form, section), [form, section]);

  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await procurementApi.previewCosting(payload);
        if (!cancelled) setPreview(res.data);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [payload, showForm]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(section));
    setPreview(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = async (id: string) => {
    setError("");
    try {
      const res = await procurementApi.getCosting(id);
      setEditingId(id);
      setForm(docToForm(res.data));
      setPreview({
        taxPurpose: res.data.taxPurpose || {},
        allInclusive: res.data.allInclusive || {},
      });
      setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load costing sheet");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product.trim()) {
      setError("Product is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) await procurementApi.updateCosting(editingId, payload);
      else await procurementApi.createCosting(payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const patch = (key: keyof CostingForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const printDoc = async (id: string) => {
    try {
      await openProcurementPrint(`/api/procurement/costing/${id}/print`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Print failed");
    }
  };

  const exportDocs = async (format: "xlsx" | "csv", id?: string) => {
    setError("");
    try {
      const path = id
        ? `/api/procurement/costing/${id}/export?format=${format}`
        : `/api/procurement/costing/export?format=${format}&tradeScope=${section}`;
      const fallback = id
        ? `costing.${format}`
        : `procurement-costing-${section}.${format}`;
      await downloadProcurementFile(path, fallback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  };

  const hsLabel = form.hsCode || form.bondCiDate || "—";

  return (
    <PageShell
      title={pageTitle(section, "costing")}
      summary={loading ? undefined : recordTotalLabel(rows.length, "costing sheet", "costing sheets")}
      onAdd={openCreate}
      addLabel="New costing"
      onBulkImport={() => exportDocs("xlsx")}
      bulkImportLabel="Export Excel"
    >
      {error ? <Alert message={error} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Spreadsheet-style costing: row 1 = <strong>tax purpose</strong> (fixed rate for duties); row 2 ={" "}
          <strong>everything inclusive</strong> (payment rate may differ).
        </p>
        <button
          type="button"
          className={procurementSecondaryButtonClass}
          onClick={() => exportDocs("csv")}
        >
          Export CSV
        </button>
      </div>
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          onRowClick={(index) => openEdit(rows[index]._id)}
          headers={[
            "Costing #",
            "Product",
            "Qty",
            "Tax purpose / unit",
            "Inclusive / unit",
            "Status",
            "Actions",
          ]}
          rows={rows.map((r) => [
            r.costingNumber || "—",
            r.product || "—",
            money(r.qtyExBond, 0),
            money(r.taxPurpose?.priceInclAllTaxes, 2),
            money(r.allInclusive?.priceInclAllTaxes, 2),
            <StatusBadge key={`st-${r._id}`} status={r.status || "draft"} />,
            <span key={`act-${r._id}`} className="flex gap-2">
              <button
                type="button"
                className="text-blue-600 text-xs dark:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(r._id);
                }}
              >
                Open
              </button>
              <button
                type="button"
                className="text-emerald-700 text-xs dark:text-emerald-300"
                onClick={(e) => {
                  e.stopPropagation();
                  printDoc(r._id);
                }}
              >
                Print
              </button>
              <button
                type="button"
                className="text-slate-700 text-xs dark:text-slate-300"
                onClick={(e) => {
                  e.stopPropagation();
                  exportDocs("xlsx", r._id);
                }}
              >
                Excel
              </button>
            </span>,
          ])}
        />
      )}

      {showForm ? (
        <Modal
          sheet
          title={
            editingId
              ? `Costing ${rows.find((r) => r._id === editingId)?.costingNumber || ""}`
              : "New payment / costing sheet"
          }
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <Field
                label="HS / Bond CI"
                value={form.hsCode}
                onChange={(v) => {
                  patch("hsCode", v);
                  patch("bondCiDate", v);
                }}
              />
              <Field label="Exchange rate → PKR" value={form.exchangeRate} onChange={(v) => patch("exchangeRate", v)} />
              <Field label="CD %" value={form.cdPct} onChange={(v) => patch("cdPct", v)} />
              <Field label="Add CD %" value={form.addCdPct} onChange={(v) => patch("addCdPct", v)} />
              <Field label="AD S/Tax %" value={form.adSalesTaxPct} onChange={(v) => patch("adSalesTaxPct", v)} />
              <Field label="Sales Tax %" value={form.salesTaxPct} onChange={(v) => patch("salesTaxPct", v)} />
              <Field label="I/Tax %" value={form.incomeTaxPct} onChange={(v) => patch("incomeTaxPct", v)} />
              <Field label="WHSC" value={form.whsc} onChange={(v) => patch("whsc", v)} />
              <Field label="Duties / Bond" value={form.dutiesBond} onChange={(v) => patch("dutiesBond", v)} />
              <Field label="Agent Bill" value={form.agentBill} onChange={(v) => patch("agentBill", v)} />
              <Field label="Insurance (PKR)" value={form.insurancePkr} onChange={(v) => patch("insurancePkr", v)} />
              <Field label="Bank Comm" value={form.bankComm} onChange={(v) => patch("bankComm", v)} />
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-blue-200 dark:border-slate-700">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-[2] bg-emerald-200 dark:bg-emerald-900 px-2 py-1 border border-blue-300 dark:border-slate-600"
                      rowSpan={2}
                    >
                      Type
                    </th>
                    <th
                      className="bg-emerald-200 dark:bg-emerald-900 px-2 py-1 border border-blue-300 dark:border-slate-600"
                      rowSpan={2}
                    >
                      Bond CI Date
                    </th>
                    <th
                      className="bg-emerald-200 dark:bg-emerald-900 px-2 py-1 border border-blue-300 dark:border-slate-600"
                      rowSpan={2}
                    >
                      Product
                    </th>
                    <th
                      className="bg-emerald-200 dark:bg-emerald-900 px-2 py-1 border border-blue-300 dark:border-slate-600"
                      rowSpan={2}
                    >
                      Qty Ex-Bond
                    </th>
                    <th
                      className="bg-yellow-300 dark:bg-yellow-800 px-2 py-1 border border-yellow-500 dark:border-yellow-700"
                      colSpan={6}
                    >
                      C F R
                    </th>
                    <th
                      className="bg-yellow-200 dark:bg-yellow-900 px-2 py-1 border border-yellow-500 dark:border-yellow-700"
                      colSpan={6}
                    >
                      D U T I E S
                    </th>
                    <th
                      className="bg-amber-100 dark:bg-amber-950 px-2 py-1 border border-amber-300 dark:border-amber-800"
                      colSpan={5}
                    >
                      OTHER CHARGES
                    </th>
                    <th
                      className="bg-emerald-100 dark:bg-emerald-950 px-2 py-1 border border-emerald-300 dark:border-emerald-800"
                      colSpan={3}
                    >
                      HS CODE {hsLabel}
                    </th>
                  </tr>
                  <tr className="text-[10px]">
                    <th className="bg-yellow-200 px-1 py-1 border dark:bg-yellow-900">@</th>
                    <th className="bg-yellow-200 px-1 py-1 border dark:bg-yellow-900">Amount</th>
                    <th className="bg-yellow-200 px-1 py-1 border dark:bg-yellow-900">Insurance</th>
                    <th className="bg-yellow-200 px-1 py-1 border dark:bg-yellow-900">Landing chg</th>
                    <th className="bg-yellow-200 px-1 py-1 border dark:bg-yellow-900">Landing PKR</th>
                    <th className="bg-yellow-200 px-1 py-1 border dark:bg-yellow-900">Amount (PKR)</th>
                    <th className="bg-amber-100 px-1 py-1 border dark:bg-amber-950">CD</th>
                    <th className="bg-amber-100 px-1 py-1 border dark:bg-amber-950">Add CD</th>
                    <th className="bg-amber-100 px-1 py-1 border dark:bg-amber-950">AD S/Tax</th>
                    <th className="bg-amber-100 px-1 py-1 border dark:bg-amber-950">SALES TAX</th>
                    <th className="bg-amber-100 px-1 py-1 border dark:bg-amber-950">I/TAX</th>
                    <th className="bg-amber-100 px-1 py-1 border dark:bg-amber-950">Total</th>
                    <th className="bg-yellow-50 px-1 py-1 border dark:bg-yellow-950">WHSC</th>
                    <th className="bg-yellow-50 px-1 py-1 border dark:bg-yellow-950">Duties/Bond</th>
                    <th className="bg-yellow-50 px-1 py-1 border dark:bg-yellow-950">Agent Bill</th>
                    <th className="bg-yellow-50 px-1 py-1 border dark:bg-yellow-950">Insurance</th>
                    <th className="bg-yellow-50 px-1 py-1 border dark:bg-yellow-950">Bank Comm</th>
                    <th className="bg-emerald-50 px-1 py-1 border dark:bg-emerald-950">G-Total</th>
                    <th className="bg-emerald-50 px-1 py-1 border dark:bg-emerald-950">Price incl all Taxes</th>
                    <th className="bg-emerald-50 px-1 py-1 border dark:bg-emerald-950">Price without Sales Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <SheetRow
                    label="Tax purpose"
                    form={form}
                    scenario={preview?.taxPurpose}
                    rateKey="taxPurposeUnitPrice"
                    insuranceKey="taxPurposeInsuranceUsd"
                    landingKey="taxPurposeLandingPct"
                    onPatch={patch}
                  />
                  <SheetRow
                    label="All inclusive"
                    form={form}
                    scenario={preview?.allInclusive}
                    rateKey="inclusiveUnitPrice"
                    insuranceKey="inclusiveInsuranceUsd"
                    landingKey="inclusiveLandingPct"
                    onPatch={patch}
                    highlight
                  />
                </tbody>
              </table>
            </div>

            <Field label="Notes" value={form.notes} onChange={(v) => patch("notes", v)} multiline rows={2} />

            <footer className="flex flex-wrap justify-end gap-2 pt-1">
              {editingId ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300"
                    onClick={() => printDoc(editingId)}
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    className={procurementSecondaryButtonClass}
                    onClick={() => exportDocs("xlsx", editingId)}
                  >
                    Export Excel
                  </button>
                </>
              ) : null}
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
