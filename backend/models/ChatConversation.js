const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // User.user_id (WS targeting key)
    mongoId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, default: "" },
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatConversationSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["direct", "group", "ai_bot"],
      required: true,
      index: true,
    },
    name: { type: String, default: "" }, // group title / AI title
    description: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    participants: { type: [participantSchema], default: [] },
    participantUserIds: { type: [String], default: [], index: true },
    createdBy: { type: String, default: "" },
    lastMessage: {
      text: { type: String, default: "" },
      senderUserId: { type: String, default: "" },
      senderName: { type: String, default: "" },
      at: { type: Date, default: null },
    },
    unreadBy: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatConversationSchema.index({ company_id: 1, type: 1, participantUserIds: 1 });
chatConversationSchema.index({ company_id: 1, updatedAt: -1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
