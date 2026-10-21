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

/**
 * Corporate stages after all line departments approve.
 * Map these under PR Approvers (or set env emails).
 */
const CORPORATE_APPROVAL_STAGES = [
  {
    stage: "finance",
    department: "Finance Manager",
    envKey: "PROCUREMENT_FINANCE_APPROVER_EMAIL",
  },
  {
    stage: "boss",
    department: "Boss",
    envKey: "PROCUREMENT_BOSS_APPROVER_EMAIL",
  },
];

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

/** Only these emails may soft-delete procurement records (PR, PO, PFI, etc.). */
const PROCUREMENT_SOFT_DELETE_EMAILS = new Set(["arman@ressichem.com"]);

function userEmail(user) {
  return String(user?.email || "")
    .trim()
    .toLowerCase();
}

function canSoftDeleteProcurement(user) {
  if (!user) return false;
  return PROCUREMENT_SOFT_DELETE_EMAILS.has(userEmail(user));
}

function canApproveRequisitions(user) {
  if (isProcurementAdminUser(user)) return true;
  return permissionKeysFromUser(user).includes("procurement.requisitions.approve");
}

function canCreateRequisitions(user) {
  return permissionKeysFromUser(user).includes("procurement.requisitions.create");
}

function canCreatePurchaseOrders(user) {
  return permissionKeysFromUser(user).includes("procurement.po.create");
}

function isPrRequester(user, pr) {
  if (!user?._id || !pr) return false;
  return String(pr.requestedBy?._id || pr.requestedBy) === String(user._id);
}

/**
 * Scope PR list/report queries by role:
 * - admin: company-wide
 * - approver: own + assigned for approval
 * - buyer (po.create): own + approved (for PO conversion)
 * - requester (create only): own only
 * - viewer / read-only: company-wide
 */
function applyPurchaseRequisitionVisibility(query, user) {
  if (!query || !user || isProcurementAdminUser(user)) return query;

  if (canApproveRequisitions(user)) {
    query.$or = [
      { requestedBy: user._id },
      { assignedApprover: user._id },
      { "approvals.approver": user._id },
    ];
    return query;
  }

  if (canCreatePurchaseOrders(user)) {
    query.$or = [{ requestedBy: user._id }, { status: "approved" }];
    return query;
  }

  if (canCreateRequisitions(user)) {
    query.requestedBy = user._id;
    return query;
  }

  return query;
}

module.exports = {
  DEPARTMENT_APPROVER_EMAILS,
  CORPORATE_APPROVAL_STAGES,
  PROCUREMENT_SOFT_DELETE_EMAILS,
  normalizeDepartment,
  approverEmailForDepartment,
  resolveApproverEmail,
  isProcurementAdminUser,
  canSoftDeleteProcurement,
  canApproveRequisitions,
  canCreateRequisitions,
  canCreatePurchaseOrders,
  isPrRequester,
  applyPurchaseRequisitionVisibility,
};
