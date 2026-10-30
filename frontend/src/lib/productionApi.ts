import { getBackendUrl } from "./getBackendUrl";

export type ProductionDepartment = "zrs" | "lms" | "drymix" | "bfs";
export type ProductionFactory = "hub" | "site" | "lahore";

export type MaterialLine = {
  name: string;
  code: string;
  lotNumber: string;
  qtyIssued: number;
  qtyConsumed: number;
  recipe?: string;
  actual?: string;
  supplier: string;
  qcStatus: string;
  source: "manual" | "sap" | "laboratory";
};

export type ProductionEntry = {
  _id: string;
  department: ProductionDepartment;
  factory: ProductionFactory;
  recordDate: string;
  grade: string;
  batchNumber: string;
  reactor: string;
  outputKg: number;
  plannedQtyKg: number;
  shift: string;
  operator: string;
  supervisor: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  machine: string;
  temperature: string;
  mixingTime: string;
  speed: string;
  processNotes: string;
  recipeName: string;
  recipeRevision: string;
  materials: MaterialLine[];
  qcStatus: string;
  labReportRef: string;
  resinBatch: string;
  hardenerBatch: string;
  kitSizeKg: number;
  kitQuantity: number;
  numberOfPacks: number;
  finishedBatch: string;
  qtyPackedKg: number;
  balanceKg: number;
  releaseStatus: string;
  wipOpeningKg: number;
  wipClosingKg: number;
  wastageKg: number;
  rejectedKg: number;
  reworkKg: number;
  downtimeMinutes: number;
  downtimeReason: string;
  deviation: string;
  lossReason: string;
  formatNo?: string;
  srNo?: string;
  vesselNo?: string;
  sheetDepartment?: string;
  chargingDate?: string;
  drainingDate?: string;
  chargingOperator?: string;
  drainingOperator?: string;
  inputKg?: number;
  yieldPct?: number;
  totalHours?: string;
  workOrderNo?: string;
  rawWeights?: Record<string, string>;
  qcSample?: Record<string, string>;
  packaging?: Record<string, string>;
  tempLog?: { time: string; reactorTemp: string; heatingTemp: string; coolingTemp: string; setPoint: string; pressure: string; remarks: string }[];
  additionalRemarks?: string;
  signOff?: Record<string, string>;
  createdByName?: string;
  updatedByName?: string;
  updatedAt?: string;
  labStatus?: "none" | "pending" | "partial" | "approved" | "rejected";
  labRecords?: LabRecord[];
};

export type LabRecord = {
  id: string;
  batchNo: string;
  source: "QC Site" | "QC Hub";
  lab: string;
  area: string;
  productName: string;
  status: string;
  testDate?: string | null;
  href: string;
};

export type ProductionCatalog = {
  factories: { id: ProductionFactory; label: string }[];
  departments: { id: ProductionDepartment; label: string; log: string }[];
  shifts: string[];
  reactors: string[];
  kitSizesKg: number[];
  qcStatuses: string[];
  releaseStatuses: string[];
  grades: Record<ProductionDepartment, string[]>;
};

export const DEPARTMENT_META: Record<
  ProductionDepartment,
  { label: string; short: string; dateLabel: string; packing: boolean; reactor: boolean }
> = {
  zrs: { label: "Reactor Area", short: "Reactors", dateLabel: "Charging date", packing: false, reactor: true },
  drymix: { label: "Drymix", short: "Drymix", dateLabel: "Date", packing: false, reactor: false },
  lms: { label: "Liquid (LMS)", short: "LMS", dateLabel: "Date", packing: false, reactor: false },
  bfs: { label: "BFS Packing", short: "BFS", dateLabel: "Packing date", packing: true, reactor: false },
};

export const FACTORY_LABEL: Record<ProductionFactory, string> = {
  hub: "Hub Factory",
  site: "SITE Factory",
  lahore: "Lahore Factory",
};

const ALL_DEPARTMENTS: ProductionDepartment[] = ["zrs", "lms", "drymix", "bfs"];

export function storedProductionDepartments(): ProductionDepartment[] {
  if (typeof window === "undefined") return ALL_DEPARTMENTS;
  try {
    const parsed = JSON.parse(localStorage.getItem("productionDepartments") || "");
    const allowed = Array.isArray(parsed) ? parsed.filter((id) => ALL_DEPARTMENTS.includes(id)) : [];
    if (allowed.length) return allowed as ProductionDepartment[];
  } catch {
    /* keep the full list until the session is refreshed */
  }
  return ALL_DEPARTMENTS;
}

function headers(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const company = typeof window !== "undefined" ? localStorage.getItem("company_id") || "RESSICHEM" : "RESSICHEM";
  const h: Record<string, string> = { "Content-Type": "application/json", "x-company-id": company };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    cache: "no-store",
    headers: { ...headers(), ...(options.headers || {}) },
  });
  if (path.endsWith("/export") && response.ok) return response as T;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as { message?: string }).message || `Request failed (${response.status})`);
  }
  return json as T;
}

export const productionApi = {
  catalog: () => request<{ success: boolean; data: ProductionCatalog }>("/api/production/catalog"),
  me: () => request<{ success: boolean; data: { email: string; departments: ProductionDepartment[] } }>("/api/production/auth/me"),
  lab: (batches: string[]) =>
    request<{ success: boolean; data: LabRecord[]; labStatus: string }>(
      `/api/production/lab?batches=${encodeURIComponent(batches.join(","))}`
    ),
  list: (query: string) =>
    request<{ success: boolean; data: ProductionEntry[]; totals: { count: number; outputKg: number; plannedQtyKg: number; wastageKg: number; rejectedKg: number } }>(
      `/api/production/entries${query}`
    ),
  create: (body: Record<string, unknown>) =>
    request<{ success: boolean; data: ProductionEntry }>("/api/production/entries", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    request<{ success: boolean; data: ProductionEntry }>(`/api/production/entries/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/production/entries/${id}`, { method: "DELETE" }),
  summary: () =>
    request<{
      success: boolean;
      data: { _id: { department: ProductionDepartment; factory: ProductionFactory }; count: number; outputKg: number; plannedQtyKg: number; wastageKg: number; rejectedKg: number; pendingQc: number }[];
    }>("/api/production/summary"),
  dpr: (query: string) => request<{ success: boolean; data: DprRow[] }>(`/api/production/dpr${query}`),
  trace: (q: string) =>
    request<{ success: boolean; data: { production: ProductionEntry[]; packing: ProductionEntry[] } }>(
      `/api/production/trace?q=${encodeURIComponent(q)}`
    ),
  async exportCsv(query: string) {
    const response = await fetch(`${getBackendUrl()}/api/production/entries/export${query}`, { headers: headers() });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error((json as { message?: string }).message || "Export failed");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "production-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};

export type DprRow = {
  date: string;
  factory: ProductionFactory;
  department: ProductionDepartment;
  shift: string;
  grade: string;
  machine: string;
  records: number;
  plannedQtyKg: number;
  outputKg: number;
  packingKg: number;
  materialConsumed: number;
  wastageKg: number;
  rejectedKg: number;
  reworkKg: number;
  downtimeMinutes: number;
  wipOpeningKg: number;
  wipClosingKg: number;
  pendingQc: number;
  operators: string[];
  yieldPct: number | null;
};
