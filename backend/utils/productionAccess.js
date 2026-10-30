/** Production operators for Reactor Area, LMS, and BFS. Drymix lab stays in QC Hub. */
const PRODUCTION_OPERATORS = {
  "ubaid@ressichem.com": ["zrs", "lms", "bfs"],
  "production.zepoxy@ressichem.com": ["zrs", "lms", "bfs"],
};

const ALL_DEPARTMENTS = ["zrs", "lms", "drymix", "bfs"];
const SITE_DEPARTMENTS = ["zrs", "lms", "bfs"];

/** Roles offered on Production Site signup. */
const PRODUCTION_SIGNUP_ROLES = {
  operator: {
    role: "Production Operator",
    label: "Operator",
    departments: SITE_DEPARTMENTS,
    department: "Production — Reactor / LMS / BFS",
  },
  manager: {
    role: "Production Manager",
    label: "Manager",
    departments: SITE_DEPARTMENTS,
    department: "Production — Manager",
  },
  admin: {
    role: "Production Admin",
    label: "Overall Admin",
    departments: ALL_DEPARTMENTS,
    department: "Production — Overall Admin",
  },
};

function productionSignupRole(value) {
  return PRODUCTION_SIGNUP_ROLES[String(value || "").trim().toLowerCase()] || null;
}

function userEmail(user) {
  return String(user?.email || "")
    .trim()
    .toLowerCase();
}

function isProductionAdmin(user) {
  if (!user) return false;
  if (user.isSuperAdmin || user.isCompanyAdmin) return true;
  const role = String(user.role || "").toLowerCase();
  if (role.includes("qc")) return false;
  return role.includes("admin");
}

function hasProductionModule(user) {
  const modules = Array.isArray(user?.modules) ? user.modules : [];
  return modules.some((name) => String(name || "").toUpperCase() === "PRODUCTION");
}

function isProductionOperator(user) {
  if (PRODUCTION_OPERATORS[userEmail(user)]) return true;
  const role = String(user?.role || "").trim().toLowerCase();
  if (role === "production" || role === "production operator" || role === "production manager") return true;
  return hasProductionModule(user);
}

function productionDepartmentsForUser(user) {
  if (isProductionAdmin(user)) return ALL_DEPARTMENTS;
  if (isProductionOperator(user)) return [...SITE_DEPARTMENTS];
  return [];
}

function canUseProduction(user) {
  return productionDepartmentsForUser(user).length > 0;
}

module.exports = {
  PRODUCTION_OPERATORS,
  PRODUCTION_SIGNUP_ROLES,
  ALL_DEPARTMENTS,
  userEmail,
  productionSignupRole,
  isProductionAdmin,
  productionDepartmentsForUser,
  canUseProduction,
};
