const Notification = require("../models/Notification");
const User = require("../models/User");
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

async function listForUser(req, { limit = 20, unreadOnly = false } = {}) {
  const company_id = getCompanyId(req);
  const userId = await resolveAuthUserId(req);
  if (!userId) return [];

  const query = {
    company_id,
    isActive: true,
    targetType: "user",
    targetIds: userId,
    "data.module": "procurement",
    "data.entityType": "procurement_requisition",
  };

  let notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(Math.min(limit, 50)).lean();

  if (unreadOnly) {
    notifications = notifications.filter((n) => !(n.read_by || []).some((r) => r.user_id === userId));
  }

  return notifications;
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
};
