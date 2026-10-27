const PurchaseRequisition = require("../models/PurchaseRequisition");
const {
  slaEnabled,
  OPEN_STATUSES,
  shouldSendAfternoonReminder,
  isPastSlaDeadline,
  partsInTz,
  computeSlaDueAt,
} = require("../utils/procurementPrSameDaySla");
const {
  getActionableApprovalStage,
  approvalStage,
  approvalApproverId,
  approvalOptionsFromPr,
} = require("../utils/procurementPrApprovals");
const procurementPrNotificationService = require("./procurementPrNotificationService");

const TICK_MS = 60 * 1000;
let timer = null;
let lastReminderDayKey = "";
let running = false;

function dayKey(now = new Date()) {
  const p = partsInTz(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function currentStageApproverIds(pr) {
  const options = approvalOptionsFromPr(pr);
  const approvals = pr.approvals || [];
  const stage = getActionableApprovalStage(approvals, options);
  if (stage === "done") return [];
  return approvals
    .filter(
      (a) =>
        approvalStage(a) === stage &&
        (a.status === "pending" || a.status === "held")
    )
    .map((a) => approvalApproverId(a))
    .filter(Boolean);
}

async function sendAfternoonReminders(now = new Date()) {
  const key = dayKey(now);
  if (lastReminderDayKey === key) return { skipped: true, reason: "already_sent_today" };
  if (!shouldSendAfternoonReminder(now)) return { skipped: true, reason: "outside_window" };

  const open = await PurchaseRequisition.find({
    isActive: { $ne: false },
    status: { $in: OPEN_STATUSES },
    slaClosedByDeadline: { $ne: true },
  })
    .select(
      "company_id requisitionNumber title purchaseType status approvals approvalChain skipFinanceApproval requestedBy submittedBy assignedApprover slaDueAt submittedAt createdAt slaReminderSentAt"
    )
    .lean();

  let sent = 0;
  for (const pr of open) {
    if (isPastSlaDeadline(pr, now)) continue;
    if (pr.slaReminderSentAt) {
      const sentKey = dayKey(new Date(pr.slaReminderSentAt));
      if (sentKey === key) continue;
    }
    const approverIds = currentStageApproverIds(pr);
    if (pr.assignedApprover) approverIds.push(String(pr.assignedApprover));
    await procurementPrNotificationService.notifyPrSameDayReminder(pr, approverIds);
    await PurchaseRequisition.updateOne(
      { _id: pr._id },
      { $set: { slaReminderSentAt: now } }
    );
    sent += 1;
  }

  lastReminderDayKey = key;
  console.log(`[PR SLA] Afternoon reminders sent for ${sent} open PR(s) (${key})`);
  return { sent };
}

async function autoCloseOverduePrs(now = new Date()) {
  const open = await PurchaseRequisition.find({
    isActive: { $ne: false },
    status: { $in: OPEN_STATUSES },
    slaClosedByDeadline: { $ne: true },
  });

  let closed = 0;
  const reason =
    "Closed automatically: not approved/closed within the same calendar day (strict same-day SLA).";

  for (const pr of open) {
    if (!pr.slaDueAt) {
      pr.slaDueAt = computeSlaDueAt(pr);
    }
    if (!isPastSlaDeadline(pr, now)) continue;

    // Cancel open stages — do not mark every pending person as the rejector.
    const approvals = (pr.approvals || []).map((a) => {
      const row = typeof a.toObject === "function" ? a.toObject() : { ...a };
      if (row.status === "pending" || row.status === "held") {
        row.status = "cancelled";
        row.actedAt = now;
        row.reason = reason;
      }
      return row;
    });

    pr.status = "rejected";
    pr.approvals = approvals;
    pr.rejectionReason = reason;
    pr.rejectedAt = now;
    pr.rejectedBy = undefined;
    pr.slaClosedByDeadline = true;
    pr.holdReason = "";
    pr.heldBy = undefined;
    pr.heldAt = undefined;
    pr.approvedBy = undefined;
    pr.approvedAt = undefined;
    await pr.save();

    void procurementPrNotificationService.notifyPrClosedBySameDaySla(pr);
    closed += 1;
  }

  if (closed) {
    console.log(`[PR SLA] Auto-closed ${closed} overdue PR(s)`);
  }
  return { closed };
}

async function tick() {
  if (!slaEnabled() || running) return;
  running = true;
  try {
    await sendAfternoonReminders();
    await autoCloseOverduePrs();
  } catch (err) {
    console.error("[PR SLA] scheduler tick failed:", err.message);
  } finally {
    running = false;
  }
}

function initializeProcurementPrSlaScheduler() {
  if (!slaEnabled()) {
    console.log("[PR SLA] Same-day PR SLA scheduler disabled");
    return;
  }
  if (timer) return;
  // Run soon after boot, then every minute
  setTimeout(() => {
    void tick();
  }, 15_000);
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);
  console.log(
    "[PR SLA] Same-day PR SLA scheduler enabled (afternoon reminder + end-of-day auto-close, Asia/Karachi)"
  );
}

module.exports = {
  initializeProcurementPrSlaScheduler,
  tick,
  sendAfternoonReminders,
  autoCloseOverduePrs,
};
