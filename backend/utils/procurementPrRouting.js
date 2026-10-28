/**
 * Department (PR title) → assigned approver email.
 * Defaults seed into DB on first admin access; DB mappings take precedence.
 */
const DEPARTMENT_APPROVER_EMAILS = {
  // Phase-1 assigned managers (DB PR Approvers mappings override these).
  // For Production/Maintenance/Technical chains, map the real manager here — not lab@
  // (lab@ is phase 2 for those departments).
  Maintenance: "khuzema@ressichem.com",
  // Lahore Technical (and Technical Hub): Khuzema is department manager
  Technical: "khuzema@ressichem.com",
  "Technical (Lahore)": "khuzema@ressichem.com",
  Production: "lab@ressichem.com",
  Store: "babarshaikh@ressichem.com",
  "Local Purchase": "salim@gmail.com",
};

/**
 * Corporate stages after all line departments approve.
 * No system-wide "Boss" mapping — Hub ends at Finance (finance@).
 * Lahore finance is tahira@ (Lahore Finance Manager; no extra final after her).
 * Siraj uses a fixed final (khuzema@).
 */
const FINANCE_STAGE = {
  stage: "finance",
  department: "Finance Manager",
  envKey: "PROCUREMENT_FINANCE_APPROVER_EMAIL",
};

const CORPORATE_APPROVAL_STAGES = [FINANCE_STAGE];

/**
 * Production / Maintenance / Lab / QC: department manager → Lab → Finance.
 * Lahore: Finance step is tahira@ (not finance@).
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

/** Base names that use manager → Lab → Finance. Location suffixes ignored. */
const LAB_THEN_FINANCE_DEPARTMENTS = new Set([
  "production",
  "maintenance",
  "technical",
  "lab",
  "qc lab",
  "qc",
  "r&d",
  "r and d",
  "research and development",
]);

/** Lahore Finance Manager (tahira@). */
const LAHORE_FINAL_APPROVER_EMAIL = "tahira@ressichem.com";

/** Finance stage for Lahore — always tahira@. */
function lahoreFinanceStageDef() {
  return {
    stage: "finance",
    department: "Finance Manager (Lahore)",
    fixedEmail: lahoreFinalApproverEmail(),
    envKey: "PROCUREMENT_LAHORE_APPROVER_EMAIL",
  };
}

/** Fixed final stage for skip-finance chains (e.g. Siraj → Khuzema) — never DB Boss. */
function requesterFinalStageDef(email) {
  const fixed = normalizeEmail(email);
  return {
    stage: "boss",
    department: "Final Approver",
    fixedEmail: fixed || undefined,
    envKey: "PROCUREMENT_FINAL_APPROVER_EMAIL",
  };
}

/**
 * Per-requester approval overrides.
 * Siraj: department → Adnaan, then final → Khuzema (skip Finance). No Boss mapping.
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

/** True when a free-text field names Lahore (e.g. "Lahore", "LHR", "Administration (Lahore)"). */
function isLahoreLocation(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  if (/\blahore\b/i.test(s)) return true;
  if (/\blhr\b/i.test(s)) return true;
  return false;
}

/**
 * Lahore PRs are tagged via sticky flag, location, department/title
 * (e.g. title "Administration (Lahore)" with empty location field).
 */
function isLahorePr(pr, departments = []) {
  if (pr && typeof pr === "object" && pr.lahoreFinalApproval) return true;
  if (typeof pr === "string" && isLahoreLocation(pr)) return true;
  if (isLahoreLocation(pr?.location) || isLahoreLocation(pr?.title)) return true;
  const deptList =
    departments.length > 0
      ? departments
      : (pr?.items || []).map((line) => line?.department).filter(Boolean);
  if (deptList.some((d) => isLahoreLocation(d))) return true;
  return false;
}

function lahoreFinalApproverEmail() {
  return (
    normalizeEmail(process.env.PROCUREMENT_LAHORE_APPROVER_EMAIL) || LAHORE_FINAL_APPROVER_EMAIL
  );
}

function labApproverEmail() {
  return normalizeEmail(process.env.PROCUREMENT_LAB_APPROVER_EMAIL) || "lab@ressichem.com";
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

/** Strip "(Lahore)" / "(Hub)" so "QC Lab (Lahore)" matches "qc lab". */
function departmentBaseKey(name) {
  return normalizeDepartment(name)
    .replace(/\s*\((lahore|hub|lhr)\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isProductionOrMaintenanceDepartment(name) {
  const base = departmentBaseKey(name);
  if (LAB_THEN_FINANCE_DEPARTMENTS.has(base)) return true;
  // Fuzzy: "Production Hub", "MAINTAINENCE HUB", "Technical (Lahore)", "QC Lab", etc.
  if (/\bproduction\b/i.test(base)) return true;
  if (/\bmaint(?:e|ai)nance\b/i.test(base)) return true;
  if (/\btechnical\b/i.test(base)) return true;
  if (/\bqc\b/i.test(base) && /\blab\b/i.test(base)) return true;
  // Exact "lab" token only (do not match inside "lahore")
  if (/(^|\s)lab(\s|$)/i.test(base)) return true;
  if (/\br\s*&\s*d\b/i.test(base)) return true;
  return false;
}

/** True when every line department is Production / Maintenance / Lab / QC (location irrelevant). */
function isProductionOrMaintenanceOnlyPr(departments = []) {
  if (!departments.length) return false;
  return departments.every((d) => isProductionOrMaintenanceDepartment(d));
}

function corporateStagesForOptions(options = {}) {
  const lahore = Boolean(options.lahoreFinalBoss || options.lahoreFinalApproval);
  if (options.labThenFinance) {
    // Hub: lab → finance@. Lahore: lab → tahira@ (Lahore finance).
    if (lahore) {
      return [LAB_THEN_FINANCE_STAGES[0], lahoreFinanceStageDef()];
    }
    return LAB_THEN_FINANCE_STAGES;
  }
  if (options.skipFinance) {
    const finalEmail =
      normalizeEmail(options.bossApproverEmail) ||
      normalizeEmail(process.env.PROCUREMENT_FINAL_APPROVER_EMAIL);
    if (!finalEmail) return [];
    return [requesterFinalStageDef(finalEmail)];
  }
  // Standard Hub: departments → finance@. Lahore: departments → tahira@ finance.
  if (lahore) return [lahoreFinanceStageDef()];
  return [FINANCE_STAGE];
}

/**
 * Resolve which corporate chain a new PR should use.
 * Requester overrides win; else Production/Maintenance/Lab → lab→finance; else standard.
 * Lahore: finance approver is always tahira@ressichem.com.
 */
function resolveApprovalChainForSubmit(requesterEmail, departments = [], locationOrPr = "") {
  const lahore =
    typeof locationOrPr === "object" && locationOrPr
      ? isLahorePr(locationOrPr, departments)
      : isLahorePr({ location: locationOrPr, title: "" }, departments);
  const tahira = lahore ? lahoreFinalApproverEmail() : null;

  const chain = requesterApprovalChain(requesterEmail);
  if (chain?.skipFinance) {
    return {
      key: "skip_finance",
      options: {
        skipFinance: true,
        // Lahore skip-finance still ends with Tahira; else Siraj → Khuzema
        bossApproverEmail: tahira || chain.bossApproverEmail,
        ...(lahore
          ? {
              lahoreFinalApproval: true,
              financeApproverEmail: tahira,
            }
          : {}),
      },
      requesterChain: chain,
    };
  }
  if (isProductionOrMaintenanceOnlyPr(departments)) {
    return {
      key: "lab_then_finance",
      options: {
        labThenFinance: true,
        ...(lahore
          ? {
              lahoreFinalApproval: true,
              financeApproverEmail: tahira,
            }
          : {}),
      },
      requesterChain: null,
    };
  }
  return {
    key: "standard",
    options: lahore
      ? {
          lahoreFinalApproval: true,
          financeApproverEmail: tahira,
        }
      : {},
    requesterChain: null,
  };
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
  const key = normalizeDepartment(department);
  if (DEPARTMENT_LOOKUP[key]) return DEPARTMENT_LOOKUP[key];
  // "Technical (Lahore)" → try base "technical"
  const base = departmentBaseKey(department);
  return (base && DEPARTMENT_LOOKUP[base]) || null;
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

/** Buyer/user whose department is Local (Lahore) — PRs/POs limited to Lahore plant. */
function isLahorePlantScopedUser(user) {
  return isLahoreLocation(user?.department);
}

/**
 * JWT may omit department (older tokens). Load from DB onto user so plant scope works.
 */
async function ensureUserDepartment(user) {
  if (!user) return user;
  if (String(user.department || "").trim()) return user;
  try {
    const User = require("../models/User");
    const query = user._id
      ? { _id: user._id }
      : { user_id: user.user_id, company_id: user.company_id };
    if (!query._id && !query.user_id) return user;
    const doc = await User.findOne(query).select("department role").lean();
    if (doc?.department) user.department = doc.department;
    if (doc?.role && !user.role) user.role = doc.role;
  } catch (_) {
    /* ignore */
  }
  return user;
}

/** Mongo clause matching Lahore-tagged purchase requisitions. */
function lahorePurchaseRequisitionClause() {
  return {
    $or: [
      { lahoreFinalApproval: true },
      { location: { $regex: /\b(lahore|lhr)\b/i } },
      { title: { $regex: /\b(lahore|lhr)\b/i } },
      { "items.department": { $regex: /\b(lahore|lhr)\b/i } },
    ],
  };
}

function applyLahorePlantScopeToPrQuery(query, user) {
  if (!query || !user || !isLahorePlantScopedUser(user)) return query;
  const lahore = lahorePurchaseRequisitionClause();
  if (query.$or) {
    const existingOr = query.$or;
    delete query.$or;
    query.$and = [...(query.$and || []), { $or: existingOr }, lahore];
  } else {
    query.$and = [...(query.$and || []), lahore];
  }
  return query;
}

/** PO list/count filter for Lahore plant-scoped buyers. */
async function lahorePoVisibilityQuery(company_id) {
  const PurchaseRequisition = require("../models/PurchaseRequisition");
  const lahorePrIds = await PurchaseRequisition.find({
    company_id,
    isActive: { $ne: false },
    ...lahorePurchaseRequisitionClause(),
  }).distinct("_id");
  return {
    $or: [{ requisition: { $in: lahorePrIds } }, { plantScope: "lahore" }],
  };
}

/** Apply plant / requester visibility to a PO mongo filter (mutates filter). */
async function applyPurchaseOrderVisibility(filter, user) {
  if (!filter || !user) return filter;
  await ensureUserDepartment(user);
  if (isProcurementAdminUser(user) || hasPrFullAccess(user)) return filter;
  if (isLahorePlantScopedUser(user) && canCreatePurchaseOrders(user)) {
    const lahore = await lahorePoVisibilityQuery(filter.company_id);
    if (filter.$or) {
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = [...(filter.$and || []), { $or: existingOr }, lahore];
    } else {
      Object.assign(filter, lahore);
    }
    return filter;
  }
  if (canCreateRequisitions(user) && !canCreatePurchaseOrders(user)) {
    filter.createdBy = user._id;
  }
  return filter;
}

function isPrRequester(user, pr) {
  if (!user?._id || !pr) return false;
  return String(pr.requestedBy?._id || pr.requestedBy) === String(user._id);
}

/**
 * Finance / Lab / Boss (Lahore final) are corporate pipeline approvers.
 * They must NOT get a raw company-wide list (that floods PRs waiting on others).
 * List expands separately to include PRs whose actionable stage matches them.
 */
function isCorporatePipelineApproverUser(user) {
  const email = userEmail(user);
  if (!email) return false;

  const known = new Set(
    [
      "finance@ressichem.com",
      "lab@ressichem.com",
      LAHORE_FINAL_APPROVER_EMAIL,
      process.env.PROCUREMENT_FINANCE_APPROVER_EMAIL,
      process.env.PROCUREMENT_LAB_APPROVER_EMAIL,
      process.env.PROCUREMENT_LAHORE_APPROVER_EMAIL,
      process.env.PROCUREMENT_FINAL_APPROVER_EMAIL,
      ...Object.values(REQUESTER_APPROVAL_CHAINS).map((c) => c.bossApproverEmail),
    ]
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
  );
  return known.has(email);
}

/** Which corporate stage this user acts on: finance | lab | boss/final (or null). */
function corporateApproverStageForUser(user) {
  const email = userEmail(user);
  if (!email) return null;

  const financeEmails = new Set(
    ["finance@ressichem.com", process.env.PROCUREMENT_FINANCE_APPROVER_EMAIL]
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
  );
  if (financeEmails.has(email)) return "finance";

  const labEmails = new Set(
    ["lab@ressichem.com", process.env.PROCUREMENT_LAB_APPROVER_EMAIL]
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
  );
  if (labEmails.has(email)) return "lab";

  // Tahira is Lahore finance (and skip-finance Lahore final).
  const tahira = new Set(
    [LAHORE_FINAL_APPROVER_EMAIL, process.env.PROCUREMENT_LAHORE_APPROVER_EMAIL]
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
  );
  if (tahira.has(email)) return "finance";

  // Siraj-style fixed finals — not DB Boss mapping.
  const finalEmails = new Set(
    [
      process.env.PROCUREMENT_FINAL_APPROVER_EMAIL,
      ...Object.values(REQUESTER_APPROVAL_CHAINS).map((c) => c.bossApproverEmail),
    ]
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
  );
  if (finalEmails.has(email)) return "boss";

  return null;
}

/**
 * Scope PR list/report queries by role:
 * - PR full-access (salim@): company-wide
 * - finance / lab / Lahore final / Siraj final: own + assigned + on approvals
 *   even if the account is also Company Admin (otherwise tahira@ sees all 50+ PRs)
 * - other admins: company-wide
 * - department approver: own + assigned + on approvals
 * - buyer (po.create): own + approved (for PO conversion)
 * - requester (create only): own only
 * - viewer / read-only: company-wide
 */
function applyPurchaseRequisitionVisibility(query, user) {
  if (!query || !user) return query;
  if (hasPrFullAccess(user)) return query;

  // Corporate finals/finance/lab must stay scoped — do not expand to company-wide via admin flag.
  if (isCorporatePipelineApproverUser(user)) {
    query.$or = [
      { requestedBy: user._id },
      { assignedApprover: user._id },
      { "approvals.approver": user._id },
    ];
    return query;
  }

  if (isProcurementAdminUser(user)) return query;

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
    return applyLahorePlantScopeToPrQuery(query, user);
  }

  if (canCreateRequisitions(user)) {
    query.requestedBy = user._id;
    return applyLahorePlantScopeToPrQuery(query, user);
  }

  return applyLahorePlantScopeToPrQuery(query, user);
}

module.exports = {
  DEPARTMENT_APPROVER_EMAILS,
  CORPORATE_APPROVAL_STAGES,
  LAB_THEN_FINANCE_STAGES,
  REQUESTER_APPROVAL_CHAINS,
  PROCUREMENT_PR_FULL_ACCESS_EMAILS,
  PROCUREMENT_SOFT_DELETE_EMAILS,
  LAHORE_FINAL_APPROVER_EMAIL,
  normalizeDepartment,
  normalizeEmail,
  isLahoreLocation,
  isLahorePr,
  lahoreFinalApproverEmail,
  labApproverEmail,
  approverEmailForDepartment,
  resolveApproverEmail,
  requesterApprovalChain,
  shouldSkipFinanceForRequester,
  isProductionOrMaintenanceOnlyPr,
  resolveApprovalChainForSubmit,
  corporateStagesForOptions,
  isProcurementAdminUser,
  isCorporatePipelineApproverUser,
  corporateApproverStageForUser,
  hasPrFullAccess,
  canSoftDeleteProcurement,
  canApproveRequisitions,
  canCreateRequisitions,
  canCreatePurchaseOrders,
  isLahorePlantScopedUser,
  ensureUserDepartment,
  lahorePurchaseRequisitionClause,
  applyLahorePlantScopeToPrQuery,
  lahorePoVisibilityQuery,
  applyPurchaseOrderVisibility,
  isPrRequester,
  applyPurchaseRequisitionVisibility,
};
