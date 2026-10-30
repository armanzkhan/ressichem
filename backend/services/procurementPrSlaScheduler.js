const PurchaseRequisition = require("../models/PurchaseRequisition");
const {
  slaEnabled,
  OPEN_STATUSES,
  isPastSlaDeadline,
  computeSlaDueAt,
  nextSlaReminder,
  isHeld,
  isHoldExpired,
  computeHoldExpiresAt,
  nextHoldReminder,
} = require("../utils/procurementPrSameDaySla");
const {
  getActionableApprovalStage,
  approvalStage,
  approvalApproverId,
  approvalOptionsFromPr,
} = require("../utils/procurementPrApprovals");
const procurementPrNotificationService = require("./procurementPrNotificationService");
const { prContentKey } = require("../utils/procurementPrApprovals");

const TICK_MS = 60 * 1000;
let timer = null;
let running = false;

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

async function sendDeadlineReminders(now = new Date()) {
  const open = await PurchaseRequisition.find({
    isActive: { $ne: false },
    status: { $in: OPEN_STATUSES },
    slaClosedByDeadline: { $ne: true },
  })
    .select(
      "company_id requisitionNumber title purchaseType status approvals approvalChain skipFinanceApproval requestedBy submittedBy assignedApprover slaDueAt submittedAt createdAt slaReminderSentAt slaRemindersSent"
    )
    .lean();

  let sent = 0;
  for (const pr of open) {
    if (isPastSlaDeadline(pr, now)) continue;
    const reminder = nextSlaReminder(pr, now);
    if (!reminder) continue;
    const dueMs = new Date(pr.slaDueAt).getTime() - now.getTime();
    const remainingHours = Math.max(1, Math.round(dueMs / (60 * 60 * 1000)));
    const approverIds = currentStageApproverIds(pr);
    if (pr.assignedApprover) approverIds.push(String(pr.assignedApprover));
    await procurementPrNotificationService.notifyPrSlaReminder(pr, approverIds, {
      hoursLeft: Math.min(reminder.hoursLeft, remainingHours),
    });
    await PurchaseRequisition.updateOne(
      { _id: pr._id },
      {
        $set: { slaReminderSentAt: now },
        $addToSet: { slaRemindersSent: { $each: reminder.alsoMark } },
      }
    );
    sent += 1;
  }

  if (sent) {
    console.log(`[PR SLA] Deadline reminders sent for ${sent} open PR(s)`);
  }
  return { sent };
}

async function sendHoldReminders(now = new Date()) {
  const held = await PurchaseRequisition.find({
    isActive: { $ne: false },
    status: "held",
    slaClosedByDeadline: { $ne: true },
  })
    .select(
      "company_id requisitionNumber title purchaseType status approvals approvalChain skipFinanceApproval requestedBy submittedBy assignedApprover heldAt holdExpiresAt holdRemindersSent"
    )
    .lean();

  let sent = 0;
  for (const pr of held) {
    if (!pr.holdExpiresAt && pr.heldAt) {
      pr.holdExpiresAt = computeHoldExpiresAt(pr.heldAt);
      await PurchaseRequisition.updateOne({ _id: pr._id }, { $set: { holdExpiresAt: pr.holdExpiresAt } });
    }
    const reminder = nextHoldReminder(pr, now);
    if (!reminder) continue;
    const dueMs = new Date(pr.holdExpiresAt).getTime() - now.getTime();
    const remainingHours = Math.max(1, Math.round(dueMs / (60 * 60 * 1000)));
    const approverIds = currentStageApproverIds(pr);
    if (pr.assignedApprover) approverIds.push(String(pr.assignedApprover));
    await procurementPrNotificationService.notifyPrHoldReminder(pr, approverIds, {
      hoursLeft: Math.min(reminder.hoursLeft, remainingHours),
    });
    await PurchaseRequisition.updateOne(
      { _id: pr._id },
      { $addToSet: { holdRemindersSent: { $each: reminder.alsoMark } } }
    );
    sent += 1;
  }

  if (sent) {
    console.log(`[PR SLA] Hold reminders sent for ${sent} PR(s)`);
  }
  return { sent };
}

async function rejectForDeadline(pr, now, reason) {
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
  pr.slaContentKey = prContentKey(pr);
  pr.decisionLog = pr.decisionLog || [];
  pr.decisionLog.push({
    kind: "rejected",
    at: now,
    actorName: /30 days/i.test(reason) ? "System (30-day hold)" : "System (72-hour SLA)",
    reason,
  });
  pr.holdReason = "";
  pr.heldBy = undefined;
  pr.heldAt = undefined;
  pr.holdExpiresAt = undefined;
  pr.approvedBy = undefined;
  pr.approvedAt = undefined;
  await pr.save();
}

async function autoCloseOverduePrs(now = new Date()) {
  const open = await PurchaseRequisition.find({
    isActive: { $ne: false },
    status: { $in: OPEN_STATUSES },
    slaClosedByDeadline: { $ne: true },
  });

  let closed = 0;
  const reason =
    "Closed automatically: not fully approved within 72 hours of submission.";

  for (const pr of open) {
    if (isHeld(pr)) continue;
    if (!pr.slaDueAt) {
      pr.slaDueAt = computeSlaDueAt(pr);
    }
    if (!isPastSlaDeadline(pr, now)) continue;

    await rejectForDeadline(pr, now, reason);
    void procurementPrNotificationService.notifyPrClosedBySameDaySla(pr);
    closed += 1;
  }

  if (closed) {
    console.log(`[PR SLA] Auto-closed ${closed} overdue PR(s)`);
  }
  return { closed };
}

async function autoCloseExpiredHolds(now = new Date()) {
  const held = await PurchaseRequisition.find({
    isActive: { $ne: false },
    status: "held",
    slaClosedByDeadline: { $ne: true },
  });

  let closed = 0;
  const reason =
    "Closed automatically: still on hold 30 days after the hold date. The 72-hour SLA stays paused only while the hold is within 30 days.";

  for (const pr of held) {
    if (!pr.holdExpiresAt && pr.heldAt) {
      pr.holdExpiresAt = computeHoldExpiresAt(pr.heldAt);
    }
    if (!isHoldExpired(pr, now)) continue;
    await rejectForDeadline(pr, now, reason);
    void procurementPrNotificationService.notifyPrClosedBySameDaySla(pr, {
      title: "PR closed — 30-day hold expired",
      message: `${pr.requisitionNumber || "PR"} was automatically rejected because it stayed on hold for 30 days.`,
    });
    closed += 1;
  }

  if (closed) {
    console.log(`[PR SLA] Auto-closed ${closed} PR(s) past the 30-day hold limit`);
  }
  return { closed };
}

async function tick() {
  if (running) return;
  running = true;
  try {
    if (slaEnabled()) {
      await sendDeadlineReminders();
      await autoCloseOverduePrs();
    }
    await sendHoldReminders();
    await autoCloseExpiredHolds();
  } catch (err) {
    console.error("[PR SLA] scheduler tick failed:", err.message);
  } finally {
    running = false;
  }
}

function initializeProcurementPrSlaScheduler() {
  if (timer) return;
  // Run soon after boot, then every minute. 72-hour approval SLA stays off.
  setTimeout(() => {
    void tick();
  }, 15_000);
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);
  console.log("[PR hold] 72-hour approval SLA is off. A hold still auto-closes after 30 days.");
}

module.exports = {
  initializeProcurementPrSlaScheduler,
  tick,
  sendDeadlineReminders,
  autoCloseOverduePrs,
};
