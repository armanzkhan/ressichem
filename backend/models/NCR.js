const mongoose = require("mongoose");

/** Non-Conformance Report — SRS 3.2.1 */
const NCRSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    ncrNo: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    detectedDate: { type: Date, default: Date.now, index: true },
    detectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    department: { type: String, default: "QC/R&D" },
    severity: { type: String, enum: ["MINOR", "MAJOR", "CRITICAL"], default: "MINOR", index: true },
    sourceType: {
      type: String,
      enum: ["QC_BATCH", "RAW_MATERIAL", "PACKAGING", "AUDIT", "COMPLAINT", "OTHER"],
      default: "QC_BATCH",
      index: true,
    },
    relatedBatchNo: { type: String, default: "", index: true },
    relatedProductName: { type: String, default: "" },
    relatedModule: { type: String, default: "" },
    rootCause: { type: String, default: "" },
    immediateAction: { type: String, default: "" },
    disposition: { type: String, enum: ["USE_AS_IS", "REWORK", "SCRAP", "HOLD", "PENDING"], default: "PENDING" },
    linkedCapa: { type: mongoose.Schema.Types.ObjectId, ref: "CAPA" },
    status: {
      type: String,
      enum: ["OPEN", "UNDER_INVESTIGATION", "CLOSED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

NCRSchema.index({ company_id: 1, ncrNo: 1 }, { unique: true });

module.exports = mongoose.model("NCR", NCRSchema);
