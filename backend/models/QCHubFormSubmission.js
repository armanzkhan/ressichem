const mongoose = require("mongoose");

/**
 * QCHubFormSubmission
 * Stores raw data forms for Dry Mortar QC Hub.
 * We keep payload flexible (Mixed) to handle multiple form formats.
 */
const QCHubFormSubmissionSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    planGroup: { type: String, default: "DRY_MORTAR", index: true },
    productType: { type: String, default: "", index: true }, // TILE_ADHESIVE / GROUTS / PLASTER_RENDER_OTHER
    productName: { type: String, default: "", index: true },
    batchNo: { type: String, default: "", index: true },

    formType: {
      type: String,
      required: true,
      index: true,
      // examples:
      // SAMPLE_TRACKING_ISSUANCE, WATER_RETENTION, WATER_ABSORPTION, TENSILE_ADHESION,
      // SLIP_DBD_WETTING, SHRINKAGE, RESIDUE, FLEXURAL_COMPRESSIVE, FRESH_MORTAR_DENSITY_AIR_SPREAD
    },

    sampleTrackingNo: { type: String, default: "", index: true },

    // generic dates (some forms have multiple testing dates)
    productionDate: { type: Date },
    castingDate: { type: Date },
    testDate: { type: Date, index: true },
    days: { type: Number }, // 7/14/21/28 etc where applicable

    payload: { type: mongoose.Schema.Types.Mixed }, // form-specific fields & table rows
    remarks: { type: String, default: "" },

    status: { type: String, enum: ["draft", "submitted", "approved", "rejected"], default: "draft", index: true },
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

QCHubFormSubmissionSchema.index({ company_id: 1, formType: 1, batchNo: 1, sampleTrackingNo: 1, testDate: -1 });

module.exports = mongoose.model("QCHubFormSubmission", QCHubFormSubmissionSchema);


