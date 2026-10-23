const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const notificationService = require("./notificationService");
const { getCompanyId } = require("../utils/procurementHelpers");

async function resolveAuthUserId(req) {
  if (req.user?.user_id) return String(req.user.user_id);
  if (req.user?._id) {
    const user = await User.findById(req.user._id).select("user_id").lean();
    if (user?.user_id) return String(user.user_id);
  }
  if (req.user?.email && req.user?.company_id) {
    const user = await User.findOne({ email: req.user.email, company_id: req.user.company_id })
      .select("user_id")
      .lean();
    if (user?.user_id) return String(user.user_id);
  }
  return null;
}

/** Drop PR notifications whose requisition was soft-deleted / cancelled. */
async function filterOutDeletedPrNotifications(company_id, notifications = []) {
  if (!notifications.length) return [];

  const objectIds = [];
  const requisitionNumbers = [];
  for (const n of notifications) {
    const entityId = n?.data?.entityId ? String(n.data.entityId) : "";
    const reqNo = n?.data?.requisitionNumber ? String(n.data.requisitionNumber) : "";
    if (entityId && mongoose.Types.ObjectId.isValid(entityId)) {
      objectIds.push(new mongoose.Types.ObjectId(entityId));
    }
    if (reqNo) requisitionNumbers.push(reqNo);
  }

  if (!objectIds.length && !requisitionNumbers.length) return notifications;

  const or = [];
  if (objectIds.length) or.push({ _id: { $in: objectIds } });
  if (requisitionNumbers.length) or.push({ requisitionNumber: { $in: [...new Set(requisitionNumbers)] } });

  const activePrs = await PurchaseRequisition.find({
    company_id,
    isActive: { $ne: false },
    $or: or,
  })
    .select("_id requisitionNumber")
    .lean();

  const activeIds = new Set(activePrs.map((p) => String(p._id)));
  const activeNos = new Set(activePrs.map((p) => String(p.requisitionNumber || "")));

  return notifications.filter((n) => {
    const entityId = n?.data?.entityId ? String(n.data.entityId) : "";
    const reqNo = n?.data?.requisitionNumber ? String(n.data.requisitionNumber) : "";
    if (entityId && activeIds.has(entityId)) return true;
    if (reqNo && activeNos.has(reqNo)) return true;
    // No PR link — keep non-PR-shaped rows; drop orphaned PR notifications
    if (!entityId && !reqNo) return true;
    return false;
  });
}

/** Soft-hide notifications when a PR is deleted. */
async function deactivateForRequisition(company_id, pr) {
  if (!pr) return { modifiedCount: 0 };
  const entityId = String(pr._id || "");
  const requisitionNumber = String(pr.requisitionNumber || "");
  const or = [];
  if (entityId) or.push({ "data.entityId": entityId });
  if (requisitionNumber) or.push({ "data.requisitionNumber": requisitionNumber });
  if (!or.length) return { modifiedCount: 0 };

  const result = await Notification.updateMany(
    {
      company_id,
      isActive: true,
      "data.module": "procurement",
      "data.entityType": "procurement_requisition",
      $or: or,
    },
    { $set: { isActive: false } }
  );
  return { modifiedCount: result.modifiedCount || 0 };
}

async function listForUser(req, { limit = 20, unreadOnly = false } = {}) {
  const company_id = getCompanyId(req);
  const userId = await resolveAuthUserId(req);
  if (!userId) return [];

  const capped = Math.min(Math.max(Number(limit) || 20, 1), 50);
  // Over-fetch then drop deleted-PR rows so the panel still fills up.
  const query = {
    company_id,
    isActive: true,
    targetType: "user",
    targetIds: userId,
    "data.module": "procurement",
    "data.entityType": "procurement_requisition",
  };

  let notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(capped * 3, 150))
    .lean();

  notifications = await filterOutDeletedPrNotifications(company_id, notifications);

  if (unreadOnly) {
    notifications = notifications.filter((n) => !(n.read_by || []).some((r) => r.user_id === userId));
  }

  return notifications.slice(0, capped);
}

async function markReadForUser(req, notificationId) {
  const company_id = getCompanyId(req);
  const userId = await resolveAuthUserId(req);
  if (!userId) throw new Error("User not found");

  const notification = await Notification.findOne({
    _id: notificationId,
    company_id,
    targetType: "user",
    targetIds: userId,
    "data.module": "procurement",
  });

  if (!notification) throw new Error("Notification not found");

  return notificationService.markAsRead(notificationId, userId);
}

module.exports = {
  listForUser,
  markReadForUser,
  resolveAuthUserId,
  filterOutDeletedPrNotifications,
  deactivateForRequisition,
};
