const mongoose = require("mongoose");

/**
 * Formulation
 * - Recipe control with versioning
 * - Cost estimation & BOM generation
 * - R&D to QC transition workflow
 */
const FormulationIngredientSchema = new mongoose.Schema(
  {
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    rawMaterialBatch: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterialBatch" }, // optional, for specific batch selection
    quantity: { type: Number, required: true },
    unit: { type: String, default: "kg" },
    percentage: { type: Number }, // percentage of total
    costPerUnit: { type: Number }, // for cost calculation
  },
  { _id: false }
);

const FormulationSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Formulation identification
    formulationCode: { type: String, required: true, index: true }, // e.g. "TA-C1-001"
    formulationName: { type: String, required: true },
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
      required: true,
      index: true,
    },
    productName: { type: String, default: "" }, // e.g. "Tile Adhesive C1"
    grade: { type: String, default: "" }, // e.g. "C1", "C2", "C2TE"

    // Recipe
    totalQuantity: { type: Number, default: 1000 }, // base quantity (kg/ton)
    quantityUnit: { type: String, default: "kg" },
    ingredients: { type: [FormulationIngredientSchema], default: [] },

    // Version control
    version: { type: String, default: "1.0", index: true },
    parentVersion: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation" }, // for version history
    versionHistory: [
      {
        version: { type: String },
        changedAt: { type: Date },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changeReason: { type: String },
      },
    ],

    // Cost estimation
    estimatedCostPerUnit: { type: Number },
    estimatedCostPerTon: { type: Number },
    lastCostUpdate: { type: Date },

    // Workflow & status
    mode: {
      type: String,
      enum: ["R&D", "QC"],
      default: "R&D",
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "R&D_ACTIVE", "R&D_COMPLETED", "PENDING_QC_APPROVAL", "QC_APPROVED", "FROZEN", "OBSOLETE"],
      default: "DRAFT",
      index: true,
    },

    // R&D to QC transition
    submittedToQC: { type: Boolean, default: false },
    submittedToQCAt: { type: Date },
    submittedToQCBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedForQC: { type: Boolean, default: false },
    approvedForQCAt: { type: Date },
    approvedForQCBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    qcApprovalSignature: { type: mongoose.Schema.Types.ObjectId, ref: "ElectronicSignature" },

    // Freezing (Management only)
    frozen: { type: Boolean, default: false },
    frozenAt: { type: Date },
    frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    freezeReason: { type: String, default: "" },

    // Standards & compliance
    applicableStandards: [
      {
        standard: { type: String }, // e.g. "EN 12004-1"
        classification: { type: String }, // e.g. "C1"
        notes: { type: String },
      },
    ],

    // Acceptance limits (for QC mode)
    acceptanceLimits: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // test-specific limits
    },

    // R&D observations
    rndObservations: { type: String, default: "" },
    rndImages: [{ type: String }], // URLs to images
    rndConclusion: { type: String, default: "" },

    // Metadata
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    tags: [{ type: String }],

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FormulationSchema.index({ company_id: 1, formulationCode: 1, version: 1 }, { unique: true });
FormulationSchema.index({ company_id: 1, mode: 1, status: 1 });
FormulationSchema.index({ company_id: 1, productType: 1, grade: 1 });

module.exports = mongoose.model("Formulation", FormulationSchema);

