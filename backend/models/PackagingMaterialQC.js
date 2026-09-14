const mongoose = require("mongoose");

/**
 * PackagingMaterialQC
 * SRS 3.1.5 - Packaging Material QC Module
 * Stores packaging material inspection/testing records
 */
const PackagingMaterialQCSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Material Information
    materialType: { type: String, required: true, index: true }, // e.g., "Bottle", "Carton", "Label", "Drum", "IBC"
    materialName: { type: String, required: true, index: true },
    batchNo: { type: String, required: true, index: true },
    testDate: { type: Date, default: Date.now, index: true },
    
    // Supplier Details (SRS 3.1.5)
    supplier: { type: String, required: true, index: true },
    supplierContact: { type: String, default: "" },
    supplierAddress: { type: String, default: "" },
    
    // COA (Certificate of Analysis) (SRS 3.1.5)
    coaLink: { type: String, default: "" }, // Link to COA document
    coaNumber: { type: String, default: "" },
    coaDate: { type: Date },
    
    // Inspection/Testing Results
    inspectionResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Flexible structure for different material types
      // e.g., { dimensions: "OK", weight: "OK", labeling: "OK", defects: "None" }
    },
    
    // Test Parameters (material-specific)
    testParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // e.g., { thickness: 0.5, unit: "mm", strength: 50, unit: "N" }
    },
    
    // Acceptance/Rejection (SRS 3.1.5)
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "conditional"],
      default: "pending",
      index: true,
    },
    acceptanceNotes: { type: String, default: "" },
    rejectionNotes: { type: String, default: "" },
    
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // Remarks
    remarks: { type: String, default: "" },
    
    // Attachments
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PackagingMaterialQCSchema.index({ company_id: 1, materialType: 1, batchNo: 1 });
PackagingMaterialQCSchema.index({ company_id: 1, supplier: 1, testDate: -1 });

module.exports = mongoose.model("PackagingMaterialQC", PackagingMaterialQCSchema);

