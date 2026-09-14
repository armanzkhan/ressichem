const mongoose = require("mongoose");

/**
 * QCTest
 * - Defines a measurable QC parameter/test (e.g., EEW, Viscosity, Gel time)
 * - Used by Standard Criteria and Results
 */
const QCTestSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Human + machine identifiers
    code: { type: String, required: true }, // e.g. "EEW", "VISCOSITY_25C"
    name: { type: String, required: true }, // e.g. "Epoxy Equivalent Weight (EEW)"

    description: { type: String, default: "" },
    unit: { type: String, default: "" }, // e.g. "cP", "min", "°C"

    dataType: {
      type: String,
      enum: ["number", "string", "boolean"],
      default: "number",
    },

    // Optional metadata for UI / validation
    suggestedMin: { type: Number },
    suggestedMax: { type: Number },
    method: { type: String, default: "" }, // SOP/ASTM reference

    // Scoping / classification
    applicableModules: {
      type: [String],
      default: [], // e.g. ["RESIN", "HARDENER", "RAW_MATERIAL", "PACKAGING", "LMS_RESIN"]
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

QCTestSchema.index({ company_id: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("QCTest", QCTestSchema);


