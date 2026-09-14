const mongoose = require("mongoose");

/**
 * RDExperiment
 * - Plan & track R&D experiments
 * - Compare reference vs modified formulations
 * - Store observations, images, conclusions
 */
const ExperimentTrialSchema = new mongoose.Schema(
  {
    trialNo: { type: Number, required: true },
    formulation: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation", required: true },
    isReference: { type: Boolean, default: false }, // reference formulation for comparison
    modifications: { type: String, default: "" }, // description of changes from reference
    testResults: { type: mongoose.Schema.Types.Mixed, default: {} }, // flexible test data
    observations: { type: String, default: "" },
    images: [{ type: String }], // URLs to images
    conclusion: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PLANNED",
    },
  },
  { _id: false }
);

const RDExperimentSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Experiment identification
    experimentCode: { type: String, required: true, index: true }, // e.g. "R&D-2024-001"
    experimentName: { type: String, required: true },
    objective: { type: String, required: true }, // experiment objective

    // Product context
    productType: {
      type: String,
      enum: [
        "TILE_ADHESIVE",
        "TILE_GROUT",
        "PREMIX_PLASTER",
        "REPAIR_PLASTER",
        "CRACK_FILLER",
        "WATERPROOFING_MEMBRANE",
        "SURFACE_SEALANT",
        "OTHER",
      ],
      index: true,
    },
    targetProduct: { type: String, default: "" }, // target product name/grade

    // Reference formulation
    referenceFormulation: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation" },

    // Trials
    trials: { type: [ExperimentTrialSchema], default: [] },

    // Planning
    plannedStartDate: { type: Date },
    plannedEndDate: { type: Date },
    actualStartDate: { type: Date },
    actualEndDate: { type: Date },

    // Status
    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"],
      default: "PLANNED",
      index: true,
    },

    // Results & analysis
    overallResults: { type: String, default: "" },
    bestTrial: { type: Number }, // trial number with best results
    recommendedFormulation: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation" },
    conclusion: { type: String, default: "" },
    nextSteps: { type: String, default: "" },

    // Comparison analysis
    comparisonData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // structured comparison data
    },

    // Assignments
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // R&D chemists
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Senior R&D Scientist

    // Metadata
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    tags: [{ type: String }],
    notes: { type: String, default: "" },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RDExperimentSchema.index({ company_id: 1, experimentCode: 1 }, { unique: true });
RDExperimentSchema.index({ company_id: 1, status: 1, productType: 1 });

module.exports = mongoose.model("RDExperiment", RDExperimentSchema);

