const mongoose = require("mongoose");

/**
 * QCResult
 * - Batch-wise results entry (Resin/Hardener/LMS/RM/PM/QA/R&D can be mapped by module/system)
 * - Supports workflow: draft -> submitted -> approved/rejected
 */
const QCResultValueSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: "QCTest", required: true },
    value: { type: mongoose.Schema.Types.Mixed }, // number | string | boolean
    numericValue: { type: Number }, // for charting when value is numeric
    unit: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const QCResultSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    system: {
      type: String,
      enum: ["QC_SITE_AREA", "QC_HUB"],
      default: "QC_SITE_AREA",
      index: true,
    },
    module: { type: String, default: "", index: true }, // e.g. RESIN/HARDENER

    productCategory: { type: String, default: "", index: true },
    productName: { type: String, default: "", index: true },
    grade: { type: String, default: "", index: true },

    batchNo: { type: String, required: true, index: true },
    testDate: { type: Date, default: Date.now, index: true },

    operator: { type: String, default: "" },
    shift: { type: String, default: "" },

    values: { type: [QCResultValueSchema], default: [] },
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

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],

    /** Link back to dedicated Site module docs (ResinQC / HardenerQC / LMSQC) */
    sourceEntityType: { type: String, default: "", index: true },
    sourceEntityId: { type: mongoose.Schema.Types.ObjectId, index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

QCResultSchema.index({ company_id: 1, module: 1, batchNo: 1, testDate: -1 });
QCResultSchema.index({ company_id: 1, system: 1, module: 1, productCategory: 1, testDate: -1 });
QCResultSchema.index({ company_id: 1, testDate: -1 });
QCResultSchema.index(
  { company_id: 1, system: 1, module: 1, sourceEntityType: 1, sourceEntityId: 1 },
  { unique: true, partialFilterExpression: { sourceEntityId: { $type: "objectId" } } }
);

module.exports = mongoose.model("QCResult", QCResultSchema);


