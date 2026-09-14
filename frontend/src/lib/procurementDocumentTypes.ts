import type { LineItem, ProcurementSupplier } from "./procurementApi";
import {
  EXPORT_INCO_TERMS,
  EXPORT_PAYMENT_TERMS,
  IMPORT_INCO_TERMS,
  IMPORT_PAYMENT_TERMS,
  LOCAL_INCO_TERMS,
  LOCAL_PAYMENT_TERMS,
} from "./procurementOptions";

export type PartyBlock = {
  name?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  taxId?: string;
  strn?: string;
};

export type BankingBlock = {
  bankName?: string;
  accountNo?: string;
  swift?: string;
  branch?: string;
  address?: string;
};

export type PurchaseType = "local" | "foreign";

export type CommercialDocumentForm = {
  purchaseType: PurchaseType;
  supplier: string;
  suppliers: string[];
  currency: string;
  exchangeRate: string;
  taxAmount: string;
  notes: string;
  status: string;
  documentDate: string;
  quoteNumber: string;
  customerNumber: string;
  referencePoNumber: string;
  orderedBy: string;
  bookedBy: string;
  paymentTerms: string;
  incoTerm: string;
  portOfLoading: string;
  placeOfDelivery: string;
  loadingPort: string;
  shipment: string;
  saleTax: string;
  validFrom: string;
  validUntil: string;
  prNumber: string;
  termsAndConditions: string;
  billTo: PartyBlock;
  shipTo: PartyBlock;
  supplierBanking: BankingBlock;
  lines: LineItem[];
};

export const RESSICHEM_BUYER_DEFAULT: PartyBlock = {
  name: "RESSICHEM PRIVATE LIMITED",
  street: "Plot # D-83, S.I.T.E, Industrial Area, Manghopir Road",
  city: "Karachi",
  postalCode: "75530",
  country: "Pakistan",
  phone: "021-32593800-02",
  taxId: "3673887-5",
  strn: "17-00-3673-887-12",
};

export function emptyPartyBlock(): PartyBlock {
  return {
    name: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
    taxId: "",
    strn: "",
  };
}

export function inferPurchaseType(supplier?: ProcurementSupplier): PurchaseType {
  const c = (supplier?.country || "").toLowerCase().trim();
  if (!c) return "foreign";
  if (c.includes("pakistan") || c === "pk") return "local";
  return "foreign";
}

export function parseSaleTaxPercent(saleTax: string): number | null {
  const trimmed = String(saleTax || "").trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (match) return Number(match[1]);
  if (/^exempt$/i.test(trimmed) || /^as applicable$/i.test(trimmed)) return 0;
  return null;
}

export function computeLineSubtotal(lines: LineItem[]): number {
  const subtotal = lines.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unitPrice) || 0;
    const lineTotal = line.lineTotal ?? qty * price;
    return sum + (Number(lineTotal) || 0);
  }, 0);
  return Math.round(subtotal * 100) / 100;
}

export function computeTaxAmountFromSaleTax(subtotal: number, saleTax: string): number {
  const pct = parseSaleTaxPercent(saleTax);
  if (pct == null) return 0;
  return Math.round(subtotal * (pct / 100) * 100) / 100;
}

export function inferSaleTaxFromAmounts(subtotal: number, taxAmount: number): string {
  if (!(subtotal > 0) || !(taxAmount > 0)) return "";
  const pct = Math.round((taxAmount / subtotal) * 100);
  return `${pct}%`;
}

export function commercialFormToPayload(form: CommercialDocumentForm) {
  const isLocal = form.purchaseType === "local";
  const supplierIds = form.suppliers.length ? form.suppliers : form.supplier ? [form.supplier] : [];
  const multiSupplier = supplierIds.length > 1;
  const lineSubtotal = computeLineSubtotal(form.lines);
  const taxAmount = isLocal
    ? computeTaxAmountFromSaleTax(lineSubtotal, form.saleTax)
    : Number(form.taxAmount) || 0;
  return {
    purchaseType: form.purchaseType,
    supplier: supplierIds[0] || form.supplier,
    suppliers: supplierIds,
    currency: isLocal ? "PKR" : form.currency,
    exchangeRate: isLocal ? 1 : Number(form.exchangeRate) || 1,
    taxAmount,
    notes: form.notes,
    status: form.status,
    documentDate: form.documentDate || undefined,
    quoteNumber: form.quoteNumber,
    customerNumber: form.customerNumber,
    referencePoNumber: form.referencePoNumber,
    orderedBy: form.orderedBy,
    bookedBy: form.bookedBy,
    paymentTerms: form.paymentTerms,
    incoTerm: form.incoTerm,
    portOfLoading: form.portOfLoading,
    placeOfDelivery: form.placeOfDelivery,
    loadingPort: form.loadingPort,
    shipment: form.shipment,
    saleTax: form.saleTax,
    validFrom: form.validFrom || undefined,
    validUntil: form.validUntil || undefined,
    prNumber: form.prNumber,
    termsAndConditions: form.termsAndConditions,
    billTo: form.billTo,
    shipTo: form.shipTo,
    supplierBanking: form.supplierBanking,
    items: form.lines.map((line) => {
      const row: LineItem = { ...line };
      if (!row.item) delete row.item;
      if (multiSupplier) {
        if (!row.supplier) delete row.supplier;
      } else {
        delete row.supplier;
      }
      return row;
    }),
  };
}

function mapSupplierId(s: string | { _id?: string } | undefined): string {
  if (!s) return "";
  return typeof s === "string" ? s : s._id || "";
}

export function docToCommercialForm(doc: Record<string, unknown>, defaultStatus: string): CommercialDocumentForm {
  const d = doc as CommercialDocumentForm & PurchaseDocumentLike;
  const suppliersFromDoc = Array.isArray(d.suppliers)
    ? d.suppliers.map((s) => mapSupplierId(s as string | { _id?: string })).filter(Boolean)
    : [];
  const primarySupplier = mapSupplierId(d.supplier as string | { _id?: string });
  const suppliers = suppliersFromDoc.length ? suppliersFromDoc : primarySupplier ? [primarySupplier] : [];
  const lines = ((d.items as LineItem[]) || []).map((line) => ({
    ...line,
    supplier: typeof line.supplier === "string" ? line.supplier : "",
  }));
  const purchaseType =
    (d.purchaseType as PurchaseType) ||
    (typeof d.supplier === "object" && d.supplier
      ? inferPurchaseType(d.supplier as ProcurementSupplier)
      : "foreign");
  const subtotal = Number((d as { subtotal?: number }).subtotal) || computeLineSubtotal(lines);
  const taxAmountNum = Number(d.taxAmount ?? 0);
  const saleTax =
    d.saleTax ||
    (purchaseType === "local" ? inferSaleTaxFromAmounts(subtotal, taxAmountNum) : "");
  return {
    ...emptyCommercialForm(),
    supplier: primarySupplier,
    suppliers,
    purchaseType,
    currency: d.currency || "USD",
    exchangeRate: String(d.exchangeRate ?? 1),
    taxAmount: String(taxAmountNum),
    notes: d.notes || "",
    status: d.status || defaultStatus,
    documentDate: d.documentDate ? String(d.documentDate).slice(0, 10) : "",
    quoteNumber: d.quoteNumber || "",
    customerNumber: d.customerNumber || "",
    referencePoNumber: d.referencePoNumber || "",
    orderedBy: d.orderedBy || "",
    bookedBy: d.bookedBy || "",
    paymentTerms: d.paymentTerms || "",
    incoTerm: d.incoTerm || "",
    portOfLoading: d.portOfLoading || "",
    placeOfDelivery: d.placeOfDelivery || "",
    loadingPort: d.loadingPort || "",
    shipment: d.shipment || "",
    saleTax,
    validFrom: d.validFrom ? String(d.validFrom).slice(0, 10) : "",
    validUntil: d.validUntil ? String(d.validUntil).slice(0, 10) : "",
    prNumber: d.prNumber || "",
    termsAndConditions: d.termsAndConditions || "",
    billTo: { ...emptyPartyBlock(), ...(d.billTo || {}) },
    shipTo: { ...emptyPartyBlock(), ...(d.shipTo || {}) },
    supplierBanking: { ...(d.supplierBanking || {}) },
    lines,
  };
}

type PurchaseDocumentLike = {
  supplier?: string | { _id?: string };
  suppliers?: (string | { _id?: string })[];
  purchaseType?: PurchaseType;
  currency?: string;
  exchangeRate?: number;
  taxAmount?: number;
  notes?: string;
  status?: string;
  documentDate?: string;
  quoteNumber?: string;
  customerNumber?: string;
  referencePoNumber?: string;
  orderedBy?: string;
  bookedBy?: string;
  paymentTerms?: string;
  incoTerm?: string;
  portOfLoading?: string;
  placeOfDelivery?: string;
  loadingPort?: string;
  shipment?: string;
  saleTax?: string;
  validFrom?: string;
  validUntil?: string;
  prNumber?: string;
  termsAndConditions?: string;
  billTo?: PartyBlock;
  shipTo?: PartyBlock;
  supplierBanking?: BankingBlock;
  items?: LineItem[];
};

function pickImportOption(options: readonly string[], value?: string): string {
  const v = value?.trim();
  if (!v) return "";
  if (options.includes(v)) return v;
  const upper = v.toUpperCase();
  const match = options.find((o) => o.toUpperCase() === upper || upper.includes(o.toUpperCase()));
  return match || v;
}

export function supplierRecordToParty(supplier: ProcurementSupplier): PartyBlock {
  return {
    name: supplier.name || "",
    street: supplier.address || supplier.street || "",
    city: supplier.city || "",
    postalCode: "",
    country: supplier.country || "",
    phone: [supplier.phoneDialCode, supplier.mobile || supplier.phone].filter(Boolean).join(" ").trim(),
    taxId: supplier.taxId || "",
    strn: supplier.strn || "",
  };
}

/** Export PFI: Ressichem sells — selected party is bill-to / ship-to customer */
export function applyExportCustomerToForm(
  form: CommercialDocumentForm,
  customer: ProcurementSupplier | undefined
): CommercialDocumentForm {
  if (!customer) return form;
  const customerParty = supplierRecordToParty(customer);
  return {
    ...form,
    supplier: customer._id,
    suppliers: [customer._id],
    currency: customer.defaultCurrency || form.currency || "USD",
    paymentTerms: pickImportOption(EXPORT_PAYMENT_TERMS, customer.paymentTerms || form.paymentTerms),
    incoTerm: pickImportOption(EXPORT_INCO_TERMS, customer.incoTerm || form.incoTerm),
    customerNumber: customer.supplierCode || form.customerNumber,
    billTo: customerParty,
    shipTo: form.shipTo?.name ? form.shipTo : { ...emptyPartyBlock() },
    portOfLoading: form.portOfLoading || "Karachi, Pakistan",
  };
}

export function emptyBankingBlock(): BankingBlock {
  return { bankName: "", accountNo: "", swift: "", branch: "", address: "" };
}

function bankingFromSupplier(supplier?: ProcurementSupplier | null): BankingBlock {
  const b = supplier?.banking;
  if (!b) return emptyBankingBlock();
  const next: BankingBlock = {
    bankName: String(b.bankName || "").trim(),
    accountNo: String(b.accountNo || "").trim(),
    swift: String(b.swift || "").trim(),
    branch: String(b.branch || "").trim(),
    address: String(b.address || "").trim(),
  };
  const hasAny = Object.values(next).some((v) => v !== "");
  return hasAny ? next : emptyBankingBlock();
}

export function applySupplierToForm(
  form: CommercialDocumentForm,
  supplier: ProcurementSupplier | undefined,
  fixedPurchaseType?: PurchaseType
): CommercialDocumentForm {
  if (!supplier) return form;
  const purchaseType = fixedPurchaseType ?? inferPurchaseType(supplier);
  const isLocal = purchaseType === "local";
  const paymentTerms = isLocal
    ? pickImportOption(LOCAL_PAYMENT_TERMS, supplier.paymentTerms || form.paymentTerms)
    : pickImportOption(IMPORT_PAYMENT_TERMS, supplier.paymentTerms || form.paymentTerms);
  const incoTerm = isLocal
    ? pickImportOption(LOCAL_INCO_TERMS, supplier.incoTerm || form.incoTerm)
    : pickImportOption(IMPORT_INCO_TERMS, supplier.incoTerm || form.incoTerm);
  const saleTax = isLocal && supplier.srb ? supplier.srb : form.saleTax;
  const subtotal = computeLineSubtotal(form.lines);
  const taxAmount = isLocal ? computeTaxAmountFromSaleTax(subtotal, saleTax) : Number(form.taxAmount) || 0;
  const fromSupplier = bankingFromSupplier(supplier);
  const hasSupplierBanking = Object.values(fromSupplier).some((v) => v !== "");
  return {
    ...form,
    purchaseType,
    currency: isLocal ? "PKR" : supplier.defaultCurrency || form.currency || "USD",
    paymentTerms,
    // Prefer saved supplier master banking so the next PO auto-fills.
    supplierBanking: hasSupplierBanking ? fromSupplier : emptyBankingBlock(),
    placeOfDelivery: isLocal && !form.placeOfDelivery ? "Karachi, Pakistan" : form.placeOfDelivery,
    incoTerm,
    saleTax,
    taxAmount: isLocal ? String(taxAmount) : form.taxAmount,
    billTo: isLocal
      ? form.billTo?.name
        ? form.billTo
        : { ...RESSICHEM_BUYER_DEFAULT }
      : emptyPartyBlock(),
    shipTo: isLocal
      ? form.shipTo?.name
        ? form.shipTo
        : { ...RESSICHEM_BUYER_DEFAULT }
      : emptyPartyBlock(),
    prNumber: isLocal ? form.prNumber : "",
  };
}

export function emptyCommercialForm(): CommercialDocumentForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    purchaseType: "foreign",
    supplier: "",
    suppliers: [],
    currency: "USD",
    exchangeRate: "1",
    taxAmount: "0",
    notes: "",
    status: "draft",
    documentDate: today,
    quoteNumber: "",
    customerNumber: "",
    referencePoNumber: "",
    orderedBy: "",
    bookedBy: "",
    paymentTerms: "",
    incoTerm: "",
    portOfLoading: "",
    placeOfDelivery: "",
    loadingPort: "",
    shipment: "",
    saleTax: "",
    validFrom: today,
    validUntil: "",
    prNumber: "",
    termsAndConditions: "",
    billTo: emptyPartyBlock(),
    shipTo: emptyPartyBlock(),
    supplierBanking: {},
    lines: [],
  };
}
