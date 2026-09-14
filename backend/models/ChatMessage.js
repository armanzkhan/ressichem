const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },
    senderUserId: { type: String, required: true, index: true },
    senderMongoId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderName: { type: String, default: "" },
    senderEmail: { type: String, default: "" },
    text: { type: String, required: true, trim: true },
    messageType: {
      type: String,
      enum: ["text", "system", "ai"],
      default: "text",
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: null },
    mentions: [
      {
        userId: { type: String, default: "" },
        name: { type: String, default: "" },
      },
    ],
    deliveredTo: [
      {
        userId: String,
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    readBy: [
      {
        userId: String,
        readAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
