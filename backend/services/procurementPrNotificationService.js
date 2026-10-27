const User = require("../models/User");
const notificationTriggerService = require("./notificationTriggerService");
const notificationService = require("./notificationService");

async function resolveUserNotificationId(mongoUserId) {
  if (!mongoUserId) return null;
  const user = await User.findById(mongoUserId).select("user_id").lean();
  return user?.user_id || null;
}

function senderName(user) {
  if (!user) return "System";
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.email || "System";
}

function prLabel(pr) {
  const number = pr.requisitionNumber || "PR";
  const dept = pr.title ? ` — ${pr.title}` : "";
  return `${number}${dept}`;
}

function prListPath(pr) {
  const section = pr.purchaseType === "local" ? "local" : "import";
  return `/procurement/${section}/pr?open=${pr._id}`;
}

function requesterMongoId(pr) {
  return pr.requestedBy?._id || pr.requestedBy || pr.submittedBy?._id || pr.submittedBy || null;
}

async function notifyProcurementUser({
  company_id,
  targetMongoUserId,
  title,
  message,
  type,
  priority,
  sender,
  data,
  actions,
}) {
  const targetUserId = await resolveUserNotificationId(targetMongoUserId);
  if (!targetUserId) return null;

  try {
    const notification = await notificationTriggerService.createNotification({
      title,
      message,
      type,
      priority,
      targetType: "user",
      targetIds: [targetUserId],
      company_id,
      sender_id: sender?._id ? String(sender._id) : null,
      sender_name: senderName(sender),
      data: {
        module: "procurement",
        entityType: "procurement_requisition",
        ...data,
      },
      actions,
    });
    await notificationService.sendNotification(notification._id);
    return notification;
  } catch (err) {
    console.error("Procurement PR notification failed:", err.message);
    return null;
  }
}

async function notifyPrSubmitted(pr, submitter, approverMongoId) {
  return notifyPrSubmittedToApprovers(pr, submitter, approverMongoId ? [approverMongoId] : []);
}

async function notifyPrSubmittedToApprovers(pr, submitter, approverMongoIds = []) {
  const submitterMongoId = submitter?._id ? String(submitter._id) : "";
  const uniqueIds = [...new Set((approverMongoIds || []).map((id) => String(id)).filter(Boolean))];

  const results = [];
  for (const approverMongoId of uniqueIds) {
    if (submitterMongoId && String(approverMongoId) === submitterMongoId) continue;

    const submitterUserId = submitter?.user_id || (await resolveUserNotificationId(submitter?._id));
    const approverUserId = await resolveUserNotificationId(approverMongoId);
    if (!approverUserId) continue;
    if (submitterUserId && submitterUserId === approverUserId) continue;

    const notification = await notifyProcurementUser({
      company_id: pr.company_id,
      targetMongoUserId: approverMongoId,
      title: "PR awaiting your approval",
      message: `${prLabel(pr)} needs your approval (routed by ${senderName(submitter)}).`,
      type: "approval_required",
      priority: "high",
      sender: submitter,
      data: {
        entityId: String(pr._id),
        requisitionNumber: pr.requisitionNumber,
        action: "submitted",
        audience: "approver",
        purchaseType: pr.purchaseType,
        url: prListPath(pr),
      },
      actions: [{ label: "Review PR", action: "view", url: prListPath(pr) }],
    });
    if (notification) results.push(notification);
  }
  return results;
}

async function notifyPrApproved(pr, approver) {
  const targetId = requesterMongoId(pr);
  if (!targetId) return null;
  return notifyProcurementUser({
    company_id: pr.company_id,
    targetMongoUserId: targetId,
    title: "PR approved",
    message: `${prLabel(pr)} was fully approved by ${senderName(approver)}.`,
    type: "success",
    priority: "medium",
    sender: approver,
    data: {
      entityId: String(pr._id),
      requisitionNumber: pr.requisitionNumber,
      action: "approved",
      audience: "requester",
      purchaseType: pr.purchaseType,
      url: prListPath(pr),
    },
    actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
  });
}

async function notifyPrPartiallyApproved(pr, approver) {
  const targetId = requesterMongoId(pr);
  if (!targetId) return null;
  const approvals = pr.approvals || [];
  const done = approvals.filter((a) => a.status === "approved").length;
  const total = approvals.length || 0;
  return notifyProcurementUser({
    company_id: pr.company_id,
    targetMongoUserId: targetId,
    title: "PR partially approved",
    message: `${prLabel(pr)}: ${senderName(approver)} approved (${done}/${total}). Waiting for remaining approvals.`,
    type: "info",
    priority: "medium",
    sender: approver,
    data: {
      entityId: String(pr._id),
      requisitionNumber: pr.requisitionNumber,
      action: "partially_approved",
      audience: "requester",
      purchaseType: pr.purchaseType,
      url: prListPath(pr),
    },
    actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
  });
}

async function notifyPrRejected(pr, approver, reason) {
  const targetId = requesterMongoId(pr);
  if (!targetId) return null;
  return notifyProcurementUser({
    company_id: pr.company_id,
    targetMongoUserId: targetId,
    title: "PR rejected",
    message: `${prLabel(pr)} was rejected by ${senderName(approver)}. Reason: ${reason}`,
    type: "warning",
    priority: "high",
    sender: approver,
    data: {
      entityId: String(pr._id),
      requisitionNumber: pr.requisitionNumber,
      action: "rejected",
      audience: "requester",
      rejectionReason: reason,
      purchaseType: pr.purchaseType,
      url: prListPath(pr),
    },
    actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
  });
}

async function notifyPrHeld(pr, approver, reason) {
  const targetId = requesterMongoId(pr);
  if (!targetId) return null;
  return notifyProcurementUser({
    company_id: pr.company_id,
    targetMongoUserId: targetId,
    title: "PR placed on hold",
    message: `${prLabel(pr)} was put on hold by ${senderName(approver)}. Reason: ${reason}`,
    type: "info",
    priority: "medium",
    sender: approver,
    data: {
      entityId: String(pr._id),
      requisitionNumber: pr.requisitionNumber,
      action: "held",
      audience: "requester",
      holdReason: reason,
      purchaseType: pr.purchaseType,
      url: prListPath(pr),
    },
    actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
  });
}

/** Purchase intimation: PO issued against the requester's PR */
async function notifyPrPurchased(pr, actor, po) {
  const targetId = requesterMongoId(pr);
  if (!targetId) return null;
  const poNumber = po?.poNumber || "PO";
  return notifyProcurementUser({
    company_id: pr.company_id,
    targetMongoUserId: targetId,
    title: "Items purchased for your PR",
    message: `${prLabel(pr)}: purchase order ${poNumber} has been issued. Your requested items are now purchased.`,
    type: "success",
    priority: "high",
    sender: actor,
    data: {
      entityId: String(pr._id),
      requisitionNumber: pr.requisitionNumber,
      poNumber,
      poId: po?._id ? String(po._id) : "",
      action: "purchased",
      audience: "requester",
      purchaseType: pr.purchaseType,
      url: prListPath(pr),
    },
    actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
  });
}

/** Delivery update: partial or full receipt against linked PO */
async function notifyPrDeliveryUpdate(pr, actor, po) {
  const targetId = requesterMongoId(pr);
  if (!targetId) return null;
  const poNumber = po?.poNumber || "PO";
  const poStatus = String(po?.status || "").toLowerCase();
  const isComplete = poStatus === "received" || poStatus === "closed";
  return notifyProcurementUser({
    company_id: pr.company_id,
    targetMongoUserId: targetId,
    title: isComplete ? "PR delivery completed" : "PR partially delivered",
    message: isComplete
      ? `${prLabel(pr)}: goods for ${poNumber} are fully received (completed).`
      : `${prLabel(pr)}: partial delivery posted against ${poNumber}.`,
    type: "info",
    priority: "medium",
    sender: actor,
    data: {
      entityId: String(pr._id),
      requisitionNumber: pr.requisitionNumber,
      poNumber,
      poId: po?._id ? String(po._id) : "",
      action: isComplete ? "completed" : "partially_delivered",
      audience: "requester",
      purchaseType: pr.purchaseType,
      url: prListPath(pr),
    },
    actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
  });
}

async function notifyPrSameDayReminder(pr, approverMongoIds = []) {
  const uniqueIds = [...new Set((approverMongoIds || []).map((id) => String(id)).filter(Boolean))];
  const results = [];
  for (const approverMongoId of uniqueIds) {
    const notification = await notifyProcurementUser({
      company_id: pr.company_id,
      targetMongoUserId: approverMongoId,
      title: "PR same-day deadline — afternoon reminder",
      message: `${prLabel(pr)} must be approved or closed today. Please action it before end of day.`,
      type: "approval_required",
      priority: "urgent",
      sender: null,
      data: {
        entityId: String(pr._id),
        requisitionNumber: pr.requisitionNumber,
        action: "sla_afternoon_reminder",
        audience: "approver",
        purchaseType: pr.purchaseType,
        url: prListPath(pr),
      },
      actions: [{ label: "Review PR", action: "view", url: prListPath(pr) }],
    });
    if (notification) results.push(notification);
  }

  const requesterId = requesterMongoId(pr);
  if (requesterId) {
    const notification = await notifyProcurementUser({
      company_id: pr.company_id,
      targetMongoUserId: requesterId,
      title: "Your PR is still open today",
      message: `${prLabel(pr)} is not fully approved yet. Same-day SLA: it must be closed today.`,
      type: "warning",
      priority: "high",
      sender: null,
      data: {
        entityId: String(pr._id),
        requisitionNumber: pr.requisitionNumber,
        action: "sla_afternoon_reminder",
        audience: "requester",
        purchaseType: pr.purchaseType,
        url: prListPath(pr),
      },
      actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
    });
    if (notification) results.push(notification);
  }
  return results;
}

async function notifyPrClosedBySameDaySla(pr) {
  const results = [];
  const requesterId = requesterMongoId(pr);
  if (requesterId) {
    const notification = await notifyProcurementUser({
      company_id: pr.company_id,
      targetMongoUserId: requesterId,
      title: "PR closed — same-day deadline missed",
      message: `${prLabel(pr)} was automatically rejected because it was not approved/closed on the same calendar day.`,
      type: "error",
      priority: "high",
      sender: null,
      data: {
        entityId: String(pr._id),
        requisitionNumber: pr.requisitionNumber,
        action: "sla_auto_closed",
        audience: "requester",
        purchaseType: pr.purchaseType,
        url: prListPath(pr),
      },
      actions: [{ label: "View PR", action: "view", url: prListPath(pr) }],
    });
    if (notification) results.push(notification);
  }
  return results;
}

module.exports = {
  notifyPrSubmitted,
  notifyPrSubmittedToApprovers,
  notifyPrApproved,
  notifyPrPartiallyApproved,
  notifyPrRejected,
  notifyPrHeld,
  notifyPrPurchased,
  notifyPrDeliveryUpdate,
  notifyPrSameDayReminder,
  notifyPrClosedBySameDaySla,
};
