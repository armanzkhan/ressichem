const mongoose = require("mongoose");

/**
 * QCHubBatchRecord — batch-wise QC data entry per Dry Mortar product module (SRS 3.1.1–3.1.8).
 */
const QCHubBatchRecordSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    planGroup: { type: String, default: "DRY_MORTAR", index: true },

    module: {
      type: String,
      required: true,
      index: true,
      enum: [
        "TILE_ADHESIVE",
        "TILE_GROUT",
        "PREMIX_PLASTER",
        "SKIM_COAT",
        "REPAIR_MORTAR",
        "WATERPROOFING",
        "CRACK_FILLER",
        "SELF_LEVEL_SEALERS",
      ],
    },
    category: { type: String, default: "", index: true },
    productName: { type: String, required: true, index: true },
    grade: { type: String, default: "", index: true },
    batchNo: { type: String, required: true, index: true },
    testDate: { type: Date, default: Date.now, index: true },

    parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
    remarks: { type: String, default: "" },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: "" },

    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

QCHubBatchRecordSchema.index({ company_id: 1, module: 1, batchNo: 1, testDate: -1 });
QCHubBatchRecordSchema.index({ company_id: 1, productName: 1, grade: 1, testDate: -1 });

module.exports = mongoose.model("QCHubBatchRecord", QCHubBatchRecordSchema);
