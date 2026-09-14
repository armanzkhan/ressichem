const User = require("../models/User");
const {
  resolveApproverEmail,
  normalizeDepartment,
  isProcurementAdminUser,
} = require("./procurementPrRouting");

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
 * Build one approval row per department. Fails if any department lacks a mapped active user.
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
      approver: resolved.userId,
      status: "pending",
      reason: "",
    });
  }

  return { approvals, missing };
}

function approvalApproverId(entry) {
  if (!entry) return "";
  return String(entry.approver?._id || entry.approver || "");
}

function userHasApprovalRoleOnPr(user, pr) {
  if (!user?._id) return false;
  if (isProcurementAdminUser(user)) return true;
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
  return (pr.approvals || []).filter(
    (a) => approvalApproverId(a) === actorId && a.status === "pending"
  );
}

function countApprovalProgress(approvals = []) {
  const total = approvals.length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const pending = approvals.filter((a) => a.status === "pending").length;
  return { total, approved, pending };
}

function deriveStatusAfterApprovals(approvals = []) {
  if (!approvals.length) return "approved";
  if (approvals.some((a) => a.status === "rejected")) return "rejected";
  if (approvals.every((a) => a.status === "approved")) return "approved";
  if (approvals.some((a) => a.status === "approved")) return "partially_approved";
  return "submitted";
}

function firstPendingApproverId(approvals = []) {
  const pending = approvals.find((a) => a.status === "pending");
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
  buildApprovalsForDepartments,
  userHasApprovalRoleOnPr,
  pendingApprovalsForUser,
  countApprovalProgress,
  deriveStatusAfterApprovals,
  firstPendingApproverId,
  uniqueApproverIds,
  approvalApproverId,
};
