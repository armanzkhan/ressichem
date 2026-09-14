const mongoose = require("mongoose");

/**
 * ResinQC
 * SRS 3.1.1 - Resin QC Module
 * Stores batch records for Epoxy resin with specific parameters
 */
const ResinQCSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Batch Information
    batchNo: { type: String, required: true, index: true },
    productName: { type: String, default: "", index: true },
    grade: { type: String, default: "", index: true },
    testDate: { type: Date, default: Date.now, index: true },
    
    // Resin-Specific Parameters (SRS 3.1.1)
    color: { type: String, default: "" },
    transparency: { type: String, default: "" },
    eew: { type: Number }, // Epoxy Equivalent Weight
    gelTime: { type: Number }, // in minutes
    gelTimeUnit: { type: String, default: "min" },
    viscosity: { type: Number }, // at 25°C
    viscosityUnit: { type: String, default: "cP" },
    mixViscosity: { type: Number },
    mixViscosityUnit: { type: String, default: "cP" },
    exothermicTemperature: { type: Number }, // Peak exothermic temperature
    exothermicTemperatureUnit: { type: String, default: "°C" },
    hycl: { type: Number }, // Hydrolysable chloride content
    hyclUnit: { type: String, default: "ppm" },
    solidContent: { type: Number }, // Percentage
    solidContentUnit: { type: String, default: "%" },
    remarks: { type: String, default: "" },
    
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
    
    // Testing Summary Files (SRS 3.1.1)
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ResinQCSchema.index({ company_id: 1, batchNo: 1, testDate: -1 });
ResinQCSchema.index({ company_id: 1, productName: 1, testDate: -1 });

module.exports = mongoose.model("ResinQC", ResinQCSchema);

