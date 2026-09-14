const mongoose = require("mongoose");

/**
 * RawMaterial
 * - Material specifications (cement, sand, polymers, additives)
 * - Supplier, batch, COA, and expiry tracking
 * - Batch comparison & selection
 */
const RawMaterialSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Material identification
    materialCode: { type: String, required: true, index: true }, // e.g. "CEM-001"
    materialName: { type: String, required: true }, // e.g. "Portland Cement Type I"
    category: {
      type: String,
      enum: ["CEMENT", "SAND", "POLYMER", "ADDITIVE", "FILLER", "PIGMENT", "OTHER"],
      required: true,
      index: true,
    },
    description: { type: String, default: "" },
    unit: { type: String, default: "kg" }, // kg, L, bags, etc.

    // Specifications
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Flexible field for material-specific specs
    },

    // Supplier information
    supplier: {
      supplierName: { type: String, default: "" },
      supplierCode: { type: String, default: "" },
      contactPerson: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
      contactPhone: { type: String, default: "" },
    },

    // Storage & handling
    storageConditions: { type: String, default: "" },
    shelfLife: { type: Number }, // in days
    minStockLevel: { type: Number, default: 0 },
    maxStockLevel: { type: Number },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RawMaterialSchema.index({ company_id: 1, materialCode: 1 }, { unique: true });

module.exports = mongoose.model("RawMaterial", RawMaterialSchema);

