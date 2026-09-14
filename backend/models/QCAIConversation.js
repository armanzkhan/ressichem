const mongoose = require("mongoose");

const QCAIConversationSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    user_id: { type: String, index: true },
    role: { type: String, default: "qc" },
    message: { type: String, required: true },
    reply: { type: String, required: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

QCAIConversationSchema.index({ company_id: 1, createdAt: -1 });

module.exports = mongoose.model("QCAIConversation", QCAIConversationSchema);
