const User = require("../models/User");
const ProcurementDepartmentApprover = require("../models/ProcurementDepartmentApprover");
const {
  resolveApproverEmail,
  normalizeDepartment,
  normalizeEmail,
  isProcurementAdminUser,
  hasPrFullAccess,
  CORPORATE_APPROVAL_STAGES,
  corporateStagesForOptions,
  requesterApprovalChain,
  isLahoreLocation,
  lahoreFinalApproverEmail,
} = require("./procurementPrRouting");

async function resolveUserIdByEmail(company_id, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const user = await User.findOne({
    company_id,
    email: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    isActive: true,
  })
    .select("_id email")
    .lean();
  return user?._id || null;
}

function approvalOptionsFromPr(pr, requesterEmail) {
  const chainKey = String(pr?.approvalChain || "").toLowerCase();
  const chain = requesterApprovalChain(requesterEmail);
  const lahore = isLahoreLocation(pr?.location);
  const lahoreBoss = lahore ? { bossApproverEmail: lahoreFinalApproverEmail() } : {};

  if (chainKey === "lab_then_finance" || pr?.labThenFinanceApproval) {
    return {
      labThenFinance: true,
      skipFinance: false,
      ...(lahore ? { lahoreFinalBoss: true, ...lahoreBoss } : {}),
    };
  }
  if (chainKey === "skip_finance" || pr?.skipFinanceApproval || chain?.skipFinance) {
    return {
      skipFinance: true,
      bossApproverEmail: lahoreBoss.bossApproverEmail || chain?.bossApproverEmail || undefined,
    };
  }
  return { ...lahoreBoss };
}

async function resolveRequesterEmail(pr) {
  if (pr?.requestedBy?.email) return normalizeEmail(pr.requestedBy.email);
  const id = pr?.requestedBy?._id || pr?.requestedBy;
  if (!id) return "";
  const user = await User.findById(id).select("email").lean();
  return normalizeEmail(user?.email);
}

async function approvalOptionsForPrDoc(pr) {
  const email = await resolveRequesterEmail(pr);
  return approvalOptionsFromPr(pr, email);
}

/**
 * Departments on a PR: unique line departments, else title (supports "A, B" legacy).
 */
function collectDepartmentsFromPr(pr) {
  const fromLines = (pr.items || [])
    .map((line) => String(line.department || "").trim())
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const name of fromLines) {
    const key = normalizeDepartment(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(name.trim());
  }
  if (unique.length) return unique;

  const title = String(pr.title || "").trim();
  if (!title) return [];
  return title
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((name, i, arr) => {
      const key = normalizeDepartment(name);
      return arr.findIndex((x) => normalizeDepartment(x) === key) === i;
    });
}

function departmentsTitleLabel(departments = []) {
  return departments.join(", ");
}

async function resolveApproverUserId(company_id, department) {
  const email = await resolveApproverEmail(company_id, department);
  if (!email) return { department, email: null, userId: null };
  const user = await User.findOne({
    company_id,
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    isActive: true,
  })
    .select("_id email")
    .lean();
  return {
    department,
    email,
    userId: user?._id || null,
  };
}

/**
 * If a department has no mapping yet, map it to the given user (creator/approver who introduced it).
 * Existing mappings are left unchanged.
 */
async function ensureDepartmentMappedToUser(company_id, department, user) {
  const name = String(department || "").trim();
  const email = String(user?.email || "").trim().toLowerCase();
  if (!name || !email || !email.includes("@")) {
    return { created: false, department: name, reason: "missing_department_or_email" };
  }

  const departmentKey = normalizeDepartment(name);
  const existing = await ProcurementDepartmentApprover.findOne({ company_id, departmentKey }).lean();
  if (existing) {
    return {
      created: false,
      department: existing.department,
      approverEmail: existing.approverEmail,
      reason: "already_mapped",
    };
  }

  const approverName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;

  try {
    const doc = await ProcurementDepartmentApprover.create({
      company_id,
      department: name,
      departmentKey,
      approverEmail: email,
      approverName,
      isActive: true,
      createdBy: user._id,
      updatedBy: user._id,
    });
    return {
      created: true,
      department: doc.department,
      approverEmail: doc.approverEmail,
    };
  } catch (err) {
    if (err?.code === 11000) {
      const raced = await ProcurementDepartmentApprover.findOne({ company_id, departmentKey }).lean();
      return {
        created: false,
        department: raced?.department || name,
        approverEmail: raced?.approverEmail,
        reason: "already_mapped",
      };
    }
    throw err;
  }
}

async function ensureDepartmentsMappedToUser(company_id, departments, user) {
  const results = [];
  for (const department of departments || []) {
    results.push(await ensureDepartmentMappedToUser(company_id, department, user));
  }
  return results;
}

/**
 * Build one approval row per department. Fails if any department lacks a mapped active user.
 * Corporate Finance/Boss rows are added later when each prior stage completes.
 */
async function buildApprovalsForDepartments(company_id, departments) {
  const approvals = [];
  const missing = [];

  for (const department of departments) {
    const resolved = await resolveApproverUserId(company_id, department);
    if (!resolved.userId) {
      missing.push(department);
      continue;
    }
    approvals.push({
      department,
      departmentKey: normalizeDepartment(department),
      stage: "department",
      approver: resolved.userId,
      status: "pending",
      reason: "",
    });
  }

  return { approvals, missing };
}

function approvalStage(entry) {
  return String(entry?.stage || "department").toLowerCase();
}

/**
 * For requester-specific chains (e.g. Siraj), force every department row onto the configured approver.
 */
async function applyRequesterDepartmentApproverOverride(company_id, approvals, chain) {
  const email = normalizeEmail(chain?.departmentApproverEmail);
  if (!email || !approvals?.length) return { approvals, missingEmail: null };
  const userId = await resolveUserIdByEmail(company_id, email);
  if (!userId) return { approvals, missingEmail: email };
  return {
    approvals: approvals.map((row) =>
      approvalStage(row) === "department" ? { ...row, approver: userId } : row
    ),
    missingEmail: null,
  };
}

function approvalApproverId(entry) {
  if (!entry) return "";
  return String(entry.approver?._id || entry.approver || "");
}

async function resolveCorporateApproverUserId(company_id, stageDef, options = {}) {
  const overrideEmail =
    stageDef.stage === "boss" ? normalizeEmail(options.bossApproverEmail) : "";
  const envEmail = String(process.env[stageDef.envKey] || "")
    .trim()
    .toLowerCase();
  const fixedEmail = normalizeEmail(stageDef.fixedEmail);
  const email =
    overrideEmail ||
    fixedEmail ||
    envEmail ||
    (await resolveApproverEmail(company_id, stageDef.department)) ||
    null;
  if (!email) {
    return { ...stageDef, email: null, userId: null };
  }
  const userId = await resolveUserIdByEmail(company_id, email);
  const lahoreFinal = lahoreFinalApproverEmail();
  const department =
    stageDef.stage === "boss" && email === lahoreFinal
      ? "Lahore Final Approver"
      : stageDef.department;
  return {
    ...stageDef,
    department,
    email,
    userId,
  };
}

/** Ensure required corporate stages are mapped before a PR can be submitted. */
async function assertCorporateApproversConfigured(company_id, options = {}) {
  const missing = [];
  const stages = corporateStagesForOptions(options);
  for (const stageDef of stages) {
    const resolved = await resolveCorporateApproverUserId(company_id, stageDef, options);
    if (!resolved.userId) missing.push(stageDef.department);
  }
  return missing;
}

function departmentApprovals(approvals = []) {
  return approvals.filter((a) => approvalStage(a) === "department");
}

function stagesComplete(approvals, stage) {
  const rows = approvals.filter((a) => approvalStage(a) === stage);
  return rows.length > 0 && rows.every((a) => a.status === "approved");
}

/**
 * Current actionable stage walks the corporate chain for this PR:
 * - standard: department → finance → boss
 * - skip_finance: department → boss
 * - lab_then_finance: department → lab → finance
 */
function getActionableApprovalStage(approvals = [], options = {}) {
  const depts = departmentApprovals(approvals);
  if (!depts.length) return "department";
  if (!depts.every((a) => a.status === "approved")) return "department";

  const stages = corporateStagesForOptions(options);
  for (const stageDef of stages) {
    const row = approvals.find((a) => approvalStage(a) === stageDef.stage);
    if (!row || row.status !== "approved") return stageDef.stage;
  }
  return "done";
}

/**
 * After department (or finance) completes, append the next corporate row if missing.
 * Returns newly added rows (for notifications).
 */
async function advanceCorporateApprovalStages(company_id, approvals = [], options = {}) {
  const next = [...approvals];
  const newlyAdded = [];
  const stages = corporateStagesForOptions(options);

  if (!stagesComplete(next, "department")) {
    return { approvals: next, newlyAdded };
  }

  for (let i = 0; i < stages.length; i += 1) {
    const stageDef = stages[i];
    const existing = next.find((a) => approvalStage(a) === stageDef.stage);
    if (existing) {
      if (existing.status !== "approved") break;
      continue;
    }

    // Prior corporate stages (for this PR's chain) must already be present and approved.
    const priorOk = stages.slice(0, i).every((p) => {
      const row = next.find((a) => approvalStage(a) === p.stage);
      return row && row.status === "approved";
    });
    if (!priorOk) break;

    const resolved = await resolveCorporateApproverUserId(company_id, stageDef, options);
    if (!resolved.userId) {
      const err = new Error(
        `No active ${stageDef.department} approver configured. Map them under PR Approvers (or set ${stageDef.envKey}).`
      );
      err.code = "CORPORATE_APPROVER_MISSING";
      err.department = stageDef.department;
      throw err;
    }

    const row = {
      department: stageDef.department,
      departmentKey: normalizeDepartment(stageDef.department),
      stage: stageDef.stage,
      approver: resolved.userId,
      status: "pending",
      reason: "",
    };
    next.push(row);
    newlyAdded.push(row);
    break; // unlock one corporate stage at a time
  }

  return { approvals: next, newlyAdded };
}

function actionableApprovalRows(approvals = [], user, options = {}) {
  const { allowAdmin = true, ...stageOptions } = options;
  const stage = getActionableApprovalStage(approvals, stageOptions);
  if (stage === "done") return [];
  const isAdmin =
    allowAdmin && (isProcurementAdminUser(user) || hasPrFullAccess(user));
  const actorId = String(user?._id || "");
  return approvals.filter((a) => {
    if (approvalStage(a) !== stage) return false;
    if (a.status !== "pending" && a.status !== "held") return false;
    if (isAdmin) return true;
    return approvalApproverId(a) === actorId;
  });
}

function userHasApprovalRoleOnPr(user, pr) {
  if (!user?._id) return false;
  if (isProcurementAdminUser(user) || hasPrFullAccess(user)) return true;
  const actorId = String(user._id);
  const approvals = pr.approvals || [];
  if (approvals.length) {
    return approvals.some((a) => approvalApproverId(a) === actorId);
  }
  const assigned = String(pr.assignedApprover?._id || pr.assignedApprover || "");
  return !assigned || assigned === actorId;
}

function pendingApprovalsForUser(pr, userId) {
  const actorId = String(userId || "");
  const approvals = pr.approvals || [];
  const stage = getActionableApprovalStage(approvals, approvalOptionsFromPr(pr));
  return approvals.filter(
    (a) =>
      approvalApproverId(a) === actorId &&
      a.status === "pending" &&
      approvalStage(a) === stage
  );
}

function countApprovalProgress(approvals = []) {
  const total = approvals.length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const pending = approvals.filter((a) => a.status === "pending").length;
  return { total, approved, pending };
}

function deriveStatusAfterApprovals(approvals = [], options = {}) {
  if (!approvals.length) return "approved";
  if (approvals.some((a) => a.status === "rejected")) return "rejected";
  if (!stagesComplete(approvals, "department")) {
    if (approvals.some((a) => a.status === "approved")) return "partially_approved";
    return "submitted";
  }
  const stages = corporateStagesForOptions(options);
  const corporateDone = stages.every((stageDef) => {
    const row = approvals.find((a) => approvalStage(a) === stageDef.stage);
    return row && row.status === "approved";
  });
  if (corporateDone && approvals.every((a) => a.status === "approved")) {
    return "approved";
  }
  if (approvals.some((a) => a.status === "approved")) return "partially_approved";
  return "submitted";
}

function firstPendingApproverId(approvals = [], options = {}) {
  const stage = getActionableApprovalStage(approvals, options);
  const pending = approvals.find(
    (a) => approvalStage(a) === stage && (a.status === "pending" || a.status === "held")
  );
  return pending ? pending.approver : null;
}

function uniqueApproverIds(approvals = []) {
  const ids = [];
  const seen = new Set();
  for (const a of approvals) {
    const id = approvalApproverId(a);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(a.approver?._id || a.approver);
  }
  return ids;
}

module.exports = {
  collectDepartmentsFromPr,
  departmentsTitleLabel,
  resolveApproverUserId,
  resolveCorporateApproverUserId,
  assertCorporateApproversConfigured,
  ensureDepartmentMappedToUser,
  ensureDepartmentsMappedToUser,
  buildApprovalsForDepartments,
  applyRequesterDepartmentApproverOverride,
  advanceCorporateApprovalStages,
  getActionableApprovalStage,
  actionableApprovalRows,
  userHasApprovalRoleOnPr,
  pendingApprovalsForUser,
  countApprovalProgress,
  deriveStatusAfterApprovals,
  firstPendingApproverId,
  uniqueApproverIds,
  approvalApproverId,
  approvalStage,
  approvalOptionsFromPr,
  approvalOptionsForPrDoc,
  resolveRequesterEmail,
  CORPORATE_APPROVAL_STAGES,
};
