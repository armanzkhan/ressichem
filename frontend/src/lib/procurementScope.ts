import type { ProcurementItem, ProcurementSupplier, PurchaseDocument } from "./procurementApi";
import type { PurchaseType } from "./procurementDocumentTypes";

export type TradeSection = "local" | "import" | "export";

export type PfiFlow = "import_received" | "export_issued" | "export_received";

export type TradeModule =
  | "suppliers"
  | "items"
  | "po"
  | "pr"
  | "reports"
  | "costing"
  | "grn"
  | "invoices"
  | "payments"
  | "pfi-received"
  | "pfi"
  | "documents"
  | "shipment-details";

export const SECTION_MODULES: Record<TradeSection, TradeModule[]> = {
  local: ["suppliers", "items", "pr", "po", "grn", "invoices", "payments", "reports", "costing"],
  import: ["suppliers", "items", "pr", "po", "grn", "invoices", "payments", "reports", "pfi-received", "costing"],
  export: ["pfi", "pfi-received", "documents", "shipment-details"],
};

export const MODULE_LABELS: Record<TradeModule, string> = {
  suppliers: "Suppliers",
  items: "Items",
  po: "Purchase orders",
  pr: "Requisitions",
  reports: "PR Reports",
  costing: "Landed costing",
  grn: "Purchase receipts",
  invoices: "Supplier invoices",
  payments: "Payments",
  "pfi-received": "PFI received",
  pfi: "PFI",
  documents: "Documents Upload",
  "shipment-details": "Shipment Details",
};

export function isLocalSupplier(supplier?: ProcurementSupplier | null): boolean {
  const c = (supplier?.country || "").toLowerCase().trim();
  if (!c) return false;
  return c.includes("pakistan") || c === "pk";
}

export function purchaseTypeForSection(section: TradeSection): PurchaseType {
  return section === "local" ? "local" : "foreign";
}

export function filterSuppliersBySection(
  suppliers: ProcurementSupplier[],
  section: "local" | "import"
): ProcurementSupplier[] {
  return suppliers.filter((s) => (section === "local" ? isLocalSupplier(s) : !isLocalSupplier(s)));
}

export function itemTradeScope(item: ProcurementItem): "local" | "import" {
  return item.tradeScope === "local" ? "local" : "import";
}

export function filterItemsBySection(items: ProcurementItem[], section: "local" | "import"): ProcurementItem[] {
  return items.filter((item) => itemTradeScope(item) === section);
}

export function filterPurchaseOrdersBySection(
  rows: PurchaseDocument[],
  section: "local" | "import"
): PurchaseDocument[] {
  const wantLocal = section === "local";
  return rows.filter((r) => (wantLocal ? r.purchaseType === "local" : r.purchaseType !== "local"));
}

export function filterRequisitionsBySection(
  rows: PurchaseDocument[],
  section: "local" | "import"
): PurchaseDocument[] {
  const wantLocal = section === "local";
  return rows.filter((r) => {
    const pt = (r as PurchaseDocument & { purchaseType?: string }).purchaseType;
    if (!pt) return wantLocal;
    return wantLocal ? pt === "local" : pt !== "local";
  });
}

export function filterPfiByFlow(rows: PurchaseDocument[], flow: PfiFlow): PurchaseDocument[] {
  return rows.filter((r) => {
    const docFlow = (r as PurchaseDocument & { pfiFlow?: PfiFlow }).pfiFlow || "import_received";
    return docFlow === flow;
  });
}

export function sectionTitle(section: TradeSection): string {
  if (section === "local") return "Local";
  if (section === "import") return "Import";
  return "Export";
}

export function pageTitle(section: TradeSection, module: TradeModule): string {
  const prefix = sectionTitle(section);
  if (section === "export" && module === "pfi") return `${prefix} — Create PFI`;
  if (section === "export" && module === "pfi-received") return `${prefix} — Received PFI`;
  if (section === "export" && module === "documents") return `${prefix} — Documents Upload`;
  if (section === "export" && module === "shipment-details") return `${prefix} — Shipment Details`;
  if (module === "pfi-received") return `${prefix} — Upload PFI & Document`;
  return `${prefix} — ${MODULE_LABELS[module]}`;
}

export function pfiFlowForPage(section: TradeSection, module: TradeModule): PfiFlow | null {
  if (module === "pfi-received") {
    return section === "import" ? "import_received" : "export_received";
  }
  if (section === "export" && module === "pfi") return "export_issued";
  return null;
}

export function isValidSectionModule(section: string, module: string): section is TradeSection {
  if (section !== "local" && section !== "import" && section !== "export") return false;
  return SECTION_MODULES[section].includes(module as TradeModule);
}
