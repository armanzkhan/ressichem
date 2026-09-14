const mongoose = require("mongoose");

/**
 * QCStandardCriteria
 * - Defines acceptable ranges/targets for a given product/grade + test
 * - Multiple versions can exist using effectiveFrom/effectiveTo
 */
const QCStandardCriteriaSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Product scoping (kept flexible to cover Resin/Hardener/LMS/RM/PM/etc)
    system: {
      type: String,
      enum: ["QC_SITE_AREA", "QC_HUB"],
      default: "QC_SITE_AREA",
      index: true,
    },
    module: {
      type: String,
      default: "", // e.g. "RESIN", "HARDENER", "RAW_MATERIAL", "PACKAGING", "LMS_FLOORING"
      index: true,
    },
    productCategory: { type: String, default: "", index: true }, // e.g. "Epoxy Resin"
    productName: { type: String, default: "", index: true }, // optional SKU/name
    grade: { type: String, default: "", index: true },

    test: { type: mongoose.Schema.Types.ObjectId, ref: "QCTest", required: true, index: true },

    // Specs
    min: { type: Number },
    max: { type: Number },
    target: { type: Number },
    unit: { type: String, default: "" },
    notes: { type: String, default: "" },

    effectiveFrom: { type: Date, default: Date.now, index: true },
    effectiveTo: { type: Date },
    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

QCStandardCriteriaSchema.index(
  { company_id: 1, system: 1, module: 1, productCategory: 1, productName: 1, grade: 1, test: 1, effectiveFrom: 1 },
  { unique: true }
);

module.exports = mongoose.model("QCStandardCriteria", QCStandardCriteriaSchema);


