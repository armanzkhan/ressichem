const mongoose = require("mongoose");

/**
 * QCHubPlanItem
 * Represents QC Plan rows for Dry Mortar (and future Hub plans).
 * Example: "Slip" daily 1 batch EN 12004-2:2017 (8.2) requirement <= 0.5 mm
 */
const QCHubPlanItemSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Hub plan domain (start with Dry Mortar)
    planGroup: { type: String, default: "DRY_MORTAR", index: true },
    productType: {
      type: String,
      default: "", // e.g. "TILE_ADHESIVE", "GROUTS", "PLASTER_RENDER_OTHER"
      index: true,
    },

    testName: { type: String, required: true, index: true }, // e.g. "Slip"
    methodRef: { type: String, default: "" }, // e.g. "EN 12004-2:2017 (8.2)"
    frequency: { type: String, default: "" }, // e.g. "Daily 1 batch of each product"
    requirement: { type: String, default: "" }, // human-readable spec (>=, <=, tables, etc.)

    // optional linking to core Tests
    test: { type: mongoose.Schema.Types.ObjectId, ref: "QCTest" },
    unit: { type: String, default: "" },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

QCHubPlanItemSchema.index({ company_id: 1, planGroup: 1, productType: 1, testName: 1, methodRef: 1 }, { unique: true });

module.exports = mongoose.model("QCHubPlanItem", QCHubPlanItemSchema);


