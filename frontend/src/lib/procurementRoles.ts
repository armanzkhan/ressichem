import type { TradeSection } from "./procurementScope";

export type ProcurementArea = "local" | "import" | "export" | "local_import";
export type ProcurementAccessLevel = "viewer" | "user" | "buyer" | "approver" | "admin";

export const PROCUREMENT_AREAS: Array<{
  value: ProcurementArea;
  label: string;
  description: string;
}> = [
  {
    value: "local",
    label: "Local",
    description: "Domestic purchasing — Pakistan suppliers, local PO & PR",
  },
  {
    value: "import",
    label: "Import",
    description: "Foreign purchasing — import suppliers, PO, PR, received PFI",
  },
  {
    value: "local_import",
    label: "Local & Import",
    description: "Both domestic and foreign purchasing — local and import modules",
  },
  {
    value: "export",
    label: "Export",
    description: "Export sales — PFI, documents, shipment tracking",
  },
];

export const PROCUREMENT_ACCESS_LEVELS: Array<{
  value: ProcurementAccessLevel;
  label: string;
  description: string;
  roleName: string;
}> = [
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only — view records in your area",
    roleName: "Procurement Viewer",
  },
  {
    value: "user",
    label: "Requester",
    description: "Create purchase requisitions and view PR status only",
    roleName: "Procurement User",
  },
  {
    value: "buyer",
    label: "Buyer",
    description: "Buyer — create suppliers, items, requisitions, and POs",
    roleName: "Procurement Buyer",
  },
  {
    value: "approver",
    label: "Approver",
    description: "Review purchase requisitions — approve, reject, or hold",
    roleName: "Procurement Manager",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full access — all areas and user management",
    roleName: "Procurement Admin",
  },
];

/** Modules visible for each access level (within their allowed area). */
export const MODULES_BY_ACCESS_LEVEL: Record<ProcurementAccessLevel, string[] | "all"> = {
  viewer: "all",
  user: ["pr", "reports"],
  buyer: "all",
  approver: ["pr", "reports"],
  admin: "all",
};

export function modulesForAccessLevel(accessLevel: ProcurementAccessLevel): string[] | "all" {
  return MODULES_BY_ACCESS_LEVEL[accessLevel] || "all";
}

export function canAccessModule(accessLevel: ProcurementAccessLevel, module: string): boolean {
  const allowed = modulesForAccessLevel(accessLevel);
  if (allowed === "all") return true;
  return allowed.includes(module);
}

/** Areas offered on signup / user admin for each access level. */
export function areasForAccessLevel(accessLevel: ProcurementAccessLevel): ProcurementArea[] {
  if (accessLevel === "admin") return ["local", "import", "export"];
  if (accessLevel === "user" || accessLevel === "approver") {
    return ["local", "import", "local_import"];
  }
  return ["local", "import", "local_import", "export"];
}

export const PROCUREMENT_ASSIGNABLE_ROLES = PROCUREMENT_ACCESS_LEVELS.map((l) => l.roleName);

export function departmentFromArea(area: ProcurementArea): string {
  if (area === "local_import") return "Procurement — Local & Import";
  if (area === "import") return "Procurement — Import";
  if (area === "export") return "Procurement — Export";
  return "Procurement — Local";
}

export function areaFromDepartment(department?: string | null): ProcurementArea | "all" {
  const d = (department || "").toLowerCase();
  if (
    d.includes("local & import") ||
    d.includes("local and import") ||
    (d.includes("local") && d.includes("import"))
  ) {
    return "local_import";
  }
  if (d.includes("import")) return "import";
  if (d.includes("export")) return "export";
  if (d.includes("local")) return "local";
  return "all";
}

/** Legacy combined roles e.g. Procurement Local User */
export function areaFromLegacyRole(role?: string | null): ProcurementArea | null {
  const r = (role || "").toLowerCase();
  if (r.includes("import user")) return "import";
  if (r.includes("export user")) return "export";
  if (r.includes("local user")) return "local";
  return null;
}

/** Resolve area from department first, then legacy role name */
export function userProcurementArea(
  role?: string | null,
  department?: string | null
): ProcurementArea | "all" {
  const fromDept = areaFromDepartment(department);
  if (fromDept !== "all") return fromDept;

  const legacy = areaFromLegacyRole(role);
  if (legacy) return legacy;

  const r = (role || "").toLowerCase();
  if (r.includes("admin")) return "all";

  return "all";
}

export function effectiveProcurementDepartment(role?: string | null, department?: string | null): string {
  const area = userProcurementArea(role, department);
  if (area === "all") return department?.trim() || "Procurement";
  return departmentFromArea(area);
}

export function accessLevelFromRole(role?: string | null): ProcurementAccessLevel {
  const r = (role || "").toLowerCase();
  if (r.includes("viewer")) return "viewer";
  if (r.includes("manager") || r.includes("approver")) return "approver";
  if (r.includes("buyer")) return "buyer";
  if (r.includes("admin")) return "admin";
  // Legacy area roles (Procurement Local/Import/Export User) are full buyers in one area
  if (r.includes("local user") || r.includes("import user") || r.includes("export user")) {
    return "buyer";
  }
  return "user";
}

export function roleNameFromAccessLevel(level: ProcurementAccessLevel): string {
  return PROCUREMENT_ACCESS_LEVELS.find((l) => l.value === level)?.roleName || "Procurement User";
}

export function accessLevelLabel(level: ProcurementAccessLevel): string {
  return PROCUREMENT_ACCESS_LEVELS.find((l) => l.value === level)?.label || level;
}

export function areaLabel(area: ProcurementArea | "all"): string {
  if (area === "all") return "All areas";
  return PROCUREMENT_AREAS.find((a) => a.value === area)?.label || area;
}

export function procurementSectionsForArea(area: ProcurementArea | "all"): TradeSection[] {
  if (area === "local_import") return ["local", "import"];
  if (area === "all") return ["local", "import", "export"];
  return [area];
}

export function procurementSectionsForUser(
  role?: string | null,
  department?: string | null
): TradeSection[] {
  const r = (role || "").trim().toLowerCase();
  if (r.includes("admin")) return ["local", "import", "export"];

  const area = userProcurementArea(role, department);
  return procurementSectionsForArea(area);
}

/** @deprecated use procurementSectionsForUser */
export function procurementSectionsForRole(role?: string | null): TradeSection[] {
  return procurementSectionsForUser(role, null);
}

export function defaultProcurementLandingPath(role?: string | null, department?: string | null): string {
  const sections = procurementSectionsForUser(role, department);
  const level = accessLevelFromRole(role);
  if (level === "user" || level === "approver") {
    const section = sections.includes("local")
      ? "local"
      : sections.includes("import")
        ? "import"
        : sections[0];
    if (section === "local" || section === "import") return `/procurement/${section}/pr`;
  }
  if (sections.length >= 2 && sections.includes("local") && sections.includes("import")) {
    return "/procurement";
  }
  if (sections.length === 1) {
    const section = sections[0];
    if (section === "export") return "/procurement/export/pfi";
    return `/procurement/${section}/suppliers`;
  }
  return "/procurement";
}

export function setProcurementSessionArea(department?: string | null) {
  if (typeof window === "undefined") return;
  if (department) localStorage.setItem("procurementDepartment", department);
  else localStorage.removeItem("procurementDepartment");
}

export function getProcurementSessionArea(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("procurementDepartment") || "";
}
