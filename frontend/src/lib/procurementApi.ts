import { getBackendUrl } from "./getBackendUrl";
import { redirectToProcurementLogin } from "./portalSession";
import type { DashboardStatsBySection } from "./procurementDashboard";
import { filterSuppliersBySection } from "./procurementScope";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["x-company-id"] = localStorage.getItem("company_id") || "RESSICHEM";
  return headers;
}

const REQUEST_TIMEOUT_MS = 45000;

async function request<T = { success: boolean; data?: unknown; message?: string }>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiBase = getBackendUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
      headers: { ...getHeaders(), ...(options.headers || {}) },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `Backend request timed out (${apiBase}). Ensure the API server is running and reachable.`
      );
    }
    if (err instanceof TypeError) {
      throw new Error(`Cannot reach backend at ${apiBase}. Check that the server is running.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = (json as { message?: string })?.message || `Request failed (${response.status})`;
    if (/buffering timed out/i.test(message)) {
      message = "Database is not connected. Restart the backend server and try again.";
    } else if (response.status === 503) {
      message = message || "Database is not ready. Please wait a moment and refresh.";
    }
    // Only unauthenticated (401) should force re-login. 403 is permission denied —
    // logging the user out made PR requesters bounce to login when catalog/supplier
    // calls failed (they have items/PR perms but not vendors.read).
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/procurement") &&
      response.status === 401
    ) {
      redirectToProcurementLogin();
    }
    throw new Error(message);
  }
  return json as T;
}

export type ProcurementUser = {
  _id: string;
  user_id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  role?: string;
  roles?: { name: string }[];
  permissions?: { key: string }[];
  modules?: string[];
  isActive?: boolean;
  createdAt?: string;
};

export type ProcurementSupplier = {
  _id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  street?: string;
  city?: string;
  address?: string;
  country?: string;
  countryCode?: string;
  phoneDialCode?: string;
  defaultCurrency?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  incoTerm?: string;
  hsCode?: string;
  taxId?: string;
  strn?: string;
  incomeTaxExemption?: string;
  srb?: string;
  banking?: {
    bankName?: string;
    accountNo?: string;
    swift?: string;
    branch?: string;
    address?: string;
  };
  status?: string;
};

export type ProcurementItem = {
  _id: string;
  itemCode: string;
  name: string;
  description?: string;
  hsCode?: string;
  unit?: string;
  category?: string;
  tradeScope?: "local" | "import";
  preferredSupplier?: ProcurementSupplier | string;
};

export type ProcurementItemPrice = {
  _id: string;
  item: ProcurementItem | string;
  supplier: ProcurementSupplier | string;
  currency: string;
  unitPrice: number;
  minOrderQty?: number;
  leadTimeDays?: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
};

export type LineItem = {
  _id?: string;
  item?: string;
  itemCode?: string;
  itemName?: string;
  supplier?: string;
  supplierName?: string;
  description?: string;
  size?: string;
  material?: string;
  hsCode?: string;
  packing?: string;
  shipmentNote?: string;
  remarks?: string;
  unit?: string;
  priceUom?: string;
  quantity: number;
  receivedQuantity?: number;
  unitPrice: number;
  currency?: string;
  lineTotal?: number;
  department?: string;
};

export type PrApproval = {
  _id?: string;
  department: string;
  departmentKey?: string;
  approver?: ProcurementUser | string;
  status: "pending" | "approved" | "rejected" | "held" | string;
  actedAt?: string;
  reason?: string;
};

export type PurchaseDocument = {
  _id: string;
  purchaseType?: "local" | "foreign";
  pfiFlow?: "import_received" | "export_issued" | "export_received";
  sourceDocument?: {
    path?: string;
    firebasePath?: string;
    storage?: "local" | "firebase";
    originalName?: string;
    mimeType?: string;
    size?: number;
  };
  quoteNumber?: string;
  requisitionNumber?: string;
  poNumber?: string;
  pfiNumber?: string;
  supplier?: ProcurementSupplier | string;
  suppliers?: (ProcurementSupplier | string)[];
  title?: string;
  status: string;
  rejectionReason?: string;
  holdReason?: string;
  currency?: string;
  exchangeRate?: number;
  items?: LineItem[];
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  notes?: string;
  documentDate?: string;
  createdAt?: string;
  updatedAt?: string;
  requestedBy?: ProcurementUser | string;
  submittedBy?: ProcurementUser | string;
  submittedAt?: string;
  assignedApprover?: ProcurementUser | string;
  approvals?: PrApproval[];
  approvedBy?: ProcurementUser | string;
  approvedAt?: string;
  rejectedBy?: ProcurementUser | string;
  rejectedAt?: string;
  heldBy?: ProcurementUser | string;
  heldAt?: string;
  /** Linked PO / stock fulfillment (PR monthly report enrichment). */
  stockStatus?: string;
  poId?: string | null;
  poStatus?: string;
  qtyOrdered?: number;
  qtyReceived?: number;
};

export type CostingScenario = {
  unitPrice?: number;
  insuranceUsd?: number;
  landingPct?: number;
  amountUsd?: number;
  landingUsd?: number;
  exchangeRate?: number;
  amountPkr?: number;
  cd?: number;
  addCd?: number;
  adSalesTax?: number;
  salesTax?: number;
  incomeTax?: number;
  totalDuties?: number;
  otherTotal?: number;
  gTotal?: number;
  priceInclAllTaxes?: number;
  priceWithoutSalesTax?: number;
};

export type ProcurementCosting = {
  _id: string;
  costingNumber?: string;
  tradeScope?: "local" | "import";
  status?: string;
  documentDate?: string;
  hsCode?: string;
  bondCiDate?: string;
  product?: string;
  productDetail?: string;
  qtyExBond?: number;
  currency?: string;
  exchangeRate?: number;
  taxPurposeUnitPrice?: number;
  taxPurposeInsuranceUsd?: number;
  taxPurposeLandingPct?: number;
  inclusiveUnitPrice?: number;
  inclusiveInsuranceUsd?: number;
  inclusiveLandingPct?: number;
  cdPct?: number;
  addCdPct?: number;
  adSalesTaxPct?: number;
  salesTaxPct?: number;
  incomeTaxPct?: number;
  whsc?: number;
  dutiesBond?: number;
  agentBill?: number;
  insurancePkr?: number;
  bankComm?: number;
  otherCharges?: number;
  notes?: string;
  taxPurpose?: CostingScenario;
  allInclusive?: CostingScenario;
  createdAt?: string;
};

export type ProcurementExportRecord = {
  _id: string;
  recordType: "document" | "shipment";
  recordNumber: string;
  customer?: ProcurementSupplier | string;
  documentCategory?: string;
  referenceNumber?: string;
  documentDate?: string;
  notes?: string;
  sourceDocument?: {
    path?: string;
    firebasePath?: string;
    storage?: "local" | "firebase";
    originalName?: string;
    mimeType?: string;
    size?: number;
  };
  lcNumber?: string;
  lcIssueDate?: string;
  lcExpiryDate?: string;
  lcAmendment1?: string;
  lcAmendment2?: string;
  lcAmendment3?: string;
  vesselName?: string;
  ets?: string;
  eta?: string;
  docsDispatchDate?: string;
  docsReceiveDate?: string;
  dhlNumber?: string;
  createdAt?: string;
};

/** Keep in sync with backend SUPPORTED_CURRENCIES (procurementHelpers.js) */
export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "JPY",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "INR",
  "PKR",
  "BDT",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
  "HKD",
  "KRW",
  "TWD",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "TRY",
  "ZAR",
  "MXN",
  "BRL",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "EGP",
  "NGN",
  "KES",
  "RUB",
] as const;

/** Reference currency for auto exchange rates (1 document currency = rate × base). Default USD. */
export const PROCUREMENT_BASE_CURRENCY =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PROCUREMENT_BASE_CURRENCY) || "USD";

export type ExchangeRateInfo = {
  currency: string;
  base: string;
  rate: number;
  date: string;
  label: string;
  source?: string;
};

export type ProcurementImportEntity = "suppliers" | "items" | "requisitions" | "purchase-orders";

export type ProcurementImportResult = {
  success: boolean;
  type: ProcurementImportEntity;
  section: "local" | "import";
  createdCount: number;
  updatedCount?: number;
  skippedCount?: number;
  failedCount: number;
  created: Array<Record<string, unknown>>;
  updated?: Array<Record<string, unknown>>;
  skipped?: Array<{ row: string | number; message: string; supplierCode?: string }>;
  failed: Array<{ row: string | number; message: string }>;
};

function importAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    "x-company-id": (typeof window !== "undefined" && localStorage.getItem("company_id")) || "RESSICHEM",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function parseContentDispositionFilename(header: string | null, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] || fallback;
}

const OPEN_PFI_STATUSES = new Set(["draft", "sent", "accepted"]);

function countRequisitionStats(rows: PurchaseDocument[]) {
  const submitted = rows.filter((r) => r.status === "submitted").length;
  const held = rows.filter((r) => r.status === "held").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;
  return {
    draft: rows.filter((r) => r.status === "draft").length,
    pending: submitted + held,
    submitted,
    held,
    rejected,
    approved: rows.filter((r) => r.status === "approved").length,
    total: rows.length,
  };
}

function countPurchaseOrderStats(rows: PurchaseDocument[]) {
  return {
    draft: rows.filter((r) => r.status === "draft").length,
    issued: rows.filter((r) => r.status === "issued").length,
    total: rows.length,
  };
}

function countOpenPfi(rows: PurchaseDocument[]) {
  return rows.filter((r) => r.status && OPEN_PFI_STATUSES.has(r.status)).length;
}

/** When the API still returns legacy `stats` (no statsBySection), derive section counts from list endpoints. */
async function loadDashboardSectionStatsFallback(): Promise<DashboardStatsBySection> {
  const [
    suppliersRes,
    localItemsRes,
    importItemsRes,
    localPrRes,
    foreignPrRes,
    localPoRes,
    foreignPoRes,
    importPfiRes,
    exportPfiRes,
    exportPfiRecvRes,
    documentsRes,
    shipmentsRes,
  ] = await Promise.all([
    request<{ success: boolean; data: ProcurementSupplier[] }>("/api/procurement/suppliers"),
    request<{ success: boolean; data: ProcurementItem[] }>("/api/procurement/items?tradeScope=local"),
    request<{ success: boolean; data: ProcurementItem[] }>("/api/procurement/items?tradeScope=import"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/requisitions?purchaseType=local"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/requisitions?purchaseType=foreign"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/purchase-orders?purchaseType=local"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/purchase-orders?purchaseType=foreign"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/pfi?pfiFlow=import_received"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/pfi?pfiFlow=export_issued"),
    request<{ success: boolean; data: PurchaseDocument[] }>("/api/procurement/pfi?pfiFlow=export_received"),
    request<{ success: boolean; data: unknown[] }>("/api/procurement/export-records?recordType=document"),
    request<{ success: boolean; data: unknown[] }>("/api/procurement/export-records?recordType=shipment"),
  ]);

  const suppliers = suppliersRes.data || [];
  const localPr = localPrRes.data || [];
  const foreignPr = foreignPrRes.data || [];
  const localPo = localPoRes.data || [];
  const foreignPo = foreignPoRes.data || [];

  return {
    local: {
      suppliers: filterSuppliersBySection(suppliers, "local").length,
      items: (localItemsRes.data || []).length,
      requisitions: countRequisitionStats(localPr),
      purchaseOrders: countPurchaseOrderStats(localPo),
    },
    import: {
      suppliers: filterSuppliersBySection(suppliers, "import").length,
      items: (importItemsRes.data || []).length,
      pfiOpen: countOpenPfi(importPfiRes.data || []),
      requisitions: countRequisitionStats(foreignPr),
      purchaseOrders: countPurchaseOrderStats(foreignPo),
    },
    export: {
      pfiIssuedOpen: countOpenPfi(exportPfiRes.data || []),
      pfiReceivedOpen: countOpenPfi(exportPfiRecvRes.data || []),
      documents: (documentsRes.data || []).length,
      shipments: (shipmentsRes.data || []).length,
    },
  };
}

type DashboardApiResponse = {
  success?: boolean;
  user?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  statsBySection?: DashboardStatsBySection;
  permissions?: string[];
  message?: string;
};

export const procurementApi = {
  getDashboard: async () => {
    try {
      const res = await request<DashboardApiResponse>("/api/procurement/dashboard", { cache: "no-store" });
      if (res.statsBySection) return res;
    } catch {
      // Dashboard endpoint may be blocked (missing procurement.dashboard.read) — derive counts from list APIs.
    }
    const statsBySection = await loadDashboardSectionStatsFallback();
    return { success: true, statsBySection };
  },
  listUsers: () =>
    request<{ success: boolean; users: ProcurementUser[] }>("/api/procurement/users"),
  getUser: (id: string) =>
    request<{ success: boolean; user: ProcurementUser }>(`/api/procurement/users/${id}`),
  createUser: (body: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
    area?: string;
    accessLevel?: string;
    department?: string;
  }) => request(`/api/procurement/users`, { method: "POST", body: JSON.stringify(body) }),
  updateUser: (
    id: string,
    body: {
      firstName?: string;
      lastName?: string;
      role?: string;
      phone?: string;
      department?: string;
      area?: string;
      accessLevel?: string;
      isActive?: boolean;
      password?: string;
    }
  ) => request<{ success: boolean; user: ProcurementUser }>(`/api/procurement/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }),

  listDepartmentApprovers: () =>
    request<{
      success: boolean;
      data: {
        _id: string;
        department: string;
        approverEmail: string;
        approverName?: string;
        isActive?: boolean;
      }[];
    }>("/api/procurement/department-approvers"),
  listPrDepartments: () =>
    request<{ success: boolean; data: string[] }>("/api/procurement/department-approvers/departments"),
  createDepartmentApprover: (body: {
    department: string;
    approverEmail: string;
    approverName?: string;
    isActive?: boolean;
  }) =>
    request<{ success: boolean; data: unknown; warning?: string }>(
      `/api/procurement/department-approvers`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  updateDepartmentApprover: (
    id: string,
    body: {
      department?: string;
      approverEmail?: string;
      approverName?: string;
      isActive?: boolean;
    }
  ) =>
    request(`/api/procurement/department-approvers/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteDepartmentApprover: (id: string) =>
    request(`/api/procurement/department-approvers/${id}`, { method: "DELETE" }),

  getExchangeRate: (currency: string, base = PROCUREMENT_BASE_CURRENCY) => {
    const sp = new URLSearchParams({ currency, base });
    return request<{ success: boolean; data: ExchangeRateInfo }>(`/api/procurement/exchange-rate?${sp}`);
  },

  listSuppliers: (params?: { search?: string }) => {
    const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
    return request<{ success: boolean; data: ProcurementSupplier[] }>(`/api/procurement/suppliers${q}`);
  },
  getSupplier: (id: string) =>
    request<{ success: boolean; data: ProcurementSupplier }>(`/api/procurement/suppliers/${id}`),
  createSupplier: (body: Partial<ProcurementSupplier>) =>
    request(`/api/procurement/suppliers`, { method: "POST", body: JSON.stringify(body) }),
  updateSupplier: (id: string, body: Partial<ProcurementSupplier>) =>
    request(`/api/procurement/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSupplier: (id: string) => request(`/api/procurement/suppliers/${id}`, { method: "DELETE" }),

  listItems: (params?: { search?: string; category?: string; tradeScope?: string }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.category) sp.set("category", params.category);
    if (params?.tradeScope) sp.set("tradeScope", params.tradeScope);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementItem[] }>(`/api/procurement/items${q}`);
  },
  createItem: (body: Partial<ProcurementItem>) =>
    request(`/api/procurement/items`, { method: "POST", body: JSON.stringify(body) }),
  updateItem: (id: string, body: Partial<ProcurementItem>) =>
    request(`/api/procurement/items/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteItem: (id: string) => request(`/api/procurement/items/${id}`, { method: "DELETE" }),

  listCurrencies: () => request<{ success: boolean; data: string[] }>("/api/procurement/prices/currencies"),
  listPrices: (params?: { itemId?: string; supplierId?: string; currency?: string }) => {
    const sp = new URLSearchParams();
    if (params?.itemId) sp.set("itemId", params.itemId);
    if (params?.supplierId) sp.set("supplierId", params.supplierId);
    if (params?.currency) sp.set("currency", params.currency);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementItemPrice[] }>(`/api/procurement/prices${q}`);
  },
  createPrice: (body: Record<string, unknown>) =>
    request(`/api/procurement/prices`, { method: "POST", body: JSON.stringify(body) }),
  updatePrice: (id: string, body: Record<string, unknown>) =>
    request(`/api/procurement/prices/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePrice: (id: string) => request(`/api/procurement/prices/${id}`, { method: "DELETE" }),

  listRequisitions: (params?: { status?: string; purchaseType?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.purchaseType) sp.set("purchaseType", params.purchaseType);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: PurchaseDocument[] }>(`/api/procurement/requisitions${q}`);
  },
  createRequisition: (body: Record<string, unknown>) =>
    request(`/api/procurement/requisitions`, { method: "POST", body: JSON.stringify(body) }),
  getRequisition: (id: string) =>
    request<{ success: boolean; data: PurchaseDocument }>(`/api/procurement/requisitions/${id}`),
  updateRequisition: (id: string, body: Record<string, unknown>) =>
    request(`/api/procurement/requisitions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  submitRequisition: (id: string) =>
    request(`/api/procurement/requisitions/${id}/submit`, { method: "POST" }),
  approveRequisition: (id: string) =>
    request(`/api/procurement/requisitions/${id}/approve`, { method: "POST" }),
  rejectRequisition: (id: string, reason: string) =>
    request(`/api/procurement/requisitions/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  holdRequisition: (id: string, reason: string) =>
    request(`/api/procurement/requisitions/${id}/hold`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  releaseRequisitionHold: (id: string) =>
    request(`/api/procurement/requisitions/${id}/release-hold`, { method: "POST" }),

  monthlyPrReport: (params: {
    year: number;
    month: number;
    purchaseType?: string;
    status?: string;
    stockStatus?: string;
    department?: string;
    dateField?: "createdAt" | "submittedAt" | "approvedAt";
  }) => {
    const sp = new URLSearchParams();
    sp.set("year", String(params.year));
    sp.set("month", String(params.month));
    if (params.purchaseType) sp.set("purchaseType", params.purchaseType);
    if (params.status) sp.set("status", params.status);
    if (params.stockStatus) sp.set("stockStatus", params.stockStatus);
    if (params.department) sp.set("department", params.department);
    if (params.dateField) sp.set("dateField", params.dateField);
    return request<{
      success: boolean;
      data: {
        year: number;
        month: number;
        dateField: string;
        summary: {
          total: number;
          pending: number;
          awaitingReceipt?: number;
          partiallyReceived?: number;
          fullyReceived?: number;
          byStatus: Record<string, number>;
          byStock?: Record<string, number>;
          byDepartment: Record<string, number>;
        };
        rows: PurchaseDocument[];
      };
    }>(`/api/procurement/requisitions/report/monthly?${sp}`);
  },

  monthlyPrReportExportPath: (params: {
    year: number;
    month: number;
    purchaseType?: string;
    status?: string;
    stockStatus?: string;
    department?: string;
    dateField?: "createdAt" | "submittedAt" | "approvedAt";
    format?: "xlsx" | "csv";
  }) => {
    const sp = new URLSearchParams();
    sp.set("year", String(params.year));
    sp.set("month", String(params.month));
    sp.set("format", params.format || "xlsx");
    if (params.purchaseType) sp.set("purchaseType", params.purchaseType);
    if (params.status) sp.set("status", params.status);
    if (params.stockStatus) sp.set("stockStatus", params.stockStatus);
    if (params.department) sp.set("department", params.department);
    if (params.dateField) sp.set("dateField", params.dateField);
    return `/api/procurement/requisitions/report/monthly/export?${sp}`;
  },

  listPurchaseOrders: (params?: { status?: string; purchaseType?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.purchaseType) sp.set("purchaseType", params.purchaseType);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: PurchaseDocument[] }>(`/api/procurement/purchase-orders${q}`);
  },
  createPurchaseOrder: (body: Record<string, unknown>) =>
    request(`/api/procurement/purchase-orders`, { method: "POST", body: JSON.stringify(body) }),
  updatePurchaseOrder: (id: string, body: Record<string, unknown>) =>
    request(`/api/procurement/purchase-orders/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  issuePurchaseOrder: (id: string) =>
    request(`/api/procurement/purchase-orders/${id}/issue`, { method: "POST" }),
  deletePurchaseOrder: (id: string) =>
    request(`/api/procurement/purchase-orders/${id}`, { method: "DELETE" }),
  bulkDeletePurchaseOrders: (ids: string[]) =>
    request(`/api/procurement/purchase-orders/bulk-delete`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  listPFI: (params?: { status?: string; pfiFlow?: string; purchaseType?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.pfiFlow) sp.set("pfiFlow", params.pfiFlow);
    if (params?.purchaseType) sp.set("purchaseType", params.purchaseType);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: PurchaseDocument[] }>(`/api/procurement/pfi${q}`);
  },
  getPFI: (id: string) => request<{ success: boolean; data: PurchaseDocument }>(`/api/procurement/pfi/${id}`),
  createPFI: (body: Record<string, unknown>) =>
    request(`/api/procurement/pfi`, { method: "POST", body: JSON.stringify(body) }),
  uploadReceivedPFI: async (formData: FormData) => {
    const apiBase = getBackendUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: HeadersInit = {
      "x-company-id": (typeof window !== "undefined" && localStorage.getItem("company_id")) || "RESSICHEM",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${apiBase}/api/procurement/pfi/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as { message?: string })?.message || `Upload failed (${response.status})`);
    }
    return json as { success: boolean; data: PurchaseDocument };
  },
  updatePFI: (id: string, body: Record<string, unknown>) =>
    request(`/api/procurement/pfi/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  convertPFIToPO: (id: string) =>
    request(`/api/procurement/pfi/${id}/convert-to-po`, { method: "POST" }),
  deletePFI: (id: string) => request(`/api/procurement/pfi/${id}`, { method: "DELETE" }),

  listExportRecords: (params?: { recordType?: "document" | "shipment" }) => {
    const sp = new URLSearchParams();
    if (params?.recordType) sp.set("recordType", params.recordType);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementExportRecord[] }>(`/api/procurement/export-records${q}`);
  },
  getExportRecord: (id: string) =>
    request<{ success: boolean; data: ProcurementExportRecord }>(`/api/procurement/export-records/${id}`),
  uploadExportDocument: async (formData: FormData) => {
    const apiBase = getBackendUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: HeadersInit = {
      "x-company-id": (typeof window !== "undefined" && localStorage.getItem("company_id")) || "RESSICHEM",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${apiBase}/api/procurement/export-records/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as { message?: string })?.message || `Upload failed (${response.status})`);
    }
    return json as { success: boolean; data: ProcurementExportRecord };
  },
  createExportShipment: (body: Record<string, unknown>) =>
    request<{ success: boolean; data: ProcurementExportRecord }>(`/api/procurement/export-records/shipments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateExportShipment: (id: string, body: Record<string, unknown>) =>
    request<{ success: boolean; data: ProcurementExportRecord }>(`/api/procurement/export-records/shipments/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteExportRecord: (id: string) =>
    request(`/api/procurement/export-records/${id}`, { method: "DELETE" }),

  getPurchaseOrder: (id: string) =>
    request<{ success: boolean; data: PurchaseDocument }>(`/api/procurement/purchase-orders/${id}`),

  downloadImportTemplate: async (entity: ProcurementImportEntity, format: "xlsx" | "csv" = "xlsx") => {
    const apiBase = getBackendUrl();
    const response = await fetch(
      `${apiBase}/api/procurement/import/templates/${entity}?format=${format}`,
      { headers: importAuthHeaders() }
    );
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error((json as { message?: string })?.message || `Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const filename = parseContentDispositionFilename(
      response.headers.get("Content-Disposition"),
      `procurement-${entity}-template.${format}`
    );
    return { blob, filename };
  },

  uploadImport: async (
    entity: ProcurementImportEntity,
    section: "local" | "import",
    file: File
  ): Promise<ProcurementImportResult> => {
    const apiBase = getBackendUrl();
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${apiBase}/api/procurement/import/${entity}?section=${section}`, {
      method: "POST",
      headers: importAuthHeaders(),
      body: formData,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as { message?: string })?.message || `Import failed (${response.status})`);
    }
    return json as ProcurementImportResult;
  },

  listCosting: (params?: { tradeScope?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.tradeScope) sp.set("tradeScope", params.tradeScope);
    if (params?.status) sp.set("status", params.status);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementCosting[] }>(`/api/procurement/costing${q}`);
  },
  getCosting: (id: string) =>
    request<{ success: boolean; data: ProcurementCosting }>(`/api/procurement/costing/${id}`),
  previewCosting: (body: Record<string, unknown>) =>
    request<{ success: boolean; data: { taxPurpose: CostingScenario; allInclusive: CostingScenario } }>(
      `/api/procurement/costing/preview`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  createCosting: (body: Record<string, unknown>) =>
    request(`/api/procurement/costing`, { method: "POST", body: JSON.stringify(body) }),
  updateCosting: (id: string, body: Record<string, unknown>) =>
    request(`/api/procurement/costing/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCosting: (id: string) => request(`/api/procurement/costing/${id}`, { method: "DELETE" }),

  convertRequisitionToPO: (id: string, body?: { supplier?: string }) =>
    request<{ success: boolean; message?: string; data?: PurchaseDocument }>(
      `/api/procurement/requisitions/${id}/convert-to-po`,
      { method: "POST", body: JSON.stringify(body || {}) }
    ),
  receivePurchaseOrder: (
    id: string,
    body: {
      receiptDate?: string;
      notes?: string;
      items: { poLineId: string; receivedQuantity: number; remarks?: string }[];
    }
  ) =>
    request(`/api/procurement/purchase-orders/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  closePurchaseOrder: (id: string) =>
    request(`/api/procurement/purchase-orders/${id}/close`, { method: "POST" }),

  listGrn: (params?: { purchaseType?: string; purchaseOrder?: string }) => {
    const sp = new URLSearchParams();
    if (params?.purchaseType) sp.set("purchaseType", params.purchaseType);
    if (params?.purchaseOrder) sp.set("purchaseOrder", params.purchaseOrder);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementGrn[] }>(`/api/procurement/grn${q}`);
  },
  getGrn: (id: string) => request<{ success: boolean; data: ProcurementGrn }>(`/api/procurement/grn/${id}`),

  listSupplierInvoices: (params?: { purchaseType?: string; status?: string; purchaseOrder?: string }) => {
    const sp = new URLSearchParams();
    if (params?.purchaseType) sp.set("purchaseType", params.purchaseType);
    if (params?.status) sp.set("status", params.status);
    if (params?.purchaseOrder) sp.set("purchaseOrder", params.purchaseOrder);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementSupplierInvoice[] }>(
      `/api/procurement/supplier-invoices${q}`
    );
  },
  createSupplierInvoice: (body: Record<string, unknown>) =>
    request(`/api/procurement/supplier-invoices`, { method: "POST", body: JSON.stringify(body) }),
  matchSupplierInvoice: (id: string, body?: { matchNotes?: string }) =>
    request(`/api/procurement/supplier-invoices/${id}/match`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),

  listPayments: (params?: { purchaseType?: string; supplierInvoice?: string }) => {
    const sp = new URLSearchParams();
    if (params?.purchaseType) sp.set("purchaseType", params.purchaseType);
    if (params?.supplierInvoice) sp.set("supplierInvoice", params.supplierInvoice);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ success: boolean; data: ProcurementPayment[] }>(`/api/procurement/payments${q}`);
  },
  createPayment: (body: Record<string, unknown>) =>
    request(`/api/procurement/payments`, { method: "POST", body: JSON.stringify(body) }),
};

export type ProcurementGrn = {
  _id: string;
  grnNumber: string;
  purchaseOrder?: PurchaseDocument | string;
  supplier?: ProcurementSupplier | string;
  purchaseType?: "local" | "foreign";
  receiptDate?: string;
  status?: string;
  items?: {
    poLineId?: string;
    itemCode?: string;
    itemName?: string;
    orderedQuantity?: number;
    receivedQuantity?: number;
    unit?: string;
    lineTotal?: number;
  }[];
  notes?: string;
  createdAt?: string;
};

export type ProcurementSupplierInvoice = {
  _id: string;
  invoiceNumber: string;
  supplierInvoiceNo?: string;
  purchaseOrder?: PurchaseDocument | string;
  supplier?: ProcurementSupplier | string;
  purchaseType?: "local" | "foreign";
  invoiceDate?: string;
  currency?: string;
  total?: number;
  amountPaid?: number;
  matchStatus?: string;
  matchedPoTotal?: number;
  matchedReceivedTotal?: number;
  status?: string;
  notes?: string;
};

export type ProcurementPayment = {
  _id: string;
  paymentNumber: string;
  supplierInvoice?: ProcurementSupplierInvoice | string;
  purchaseOrder?: PurchaseDocument | string;
  supplier?: ProcurementSupplier | string;
  purchaseType?: "local" | "foreign";
  paymentDate?: string;
  amount?: number;
  currency?: string;
  method?: string;
  reference?: string;
  status?: string;
  notes?: string;
};
