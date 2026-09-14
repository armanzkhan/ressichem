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
      message: `${prLabel(pr)} was submitted by ${senderName(submitter)} and needs your department review.`,
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
    message: `${prLabel(pr)} was fully approved by ${senderName(approver)} (all departments).`,
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
    message: `${prLabel(pr)}: ${senderName(approver)} approved their department (${done}/${total}). Waiting for remaining approvers.`,
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

module.exports = {
  notifyPrSubmitted,
  notifyPrSubmittedToApprovers,
  notifyPrApproved,
  notifyPrPartiallyApproved,
  notifyPrRejected,
  notifyPrHeld,
};
