const ChatConversation = require("../models/ChatConversation");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const realtimeService = require("../services/realtimeService");

const AI_BOT_USER_ID = "ressichem_ai_bot";
const AI_BOT_NAME = "Ressichem AI";

function companyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function currentUserId(req) {
  return String(req.user?.user_id || req.user?._id || "");
}

async function findUserByAnyId(company_id, id) {
  if (!id) return null;
  const or = [{ user_id: id }];
  if (/^[a-f\d]{24}$/i.test(String(id))) or.push({ _id: id });
  return User.findOne({ company_id, isActive: { $ne: false }, $or: or }).lean();
}

function viewerIds(req) {
  return [currentUserId(req), req.user?._id ? String(req.user._id) : ""].filter(Boolean);
}

function isParticipant(conv, req) {
  const ids = new Set(viewerIds(req));
  return (conv.participantUserIds || []).some((id) => ids.has(String(id)));
}

function primaryViewerId(conv, req) {
  const ids = viewerIds(req);
  const match = (conv.participantUserIds || []).find((id) => ids.includes(String(id)));
  return match || currentUserId(req);
}

function displayName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || user?.email || "User";
}

function participantFromUser(user) {
  return {
    userId: String(user.user_id || user._id),
    mongoId: user._id,
    email: user.email || "",
    name: displayName(user),
    role: user.role || "",
    joinedAt: new Date(),
  };
}

function aiParticipant() {
  return {
    userId: AI_BOT_USER_ID,
    mongoId: null,
    email: "ai@ressichem.local",
    name: AI_BOT_NAME,
    role: "AI Assistant",
    joinedAt: new Date(),
  };
}

function conversationTitle(conv, viewerUserId) {
  if (conv.type === "group" || conv.type === "ai_bot") {
    return conv.name || (conv.type === "ai_bot" ? AI_BOT_NAME : "Group");
  }
  const other = (conv.participants || []).find((p) => p.userId !== viewerUserId);
  return other?.name || other?.email || "Chat";
}

/** Unread count for a viewer — matches user_id and mongo _id aliases */
function unreadCountForViewer(conv, viewerUserId, extraViewerIds = []) {
  const obj = conv.toObject ? conv.toObject() : conv;
  const unreadMap =
    obj.unreadBy instanceof Map ? Object.fromEntries(obj.unreadBy) : obj.unreadBy || {};
  const ids = new Set(
    [viewerUserId, ...extraViewerIds].filter(Boolean).map((id) => String(id))
  );
  for (const p of obj.participants || []) {
    const uid = p.userId ? String(p.userId) : "";
    const mid = p.mongoId ? String(p.mongoId) : "";
    if ((uid && ids.has(uid)) || (mid && ids.has(mid))) {
      if (uid) ids.add(uid);
      if (mid) ids.add(mid);
    }
  }
  let n = 0;
  for (const id of ids) {
    n = Math.max(n, Number(unreadMap[id] || 0));
  }
  return n;
}

function clearUnreadForViewer(conv, viewerUserId, extraViewerIds = []) {
  if (!conv.unreadBy) conv.unreadBy = new Map();
  const ids = new Set(
    [viewerUserId, ...extraViewerIds].filter(Boolean).map((id) => String(id))
  );
  for (const p of conv.participants || []) {
    const uid = p.userId ? String(p.userId) : "";
    const mid = p.mongoId ? String(p.mongoId) : "";
    if ((uid && ids.has(uid)) || (mid && ids.has(mid))) {
      if (uid) ids.add(uid);
      if (mid) ids.add(mid);
    }
  }
  for (const id of ids) conv.unreadBy.set(id, 0);
}

function serializeConversation(conv, viewerUserId, extraViewerIds = []) {
  const obj = conv.toObject ? conv.toObject() : conv;
  return {
    _id: String(obj._id),
    company_id: obj.company_id,
    type: obj.type,
    name: conversationTitle(obj, viewerUserId),
    description: obj.description || "",
    avatarUrl: obj.avatarUrl || "",
    participants: obj.participants || [],
    participantUserIds: obj.participantUserIds || [],
    createdBy: obj.createdBy || "",
    lastMessage: obj.lastMessage || null,
    unreadCount: unreadCountForViewer(obj, viewerUserId, extraViewerIds),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function otherParticipantGroups(conv, viewerUserId, extraViewerIds = []) {
  const viewerIds = new Set(
    [viewerUserId, ...extraViewerIds].filter(Boolean).map((id) => String(id))
  );
  const groups = [];
  const covered = new Set();

  for (const p of conv.participants || []) {
    const aliases = [
      ...new Set(
        [p.userId, p.mongoId ? String(p.mongoId) : ""]
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];
    if (aliases.some((id) => viewerIds.has(id) || id === AI_BOT_USER_ID)) continue;
    const key = aliases.slice().sort().join("|");
    if (covered.has(key)) continue;
    covered.add(key);
    groups.push(aliases);
  }

  for (const uid of conv.participantUserIds || []) {
    const id = String(uid);
    if (!id || id === AI_BOT_USER_ID || viewerIds.has(id)) continue;
    const inGroup = groups.some((g) => g.includes(id));
    if (!inGroup) groups.push([id]);
  }

  return groups;
}

function receiptStatusForMessage(msg, conv, viewerUserId, extraViewerIds = []) {
  const obj = msg.toObject ? msg.toObject() : msg;
  const viewerIds = new Set(
    [viewerUserId, ...extraViewerIds].filter(Boolean).map((id) => String(id))
  );
  if (!viewerIds.has(String(obj.senderUserId))) return null;

  const groups = otherParticipantGroups(conv, viewerUserId, extraViewerIds);
  if (groups.length === 0) return "sent";

  const deliveredTo = obj.deliveredTo || [];
  const readBy = obj.readBy || [];

  const groupDelivered = (aliases) =>
    aliases.some((id) => deliveredTo.some((d) => String(d.userId) === id));
  const groupRead = (aliases) =>
    aliases.some((id) => readBy.some((r) => String(r.userId) === id));

  if (groups.every(groupRead)) return "read";
  if (groups.every(groupDelivered)) return "delivered";
  return "sent";
}

function parseMentions(text, participants = []) {
  const mentions = [];
  const seen = new Set();
  for (const p of participants) {
    const userId = String(p.userId || "");
    if (!userId || userId === AI_BOT_USER_ID || seen.has(userId)) continue;
    const labels = [p.name, p.email ? String(p.email).split("@")[0] : ""].filter(Boolean);
    for (const label of labels) {
      const rx = new RegExp(`@${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\b|$)`, "i");
      if (rx.test(text)) {
        mentions.push({ userId, name: p.name || p.email || userId });
        seen.add(userId);
        break;
      }
    }
  }
  return mentions;
}

function serializeMessage(msg, extras = {}) {
  const obj = msg.toObject ? msg.toObject() : msg;
  const replyQuote = extras.replyQuotes?.[String(obj.replyTo)] || null;
  const conv = extras.conversation || null;
  const viewerUserId = extras.viewerUserId || "";
  const extraViewerIds = extras.extraViewerIds || [];
  return {
    _id: String(obj._id),
    conversationId: String(obj.conversationId),
    senderUserId: obj.senderUserId,
    senderName: obj.senderName,
    senderEmail: obj.senderEmail,
    text: obj.text,
    messageType: obj.messageType || "text",
    replyTo: obj.replyTo ? String(obj.replyTo) : null,
    replyQuote,
    mentions: (obj.mentions || []).map((m) => ({
      userId: String(m.userId || ""),
      name: m.name || "",
    })),
    deliveredTo: (obj.deliveredTo || []).map((d) => ({
      userId: String(d.userId || ""),
      deliveredAt: d.deliveredAt,
    })),
    readBy: (obj.readBy || []).map((r) => ({
      userId: String(r.userId || ""),
      readAt: r.readAt,
    })),
    receiptStatus: conv
      ? receiptStatusForMessage(obj, conv, viewerUserId, extraViewerIds)
      : null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function buildReplyQuotes(messages) {
  const ids = [
    ...new Set(
      messages
        .map((m) => (m.replyTo ? String(m.replyTo) : ""))
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return {};
  const rows = await ChatMessage.find({ _id: { $in: ids }, isDeleted: { $ne: true } }).lean();
  const map = {};
  for (const row of rows) {
    map[String(row._id)] = {
      _id: String(row._id),
      senderUserId: row.senderUserId,
      senderName: row.senderName || "",
      text: String(row.text || "").slice(0, 180),
    };
  }
  return map;
}

function addReceiptForViewer(msg, conv, viewerIdList, { delivered = false, read = false }) {
  let changed = false;
  if (!msg.deliveredTo) msg.deliveredTo = [];
  if (!msg.readBy) msg.readBy = [];

  const aliasIds = new Set(viewerIdList.filter(Boolean).map((id) => String(id)));
  for (const id of [...aliasIds]) {
    for (const p of conv.participants || []) {
      const uid = p.userId ? String(p.userId) : "";
      const mid = p.mongoId ? String(p.mongoId) : "";
      if (id === uid || id === mid) {
        if (uid) aliasIds.add(uid);
        if (mid) aliasIds.add(mid);
      }
    }
  }

  for (const id of aliasIds) {
    if (delivered && !msg.deliveredTo.some((d) => String(d.userId) === id)) {
      msg.deliveredTo.push({ userId: id, deliveredAt: new Date() });
      changed = true;
    }
    if (read && !msg.readBy.some((r) => String(r.userId) === id)) {
      msg.readBy.push({ userId: id, readAt: new Date() });
      changed = true;
    }
  }
  return changed;
}

function notifySenderMessageStatus(msg, conv) {
  const payload = {
    type: "chat_message_status",
    conversationId: String(conv._id),
    message: serializeMessage(msg, {
      conversation: conv,
      viewerUserId: String(msg.senderUserId),
    }),
  };
  realtimeService.sendToUser(String(msg.senderUserId), payload);
  if (msg.senderMongoId) {
    realtimeService.sendToUser(String(msg.senderMongoId), payload);
  }
}

async function markMessagesDeliveredAndRead(messages, viewerIds, conv) {
  const meIds = [...new Set(viewerIds.filter(Boolean).map((id) => String(id)))];
  const updated = [];
  for (const msg of messages) {
    if (meIds.includes(String(msg.senderUserId))) continue;
    const changed = addReceiptForViewer(msg, conv, meIds, { delivered: true, read: true });
    if (changed) {
      await msg.save();
      updated.push(msg);
    }
  }
  for (const msg of updated) {
    notifySenderMessageStatus(msg, conv);
  }
}

function emitToParticipants(conversation, payload, exceptUserId = null) {
  const ids = new Set();
  for (const p of conversation.participants || []) {
    if (p.userId) ids.add(String(p.userId));
    if (p.mongoId) ids.add(String(p.mongoId));
  }
  for (const uid of conversation.participantUserIds || []) {
    if (uid) ids.add(String(uid));
  }
  for (const uid of ids) {
    if (!uid || uid === AI_BOT_USER_ID) continue;
    if (exceptUserId && (uid === exceptUserId)) continue;
    try {
      realtimeService.sendToUser(uid, payload);
    } catch (err) {
      console.error("chat realtime emit failed:", uid, err.message);
    }
  }
}

function simpleAiReply(text) {
  const msg = String(text || "").toLowerCase();
  if (/^(hi|hello|hey)\b/.test(msg)) {
    return "Hi! I'm Ressichem AI. Ask about products, QC, procurement, or chat with your team in Groups.";
  }
  if (/help|what can you/.test(msg)) {
    return "You can message teammates, create groups, and ask me questions. Use New Chat for 1:1 or New Group for teams.";
  }
  return `Thanks for your message. I'm here to help with Ressichem questions. You said: "${String(text).slice(0, 200)}"`;
}

/**
 * GET /api/chat/contacts
 */
exports.listContacts = async (req, res) => {
  try {
    const company_id = companyId(req);
    const me = currentUserId(req);
    const q = String(req.query.search || "").trim();

    const filter = {
      company_id,
      isActive: { $ne: false },
      user_id: { $ne: me },
    };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { department: rx }, { role: rx }];
    }

    const users = await User.find(filter)
      .select("user_id email firstName lastName role department phone avatarUrl isActive modules")
      .sort({ firstName: 1, email: 1 })
      .limit(100)
      .lean();

    const contacts = users.map((u) => ({
      userId: String(u.user_id || u._id),
      mongoId: String(u._id),
      email: u.email,
      name: displayName(u),
      role: u.role || "",
      department: u.department || "",
      phone: u.phone || "",
      avatarUrl: u.avatarUrl || "",
    }));

    // Always expose AI bot as a contact
    contacts.unshift({
      userId: AI_BOT_USER_ID,
      mongoId: null,
      email: "ai@ressichem.local",
      name: AI_BOT_NAME,
      role: "AI Assistant",
      department: "System",
      phone: "",
      avatarUrl: "",
      isAiBot: true,
    });

    return res.json({ success: true, data: contacts });
  } catch (err) {
    console.error("listContacts error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * GET /api/chat/conversations
 */
exports.listConversations = async (req, res) => {
  try {
    const company_id = companyId(req);
    const me = currentUserId(req);
    const meIds = [me, req.user?._id ? String(req.user._id) : ""].filter(Boolean);

    const rows = await ChatConversation.find({
      company_id,
      isActive: true,
      participantUserIds: { $in: meIds },
    })
      .sort({ "lastMessage.at": -1, updatedAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: rows.map((c) => serializeConversation(c, me, meIds)),
    });
  } catch (err) {
    console.error("listConversations error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/chat/conversations/direct
 * body: { userId }
 */
exports.createOrGetDirect = async (req, res) => {
  try {
    const company_id = companyId(req);
    const me = currentUserId(req);
    const otherId = String(req.body?.userId || "").trim();
    if (!otherId) return res.status(400).json({ success: false, message: "userId is required" });
    if (otherId === me) return res.status(400).json({ success: false, message: "Cannot chat with yourself" });

    const meUser = await findUserByAnyId(company_id, me);
    if (!meUser) return res.status(404).json({ success: false, message: "Current user not found" });
    const meKey = String(meUser.user_id || meUser._id);

    // AI bot conversation
    if (otherId === AI_BOT_USER_ID) {
      let aiConv = await ChatConversation.findOne({
        company_id,
        type: "ai_bot",
        participantUserIds: meKey,
        isActive: true,
      });
      if (!aiConv) {
        aiConv = await ChatConversation.create({
          company_id,
          type: "ai_bot",
          name: AI_BOT_NAME,
          description: "Ask Ressichem AI anything",
          participants: [participantFromUser(meUser), aiParticipant()],
          participantUserIds: [meKey, AI_BOT_USER_ID],
          createdBy: meKey,
          unreadBy: { [meKey]: 0 },
        });
      }
      return res.json({ success: true, data: serializeConversation(aiConv, meKey) });
    }

    const other = await findUserByAnyId(company_id, otherId);
    if (!other) return res.status(404).json({ success: false, message: "User not found" });
    const otherKey = String(other.user_id || other._id);

    let conv = await ChatConversation.findOne({
      company_id,
      type: "direct",
      isActive: true,
      participantUserIds: { $all: [meKey, otherKey], $size: 2 },
    });

    if (!conv) {
      conv = await ChatConversation.create({
        company_id,
        type: "direct",
        name: "",
        participants: [participantFromUser(meUser), participantFromUser(other)],
        participantUserIds: [meKey, otherKey],
        createdBy: meKey,
        unreadBy: { [meKey]: 0, [otherKey]: 0 },
      });

      emitToParticipants(
        conv,
        {
          type: "chat_conversation_updated",
          conversation: serializeConversation(conv, otherKey),
        },
        meKey
      );
    }

    return res.json({ success: true, data: serializeConversation(conv, meKey) });
  } catch (err) {
    console.error("createOrGetDirect error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/chat/conversations/group
 * body: { name, userIds: string[], description? }
 */
exports.createGroup = async (req, res) => {
  try {
    const company_id = companyId(req);
    const me = currentUserId(req);
    const meUser = await findUserByAnyId(company_id, me);
    if (!meUser) return res.status(404).json({ success: false, message: "Current user not found" });
    const meKey = String(meUser.user_id || meUser._id);

    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const userIds = Array.isArray(req.body?.userIds)
      ? [...new Set(req.body.userIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    if (!name) return res.status(400).json({ success: false, message: "Group name is required" });
    if (!userIds.length) return res.status(400).json({ success: false, message: "Select at least one member" });

    const memberIds = [...new Set([meKey, ...userIds])].filter((id) => id !== AI_BOT_USER_ID);
    const objectIds = memberIds.filter((id) => /^[a-f\d]{24}$/i.test(id));
    const users = await User.find({
      company_id,
      isActive: { $ne: false },
      $or: [{ user_id: { $in: memberIds } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])],
    }).lean();

    if (users.length < 2) {
      return res.status(400).json({ success: false, message: "Group needs at least you and one other user" });
    }

    const participants = users.map(participantFromUser);
    const participantUserIds = participants.map((p) => p.userId);
    const unreadBy = {};
    for (const id of participantUserIds) unreadBy[id] = 0;

    const conv = await ChatConversation.create({
      company_id,
      type: "group",
      name,
      description,
      participants,
      participantUserIds,
      createdBy: meKey,
      unreadBy,
    });

    const creatorName = displayName(meUser);
    const systemMsg = await ChatMessage.create({
      company_id,
      conversationId: conv._id,
      senderUserId: meKey,
      senderName: creatorName,
      text: `${creatorName} created group "${name}"`,
      messageType: "system",
      readBy: [{ userId: meKey, readAt: new Date() }],
    });

    conv.lastMessage = {
      text: systemMsg.text,
      senderUserId: meKey,
      senderName: creatorName,
      at: systemMsg.createdAt,
    };
    await conv.save();

    for (const uid of participantUserIds) {
      if (uid === meKey) continue;
      realtimeService.sendToUser(uid, {
        type: "chat_conversation_updated",
        conversation: serializeConversation(conv, uid),
      });
      realtimeService.sendToUser(uid, {
        type: "chat_message",
        message: serializeMessage(systemMsg),
        conversationId: String(conv._id),
      });
    }

    return res.status(201).json({ success: true, data: serializeConversation(conv, meKey) });
  } catch (err) {
    console.error("createGroup error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 */
exports.listMessages = async (req, res) => {
  try {
    const company_id = companyId(req);
    const id = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const conv = await ChatConversation.findOne({ _id: id, company_id, isActive: true });
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (!isParticipant(conv, req)) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }
    const me = primaryViewerId(conv, req);
    const vIds = viewerIds(req);

    const messages = await ChatMessage.find({
      conversationId: conv._id,
      company_id,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    const chronological = messages.reverse();
    await markMessagesDeliveredAndRead(chronological, vIds, conv);

    clearUnreadForViewer(conv, me, vIds);
    await conv.save();

    const replyQuotes = await buildReplyQuotes(chronological);
    const serializeOpts = {
      replyQuotes,
      conversation: conv,
      viewerUserId: me,
      extraViewerIds: vIds,
    };

    return res.json({
      success: true,
      data: chronological.map((m) => serializeMessage(m, serializeOpts)),
      conversation: serializeConversation(conv, me, vIds),
    });
  } catch (err) {
    console.error("listMessages error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 * body: { text, replyTo? }
 */
exports.sendMessage = async (req, res) => {
  try {
    const company_id = companyId(req);
    const id = req.params.id;
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ success: false, message: "Message text is required" });

    const conv = await ChatConversation.findOne({ _id: id, company_id, isActive: true });
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (!isParticipant(conv, req)) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }
    const meKey = primaryViewerId(conv, req);

    const meUser = await findUserByAnyId(company_id, meKey);
    const senderName = displayName(meUser || { email: req.user?.email });

    let replyToId = req.body?.replyTo ? String(req.body.replyTo) : null;
    if (replyToId) {
      const parent = await ChatMessage.findOne({
        _id: replyToId,
        conversationId: conv._id,
        isDeleted: { $ne: true },
      });
      if (!parent) replyToId = null;
    }

    const mentions =
      conv.type === "group" ? parseMentions(text, conv.participants || []) : [];

    const message = await ChatMessage.create({
      company_id,
      conversationId: conv._id,
      senderUserId: meKey,
      senderMongoId: meUser?._id,
      senderName,
      senderEmail: meUser?.email || req.user?.email || "",
      text,
      messageType: "text",
      replyTo: replyToId,
      mentions,
      deliveredTo: [],
      readBy: [{ userId: meKey, readAt: new Date() }],
    });

    conv.lastMessage = {
      text,
      senderUserId: meKey,
      senderName,
      at: message.createdAt,
    };
    if (!conv.unreadBy) conv.unreadBy = new Map();
    for (const uid of conv.participantUserIds || []) {
      if (uid === meKey || uid === AI_BOT_USER_ID) {
        conv.unreadBy.set(uid, 0);
      } else {
        conv.unreadBy.set(uid, Number(conv.unreadBy.get(uid) || 0) + 1);
      }
    }
    // Mirror unread onto participant mongoIds so badge works whichever id the client uses
    for (const p of conv.participants || []) {
      const uid = p.userId ? String(p.userId) : "";
      const mid = p.mongoId ? String(p.mongoId) : "";
      if (!mid || mid === meKey || uid === meKey) continue;
      if (uid === AI_BOT_USER_ID) continue;
      const fromUserId = uid ? Number(conv.unreadBy.get(uid) || 0) : 0;
      conv.unreadBy.set(mid, fromUserId);
    }
    await conv.save();

    const replyQuotes = await buildReplyQuotes([message]);
    const vIds = viewerIds(req);
    const serialized = serializeMessage(message, {
      replyQuotes,
      conversation: conv,
      viewerUserId: meKey,
      extraViewerIds: vIds,
    });

    const recipientIds = new Set();
    for (const p of conv.participants || []) {
      if (p.userId) recipientIds.add(String(p.userId));
      if (p.mongoId) recipientIds.add(String(p.mongoId));
    }
    for (const uid of conv.participantUserIds || []) {
      if (uid) recipientIds.add(String(uid));
    }

    emitToParticipants(conv, {
      type: "chat_message",
      message: serialized,
      conversationId: String(conv._id),
      conversation: serializeConversation(conv, meKey),
    });

    let deliveryChanged = false;
    for (const uid of recipientIds) {
      if (!uid || uid === meKey || uid === AI_BOT_USER_ID) continue;
      if (realtimeService.isUserConnected(uid)) {
        if (addReceiptForViewer(message, conv, [uid], { delivered: true, read: false })) {
          deliveryChanged = true;
        }
      }
    }
    if (deliveryChanged) {
      await message.save();
      notifySenderMessageStatus(message, conv);
    }

    // Refresh conversation list for recipients (all id aliases) with their unread counts
    for (const uid of recipientIds) {
      if (!uid || uid === meKey || uid === AI_BOT_USER_ID) continue;
      const viewerKey =
        (conv.participantUserIds || []).find((id) => String(id) === uid) ||
        (conv.participants || []).find((p) => String(p.userId) === uid || String(p.mongoId) === uid)
          ?.userId ||
        uid;
      realtimeService.sendToUser(uid, {
        type: "chat_conversation_updated",
        conversation: serializeConversation(conv, String(viewerKey)),
      });
    }

    // AI bot auto-reply
    if (conv.type === "ai_bot") {
      setImmediate(async () => {
        try {
          const replyText = simpleAiReply(text);
          const aiMsg = await ChatMessage.create({
            company_id,
            conversationId: conv._id,
            senderUserId: AI_BOT_USER_ID,
            senderName: AI_BOT_NAME,
            senderEmail: "ai@ressichem.local",
            text: replyText,
            messageType: "ai",
            readBy: [],
          });
          conv.lastMessage = {
            text: replyText,
            senderUserId: AI_BOT_USER_ID,
            senderName: AI_BOT_NAME,
            at: aiMsg.createdAt,
          };
          conv.unreadBy.set(meKey, Number(conv.unreadBy.get(meKey) || 0) + 1);
          await conv.save();

          const aiSerialized = serializeMessage(aiMsg);
          realtimeService.sendToUser(meKey, {
            type: "chat_message",
            message: aiSerialized,
            conversationId: String(conv._id),
          });
          if (meUser?._id) {
            realtimeService.sendToUser(String(meUser._id), {
              type: "chat_message",
              message: aiSerialized,
              conversationId: String(conv._id),
            });
          }
          realtimeService.sendToUser(meKey, {
            type: "chat_conversation_updated",
            conversation: serializeConversation(conv, meKey),
          });
        } catch (aiErr) {
          console.error("AI bot reply failed:", aiErr);
        }
      });
    }

    return res.status(201).json({ success: true, data: serialized });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/chat/conversations/:id/messages/:messageId/delivered
 */
exports.markMessageDelivered = async (req, res) => {
  try {
    const company_id = companyId(req);
    const conv = await ChatConversation.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (!isParticipant(conv, req)) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    const msg = await ChatMessage.findOne({
      _id: req.params.messageId,
      conversationId: conv._id,
      isDeleted: { $ne: true },
    });
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    const meIds = viewerIds(req);
    const me = primaryViewerId(conv, req);
    if (meIds.includes(String(msg.senderUserId))) {
      return res.json({
        success: true,
        data: serializeMessage(msg, { conversation: conv, viewerUserId: me, extraViewerIds: meIds }),
      });
    }

    let changed = false;
    const markRead = req.body?.read === true;
    if (addReceiptForViewer(msg, conv, meIds, { delivered: true, read: markRead })) {
      changed = true;
    }
    if (changed) {
      await msg.save();
      notifySenderMessageStatus(msg, conv);
    }

    return res.json({
      success: true,
      data: serializeMessage(msg, { conversation: conv, viewerUserId: me, extraViewerIds: meIds }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/chat/conversations/:id/read
 */
exports.markRead = async (req, res) => {
  try {
    const company_id = companyId(req);
    const conv = await ChatConversation.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (!isParticipant(conv, req)) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }
    const me = primaryViewerId(conv, req);
    clearUnreadForViewer(conv, me, viewerIds(req));
    await conv.save();
    return res.json({ success: true, data: serializeConversation(conv, me, viewerIds(req)) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/chat/conversations/:id/members
 * body: { userIds: string[] }
 */
exports.addMembers = async (req, res) => {
  try {
    const company_id = companyId(req);
    const conv = await ChatConversation.findOne({ _id: req.params.id, company_id, type: "group", isActive: true });
    if (!conv) return res.status(404).json({ success: false, message: "Group not found" });
    if (!isParticipant(conv, req)) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }
    const me = primaryViewerId(conv, req);

    const userIds = Array.isArray(req.body?.userIds)
      ? req.body.userIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    if (!userIds.length) return res.status(400).json({ success: false, message: "userIds required" });

    const users = await User.find({
      company_id,
      user_id: { $in: userIds },
      isActive: { $ne: false },
    }).lean();

    let added = 0;
    for (const u of users) {
      const uid = String(u.user_id);
      if ((conv.participantUserIds || []).includes(uid)) continue;
      conv.participants.push(participantFromUser(u));
      conv.participantUserIds.push(uid);
      if (!conv.unreadBy) conv.unreadBy = new Map();
      conv.unreadBy.set(uid, 0);
      added += 1;
    }
    await conv.save();

    if (added) {
      emitToParticipants(conv, {
        type: "chat_conversation_updated",
        conversation: serializeConversation(conv, me),
      });
    }

    return res.json({ success: true, data: serializeConversation(conv, me), added });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
