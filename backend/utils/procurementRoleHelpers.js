const VALID_AREAS = new Set(["local", "import", "export", "local_import"]);
const VALID_ACCESS_LEVELS = new Set(["viewer", "user", "buyer", "approver", "admin"]);

const LEGACY_AREA_ROLES = new Set([
  "Procurement Local User",
  "Procurement Import User",
  "Procurement Export User",
]);

const ALL_ROLE_NAMES = [
  "Procurement Local User",
  "Procurement Import User",
  "Procurement Export User",
  "Procurement Admin",
  "Procurement User",
  "Procurement Buyer",
  "Procurement Manager",
  "Procurement Viewer",
];

function roleNameFromAccessLevel(accessLevel) {
  switch (String(accessLevel || "user").toLowerCase()) {
    case "viewer":
      return "Procurement Viewer";
    case "buyer":
      return "Procurement Buyer";
    case "approver":
    case "manager":
      return "Procurement Manager";
    case "admin":
      return "Procurement Admin";
    case "user":
    default:
      return "Procurement User";
  }
}

function departmentFromArea(area) {
  switch (String(area || "local").toLowerCase()) {
    case "local_import":
      return "Procurement — Local & Import";
    case "import":
      return "Procurement — Import";
    case "export":
      return "Procurement — Export";
    case "local":
    default:
      return "Procurement — Local";
  }
}

function areaFromLegacyRole(roleName) {
  const r = String(roleName || "").toLowerCase();
  if (r.includes("import user")) return "import";
  if (r.includes("export user")) return "export";
  if (r.includes("local user")) return "local";
  return null;
}

/**
 * Resolve role + department from signup/admin payload.
 * Supports new { area, accessLevel } or legacy { role }.
 */
function resolveProcurementUserAssignment(body = {}) {
  const accessLevel = String(body.accessLevel || "").trim().toLowerCase();
  const area = String(body.area || "").trim().toLowerCase();

  if (accessLevel && VALID_ACCESS_LEVELS.has(accessLevel)) {
    const roleName = roleNameFromAccessLevel(accessLevel);
    const department =
      accessLevel === "admin"
        ? "Procurement"
        : VALID_AREAS.has(area)
          ? departmentFromArea(area)
          : departmentFromArea("local");
    return { roleName, department };
  }

  const roleName = body.role || "Procurement User";
  if (!ALL_ROLE_NAMES.includes(roleName)) {
    throw new Error(`Invalid role. Valid roles: ${ALL_ROLE_NAMES.join(", ")}`);
  }

  if (LEGACY_AREA_ROLES.has(roleName)) {
    const legacyArea = areaFromLegacyRole(roleName);
    return {
      roleName: "Procurement User",
      department: departmentFromArea(legacyArea || "local"),
    };
  }

  if (roleName === "Procurement Admin") {
    return { roleName, department: "Procurement" };
  }

  if (body.department) {
    return { roleName, department: String(body.department).trim() };
  }

  if (VALID_AREAS.has(area)) {
    return { roleName, department: departmentFromArea(area) };
  }

  return { roleName, department: "Procurement" };
}

function areaFromDepartment(department) {
  const d = String(department || "").toLowerCase();
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

function userProcurementArea(role, department) {
  const fromDept = areaFromDepartment(department);
  if (fromDept !== "all") return fromDept;
  const legacy = areaFromLegacyRole(role);
  if (legacy) return legacy;
  const r = String(role || "").toLowerCase();
  if (r.includes("admin")) return "all";
  return "all";
}

function effectiveProcurementDepartment(role, department) {
  const area = userProcurementArea(role, department);
  if (area === "all") return String(department || "").trim() || "Procurement";
  return departmentFromArea(area);
}

function procurementSectionsForArea(area) {
  if (area === "local_import") return ["local", "import"];
  if (area === "all") return ["local", "import", "export"];
  return [area];
}

function procurementSectionsForUser(role, department) {
  const r = String(role || "").trim().toLowerCase();
  if (r.includes("admin")) return ["local", "import", "export"];

  const area = userProcurementArea(role, department);
  return procurementSectionsForArea(area);
}

function accessLevelFromRole(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("viewer")) return "viewer";
  if (r.includes("manager") || r.includes("approver")) return "approver";
  if (r.includes("buyer")) return "buyer";
  if (r.includes("admin")) return "admin";
  return "user";
}

module.exports = {
  VALID_AREAS,
  VALID_ACCESS_LEVELS,
  ALL_ROLE_NAMES,
  roleNameFromAccessLevel,
  departmentFromArea,
  areaFromDepartment,
  areaFromLegacyRole,
  userProcurementArea,
  effectiveProcurementDepartment,
  procurementSectionsForArea,
  procurementSectionsForUser,
  accessLevelFromRole,
  resolveProcurementUserAssignment,
};
