const mongoose = require("mongoose");

/**
 * LMSQC
 * SRS 3.1.3 - LMS Department QC Module
 * Stores QC records for:
 * - LMS Epoxy hardener
 * - LMS Epoxy resin
 * - LMS Epoxy Flooring
 */
const LMSQCSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Product Type (SRS 3.1.3)
    productType: {
      type: String,
      enum: ["LMS_EPOXY_HARDENER", "LMS_EPOXY_RESIN", "LMS_EPOXY_FLOORING"],
      required: true,
      index: true,
    },
    
    // Batch Information
    batchNo: { type: String, required: true, index: true },
    productName: { type: String, default: "", index: true },
    grade: { type: String, default: "", index: true },
    testDate: { type: Date, default: Date.now, index: true },
    
    // Physical & Chemical Test Parameters (SRS 3.1.3)
    // Flexible structure to accommodate different test parameters per product type
    physicalTests: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // e.g., { viscosity: 2500, unit: "cP", color: "Clear", transparency: "Transparent" }
    },
    chemicalTests: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // e.g., { eew: 185, unit: "g/eq", amineValue: 450, unit: "mg KOH/g" }
    },
    
    // Common Parameters
    color: { type: String, default: "" },
    transparency: { type: String, default: "" },
    viscosity: { type: Number },
    viscosityUnit: { type: String, default: "cP" },
    gelTime: { type: Number },
    gelTimeUnit: { type: String, default: "min" },
    remarks: { type: String, default: "" },
    
    // Additional test results (flexible)
    testResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Store any additional product-specific test parameters
    },
    
    // Workflow
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
    
    // Testing Summary Files
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

LMSQCSchema.index({ company_id: 1, productType: 1, batchNo: 1, testDate: -1 });
LMSQCSchema.index({ company_id: 1, productName: 1, testDate: -1 });

module.exports = mongoose.model("LMSQC", LMSQCSchema);

