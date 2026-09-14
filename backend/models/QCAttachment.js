const mongoose = require("mongoose");

/**
 * QCAttachment
 * - Stores metadata for uploaded files (PDF/XLSX/Images) linked to QC entities
 */
const QCAttachmentSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    ownerType: {
      type: String,
      enum: ["QC_RESULT", "QC_STANDARD", "QC_TEST", "QC_HUB_FORM", "RD_TRIAL_BATCH"],
      required: true,
      index: true,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    path: { type: String, required: true }, // relative URL path, e.g. /uploads/qc/...

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

QCAttachmentSchema.index({ company_id: 1, ownerType: 1, ownerId: 1 });

module.exports = mongoose.model("QCAttachment", QCAttachmentSchema);


