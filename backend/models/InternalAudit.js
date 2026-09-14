const mongoose = require("mongoose");

/** Internal audit reports — SRS 3.2.1 */
const InternalAuditSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    auditNo: { type: String, required: true, index: true },
    title: { type: String, required: true },
    auditType: { type: String, enum: ["INTERNAL", "SUPPLIER", "PROCESS", "SYSTEM"], default: "INTERNAL" },
    auditDate: { type: Date, required: true, index: true },
    auditor: { type: String, default: "" },
    auditee: { type: String, default: "" },
    scope: { type: String, default: "" },
    findings: [
      {
        findingNo: { type: String, default: "" },
        description: { type: String, required: true },
        severity: { type: String, enum: ["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"], default: "MINOR" },
        correctiveAction: { type: String, default: "" },
        linkedNcr: { type: mongoose.Schema.Types.ObjectId, ref: "NCR" },
        linkedCapa: { type: mongoose.Schema.Types.ObjectId, ref: "CAPA" },
        status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
      },
    ],
    summary: { type: String, default: "" },
    conclusion: { type: String, default: "" },
    status: { type: String, enum: ["DRAFT", "COMPLETED", "APPROVED"], default: "DRAFT", index: true },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

InternalAuditSchema.index({ company_id: 1, auditNo: 1 }, { unique: true });

module.exports = mongoose.model("InternalAudit", InternalAuditSchema);
