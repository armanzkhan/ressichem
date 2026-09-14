const mongoose = require("mongoose");

/**
 * QABottleFilling
 * SRS 3.2 - Daily Bottle Filling Department Checks
 * Operator-wise and shift-wise data entry
 * Filling machine time-wise records (every hour)
 */
const HourlyRecordSchema = new mongoose.Schema(
  {
    timeSlot: { type: String, default: "" }, // e.g. 09:00, 10:30
    hour: { type: Number }, // legacy numeric hour (0-23)
    fillingMachineStatus: { type: String, default: "" }, // On / Off
    drumCondition: { type: String, default: "" }, // Ok / Not Ok
    drumIbcNo: { type: String, default: "" },
    batchNo: { type: String, default: "" },
    grade: { type: String, default: "" },
    materialParticlesStatus: { type: String, default: "" },
    productName: { type: String, default: "" },
    kitSize: { type: String, default: "" }, // Mini / Half / Full / Can
    colourStatus: { type: String, default: "" }, // Ok / Not Ok
    bottleWeight: { type: Number },
    sealingCondition: { type: String, default: "" },
    cappingStatus: { type: String, default: "" },
    cartonLabeling: { type: String, default: "" },
    cartonGrossWeight: { type: Number },
    packingCondition: { type: String, default: "" },
    cartonOnPallet: { type: String, default: "" },
    stackingHeight: { type: String, default: "" },
    weight: { type: Number }, // legacy alias for bottleWeight
    weightUnit: { type: String, default: "kg" },
    stacking: { type: String, default: "" }, // legacy alias for stackingHeight
    remarks: { type: String, default: "" },
  },
  { _id: false }
);

const QABottleFillingSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Date (Daily basis - SRS 3.2)
    date: { type: Date, required: true, index: true },
    
    // Operator & Shift (SRS 3.2)
    operator: { type: String, required: true, index: true },
    shift: { type: String, required: true, index: true }, // e.g., "Morning", "Afternoon", "Night"
    
    // Filling Machine Information
    machineId: { type: String, default: "" },
    machineName: { type: String, default: "" },
    
    // Hourly Records (SRS 3.2 - every hour record)
    hourlyRecords: { type: [HourlyRecordSchema], default: [] },
    
    // Summary
    totalBatches: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    totalWeightUnit: { type: String, default: "kg" },
    
    // Traceability Sheet (SRS 3.2 - auto-generate)
    traceabilitySheetGenerated: { type: Boolean, default: false },
    traceabilitySheetLink: { type: String, default: "" },
    
    // Status
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
    
    // Remarks & dispatch (traceability sheet footer)
    remarks: { type: String, default: "" },
    dispatchingDetails: { type: String, default: "" },
    qcOfficer: { type: String, default: "" },
    qcManager: { type: String, default: "" },
    
    // Attachments
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

QABottleFillingSchema.index({ company_id: 1, date: -1, operator: 1, shift: 1 });
QABottleFillingSchema.index({ company_id: 1, date: -1, machineId: 1 });

// Auto-calculate totals before save
QABottleFillingSchema.pre("save", function (next) {
  if (this.hourlyRecords && this.hourlyRecords.length > 0) {
    this.totalBatches = this.hourlyRecords.length;
    this.totalWeight = this.hourlyRecords.reduce((sum, record) => {
      return sum + (record.cartonGrossWeight || record.bottleWeight || record.weight || 0);
    }, 0);
  }
  next();
});

module.exports = mongoose.model("QABottleFilling", QABottleFillingSchema);

