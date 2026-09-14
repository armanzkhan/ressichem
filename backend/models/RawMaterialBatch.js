const mongoose = require("mongoose");

/**
 * RawMaterialBatch
 * - Tracks individual batches of raw materials
 * - COA, expiry, receipt tracking
 * - Batch comparison & selection
 */
const RawMaterialBatchSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: "RawMaterial", required: true, index: true },

    // Batch identification
    batchNo: { type: String, required: true, index: true },
    lotNo: { type: String, default: "" },
    supplierBatchNo: { type: String, default: "" },

    // Receipt information
    receiptDate: { type: Date, default: Date.now, index: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "kg" },
    purchaseOrderNo: { type: String, default: "" },
    invoiceNo: { type: String, default: "" },

    // Quality documents
    coa: {
      documentUrl: { type: String, default: "" },
      documentDate: { type: Date },
      testResults: { type: mongoose.Schema.Types.Mixed, default: {} },
      approved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
    },

    // Expiry & shelf life
    manufacturingDate: { type: Date },
    expiryDate: { type: Date, index: true },
    daysToExpiry: { type: Number }, // calculated field

    // Status
    status: {
      type: String,
      enum: ["RECEIVED", "IN_STOCK", "QUARANTINE", "REJECTED", "USED", "EXPIRED"],
      default: "RECEIVED",
      index: true,
    },
    quarantineReason: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },

    // QC testing
    qcTested: { type: Boolean, default: false },
    qcTestDate: { type: Date },
    qcTestResult: { type: String, enum: ["PASS", "FAIL", "PENDING"], default: "PENDING" },
    qcTestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Usage tracking
    remainingQuantity: { type: Number }, // updated when used in formulations
    usedInFormulations: [
      {
        formulation: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation" },
        quantity: { type: Number },
        date: { type: Date },
      },
    ],

    remarks: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RawMaterialBatchSchema.index({ company_id: 1, rawMaterial: 1, batchNo: 1 }, { unique: true });
RawMaterialBatchSchema.index({ company_id: 1, status: 1, expiryDate: 1 });

module.exports = mongoose.model("RawMaterialBatch", RawMaterialBatchSchema);

