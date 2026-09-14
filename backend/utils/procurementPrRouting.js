/**
 * Department (PR title) → assigned approver email.
 * Defaults seed into DB on first admin access; DB mappings take precedence.
 */
const DEPARTMENT_APPROVER_EMAILS = {
  Maintenance: "khuzema@ressichem.com",
  Production: "lab@ressichem.com",
  Store: "babarshaikh@ressichem.com",
  "Local Purchase": "salim@gmail.com",
};

function normalizeDepartment(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const DEPARTMENT_LOOKUP = Object.fromEntries(
  Object.entries(DEPARTMENT_APPROVER_EMAILS).map(([dept, email]) => [normalizeDepartment(dept), email])
);

function approverEmailForDepartment(department) {
  return DEPARTMENT_LOOKUP[normalizeDepartment(department)] || null;
}

/**
 * Resolve approver email from DB mapping first, then hardcoded defaults.
 */
async function resolveApproverEmail(company_id, department) {
  const key = normalizeDepartment(department);
  if (!key) return null;

  try {
    const ProcurementDepartmentApprover = require("../models/ProcurementDepartmentApprover");
    const mapping = await ProcurementDepartmentApprover.findOne({
      company_id,
      departmentKey: key,
      isActive: true,
    })
      .select("approverEmail")
      .lean();
    if (mapping?.approverEmail) return String(mapping.approverEmail).trim().toLowerCase();
  } catch (err) {
    console.error("resolveApproverEmail DB lookup failed:", err.message);
  }

  return approverEmailForDepartment(department);
}

function roleNamesFromUser(user) {
  const roles = user?.roles || [];
  return roles.map((r) => (typeof r === "string" ? r : r?.name || "")).filter(Boolean);
}

function permissionKeysFromUser(user) {
  const perms = user?.permissions || [];
  return perms.map((p) => (typeof p === "string" ? p : p?.key || "")).filter(Boolean);
}

function isProcurementAdminUser(user) {
  if (!user) return false;
  if (user.isSuperAdmin || user.isCompanyAdmin) return true;
  const roleField = String(user.role || "").toLowerCase();
  if (roleField.includes("admin")) return true;
  if (roleNamesFromUser(user).some((n) => n.toLowerCase().includes("admin"))) return true;
  const keys = permissionKeysFromUser(user);
  return keys.includes("procurement.users.create") || keys.includes("procurement.users.update");
}

function canApproveRequisitions(user) {
  if (isProcurementAdminUser(user)) return true;
  return permissionKeysFromUser(user).includes("procurement.requisitions.approve");
}

module.exports = {
  DEPARTMENT_APPROVER_EMAILS,
  normalizeDepartment,
  approverEmailForDepartment,
  resolveApproverEmail,
  isProcurementAdminUser,
  canApproveRequisitions,
};
