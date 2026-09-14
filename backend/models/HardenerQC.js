const mongoose = require("mongoose");

/**
 * HardenerQC
 * SRS 3.1.2 - Hardener QC Module
 * Stores batch records for Hardeners with specific parameters
 */
const HardenerQCSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Batch Information
    batchNo: { type: String, required: true, index: true },
    productName: { type: String, default: "", index: true },
    grade: { type: String, default: "", index: true },
    category: { type: String, default: "Hardeners", index: true }, // SRS: Categories include Hardeners
    testDate: { type: Date, default: Date.now, index: true },
    
    // Hardener-Specific Parameters (SRS 3.1.2)
    color: { type: String, default: "" },
    transparency: { type: String, default: "" },
    amineValue: { type: Number }, // Amine value
    amineValueUnit: { type: String, default: "mg KOH/g" },
    gelTime: { type: Number }, // in minutes
    gelTimeUnit: { type: String, default: "min" },
    viscosity: { type: Number }, // at 25°C
    viscosityUnit: { type: String, default: "cP" },
    mixViscosity: { type: Number },
    mixViscosityUnit: { type: String, default: "cP" },
    exothermicTemperature: { type: Number }, // Peak exothermic temperature
    exothermicTemperatureUnit: { type: String, default: "°C" },
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
    
    // Testing Summary Files (SRS 3.1.2)
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

HardenerQCSchema.index({ company_id: 1, batchNo: 1, testDate: -1 });
HardenerQCSchema.index({ company_id: 1, category: 1, testDate: -1 });

module.exports = mongoose.model("HardenerQC", HardenerQCSchema);

