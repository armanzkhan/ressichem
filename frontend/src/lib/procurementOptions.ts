/** Item catalog unit of measure (local & import items) */
export const ITEM_UNITS = [
  "KG",
  "ITEM/PCS",
  "LTR",
  "SFT",
  "RFT",
  "COIL",
  "SET",
  "SHEET",
  "ROLL",
  "BUCKET",
] as const;

export const DEFAULT_ITEM_UNIT = ITEM_UNITS[0];

/** Procurement item categories (local & import) */
export const PROCUREMENT_ITEM_CATEGORIES = [
  "LIQUID MATERIAL",
  "DRY MATERIAL",
  "PACKING MATERIAL",
  "PRINTING AND STATIONERY",
  "HOUSE HOLD ITEM",
  "GROCERIES ITEMS",
  "MECHANICAL ITEMS",
  "ELECTRICAL ITEMS",
  "HARDWARE",
  "GENERAL ITEMS",
  "TOOLS AND EQUIPMENTS",
  "LAB ITEMS",
  "FIXED ASSETS",
] as const;

/** @deprecated use PROCUREMENT_ITEM_CATEGORIES */
export const LOCAL_ITEM_CATEGORIES = PROCUREMENT_ITEM_CATEGORIES;

/** Local (Pakistan) supplier / PO payment terms */
export const LOCAL_PAYMENT_TERMS = [
  "15 DAYS PDC AFTER DELIVERY",
  "Bill To Bill",
  "Payment Due After 10 Days Of Delivery",
  "Cash Only",
  "03 Days",
  "After Application",
  "50% Advance",
  "Advance Payment",
  "After Delivery",
  "20% ADV & 80% 45 Days AFTER Delivery",
  "07 Days",
  "75% ADV & 25% After COMPLETION",
  "20 to 30 DAYS",
  "5 Days",
  "ON DELIVERY",
  "30 Days After Delivery",
  "15 Days After Receiving Of Material",
  "50% Adv, 30% BTW Work & 20% After Comple",
  "50% ADV & 50% ON DELIVERY",
  "30 DAYS PDC AFTER DELIVERY",
  "45 - 60 Days",
  "10 DAYS PDC AFTER DELIVERY",
  "7 DAYS PDC",
  "30 DAYS PDC",
  "15 DAYS PDC",
] as const;

/** Import (foreign purchase) payment terms */
export const IMPORT_PAYMENT_TERMS = [
  "L/C at sight",
  "DA",
  "Bank Contract",
  "Upon Approval Of Finance For The Bank",
  "CAD AT SIGHT",
  "DP AT SIGHT",
  "L/C SIGHT",
  "30 Days From ( B/L Date )",
  "90 Days From ( B/L Date )",
  "60 Days From ( B/L Date )",
  "45 DAYS AFTER ( B/L DATE )",
  "90 Days After BL",
  "BANK CONTRACT AT SIGHT",
  "Advance Payment",
] as const;

/** Export (sales PFI to customers) payment terms */
export const EXPORT_PAYMENT_TERMS = [
  "L/C at sight",
  "DA",
  "Bank Contract",
  "CAD AT SIGHT",
  "DP AT SIGHT",
  "30 Days From ( B/L Date )",
  "60 Days From ( B/L Date )",
  "90 Days From ( B/L Date )",
  "45 DAYS AFTER ( B/L DATE )",
  "Advance Payment",
  "50% Advance",
  "50% ADV & 50% ON DELIVERY",
] as const;

/** @deprecated use LOCAL_PAYMENT_TERMS */
export const PAYMENT_TERMS = LOCAL_PAYMENT_TERMS;

/** @deprecated use IMPORT_PAYMENT_TERMS */
export const IMPORT_PO_PAYMENT_TERMS = IMPORT_PAYMENT_TERMS;

/** Local delivery terms (domestic suppliers — not import/export incoterms) */
export const LOCAL_INCO_TERMS = [
  "URGENT",
  "AS PER REQUIRED",
  "CFR KARACHI",
  "EX-WORK",
] as const;

/** @deprecated use LOCAL_INCO_TERMS */
export const INCO_TERMS = LOCAL_INCO_TERMS;

/** Local supplier SRB (Sindh Revenue Board) sales tax / withholding rate */
export const LOCAL_SRB_RATES = [
  "0%",
  "1%",
  "2%",
  "3%",
  "4%",
  "5%",
  "10%",
  "16%",
  "17%",
  "18%",
  "Exempt",
  "As applicable",
] as const;

/** Local purchase order sales tax rate (percentage) */
export const LOCAL_SALES_TAX_RATES = LOCAL_SRB_RATES;

/** Import (foreign) PO — incoterms */
export const IMPORT_INCO_TERMS = ["CFR", "FOB", "EXWORK"] as const;

/** @deprecated use IMPORT_INCO_TERMS */
export const IMPORT_PO_INCO_TERMS = IMPORT_INCO_TERMS;

/** Export PFI — incoterms */
export const EXPORT_INCO_TERMS = ["CFR", "FOB", "EXWORK", "CIF"] as const;

/** Purchase requisition — requesting department */
export const PR_DEPARTMENTS = [
  "Production",
  "QC",
  "QC Lab",
  "Store",
  "Maintenance",
  "Local Purchase",
  "R&D",
  "Engineering",
  "Packaging",
  "Warehouse",
  "Procurement",
  "Administration",
  "HR",
  "Finance",
  "IT",
  "Sales",
  "Staff",
] as const;

export type ProcurementTradeScope = "local" | "import" | "export";

export function paymentTermsForScope(scope: ProcurementTradeScope): readonly string[] {
  switch (scope) {
    case "local":
      return LOCAL_PAYMENT_TERMS;
    case "import":
      return IMPORT_PAYMENT_TERMS;
    case "export":
      return EXPORT_PAYMENT_TERMS;
    default:
      return LOCAL_PAYMENT_TERMS;
  }
}

export function incoTermsForScope(scope: ProcurementTradeScope): readonly string[] {
  switch (scope) {
    case "local":
      return LOCAL_INCO_TERMS;
    case "import":
      return IMPORT_INCO_TERMS;
    case "export":
      return EXPORT_INCO_TERMS;
    default:
      return LOCAL_INCO_TERMS;
  }
}

export function optionsWithCurrent<T extends string>(options: readonly T[], current?: string): string[] {
  const trimmed = current?.trim();
  if (!trimmed || (options as readonly string[]).includes(trimmed)) {
    return [...options];
  }
  return [trimmed, ...options];
}
