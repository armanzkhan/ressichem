const mongoose = require("mongoose");

/**
 * QCAuditLog
 * - Audit trail for QC module (who changed what, when)
 */
const QCAuditLogSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    entityType: {
      type: String,
      enum: ["QCTest", "QCStandardCriteria", "QCResult", "QCAttachment", "QCHubPlanItem", "QCHubFormSubmission"],
      required: true,
      index: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "SUBMIT", "APPROVE", "REJECT", "UPLOAD"],
      required: true,
      index: true,
    },

    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorEmail: { type: String, default: "" },

    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

QCAuditLogSchema.index({ company_id: 1, entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model("QCAuditLog", QCAuditLogSchema);


