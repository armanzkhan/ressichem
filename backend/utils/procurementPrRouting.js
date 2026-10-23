/**
 * Department (PR title) → assigned approver email.
 * Defaults seed into DB on first admin access; DB mappings take precedence.
 */
const DEPARTMENT_APPROVER_EMAILS = {
  // Phase-1 assigned managers (DB PR Approvers mappings override these).
  // For Production/Maintenance chains, map the real manager here — not lab@
  // (lab@ is phase 2 for those departments).
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

/**
 * Production / Maintenance (any location: Hub, Lahore, etc.):
 * assigned department manager → Lab → Finance (no Boss).
 */
const LAB_THEN_FINANCE_STAGES = [
  {
    stage: "lab",
    department: "Lab",
    fixedEmail: "lab@ressichem.com",
    envKey: "PROCUREMENT_LAB_APPROVER_EMAIL",
  },
  {
    stage: "finance",
    department: "Finance Manager",
    fixedEmail: "finance@ressichem.com",
    envKey: "PROCUREMENT_FINANCE_APPROVER_EMAIL",
  },
];

const PRODUCTION_MAINTENANCE_DEPARTMENTS = new Set(["production", "maintenance"]);

/**
 * Per-requester approval overrides.
 * Siraj: department → Adnaan, then Boss → Khuzema (skip Finance).
 * Extra emails can be added via PROCUREMENT_SKIP_FINANCE_REQUESTER_EMAILS (comma-separated).
 */
const REQUESTER_APPROVAL_CHAINS = {
  "siraj.khan@ressichem.com": {
    skipFinance: true,
    departmentApproverEmail: "adnaan.malak@ressichem.com",
    bossApproverEmail: "khuzema@ressichem.com",
  },
};

/** Full view/edit/delete/reject on all PRs (approved or not). */
const PROCUREMENT_PR_FULL_ACCESS_EMAILS = new Set(["salim@gmail.com"]);

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function requesterApprovalChain(email) {
  const key = normalizeEmail(email);
  if (!key) return null;
  if (REQUESTER_APPROVAL_CHAINS[key]) return { ...REQUESTER_APPROVAL_CHAINS[key] };

  const envList = String(process.env.PROCUREMENT_SKIP_FINANCE_REQUESTER_EMAILS || "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (envList.includes(key)) {
    return { skipFinance: true };
  }
  return null;
}

function shouldSkipFinanceForRequester(email) {
  return Boolean(requesterApprovalChain(email)?.skipFinance);
}

function isProductionOrMaintenanceDepartment(name) {
  return PRODUCTION_MAINTENANCE_DEPARTMENTS.has(normalizeDepartment(name));
}

/** True when every line department is Production or Maintenance (Hub/Lahore location irrelevant). */
function isProductionOrMaintenanceOnlyPr(departments = []) {
  if (!departments.length) return false;
  return departments.every((d) => isProductionOrMaintenanceDepartment(d));
}

function corporateStagesForOptions(options = {}) {
  if (options.labThenFinance) return LAB_THEN_FINANCE_STAGES;
  if (options.skipFinance) {
    return CORPORATE_APPROVAL_STAGES.filter((s) => s.stage !== "finance");
  }
  return CORPORATE_APPROVAL_STAGES;
}

/**
 * Resolve which corporate chain a new PR should use.
 * Requester overrides win; else Production/Maintenance → lab→finance; else standard.
 */
function resolveApprovalChainForSubmit(requesterEmail, departments = []) {
  const chain = requesterApprovalChain(requesterEmail);
  if (chain?.skipFinance) {
    return {
      key: "skip_finance",
      options: {
        skipFinance: true,
        bossApproverEmail: chain.bossApproverEmail,
      },
      requesterChain: chain,
    };
  }
  if (isProductionOrMaintenanceOnlyPr(departments)) {
    return {
      key: "lab_then_finance",
      options: { labThenFinance: true },
      requesterChain: null,
    };
  }
  return { key: "standard", options: {}, requesterChain: null };
}

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

function hasPrFullAccess(user) {
  if (!user) return false;
  return PROCUREMENT_PR_FULL_ACCESS_EMAILS.has(userEmail(user));
}

function canSoftDeleteProcurement(user) {
  if (!user) return false;
  return PROCUREMENT_SOFT_DELETE_EMAILS.has(userEmail(user)) || hasPrFullAccess(user);
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
  if (!query || !user || isProcurementAdminUser(user) || hasPrFullAccess(user)) return query;

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
  LAB_THEN_FINANCE_STAGES,
  REQUESTER_APPROVAL_CHAINS,
  PROCUREMENT_PR_FULL_ACCESS_EMAILS,
  PROCUREMENT_SOFT_DELETE_EMAILS,
  normalizeDepartment,
  normalizeEmail,
  approverEmailForDepartment,
  resolveApproverEmail,
  requesterApprovalChain,
  shouldSkipFinanceForRequester,
  isProductionOrMaintenanceOnlyPr,
  resolveApprovalChainForSubmit,
  corporateStagesForOptions,
  isProcurementAdminUser,
  hasPrFullAccess,
  canSoftDeleteProcurement,
  canApproveRequisitions,
  canCreateRequisitions,
  canCreatePurchaseOrders,
  isPrRequester,
  applyPurchaseRequisitionVisibility,
};
