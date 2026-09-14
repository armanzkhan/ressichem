const mongoose = require("mongoose");

/** Calibration records — SRS 3.2.1 */
const CalibrationRecordSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    recordNo: { type: String, required: true, index: true },
    equipmentName: { type: String, required: true, index: true },
    equipmentId: { type: String, default: "" },
    location: { type: String, default: "" },
    calibrationDate: { type: Date, required: true, index: true },
    nextDueDate: { type: Date, index: true },
    calibratedBy: { type: String, default: "" },
    calibrationAgency: { type: String, default: "" },
    certificateNo: { type: String, default: "" },
    standardUsed: { type: String, default: "" },
    results: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["VALID", "DUE_SOON", "OVERDUE", "OUT_OF_SERVICE"],
      default: "VALID",
      index: true,
    },
    remarks: { type: String, default: "" },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CalibrationRecordSchema.index({ company_id: 1, recordNo: 1 }, { unique: true });

module.exports = mongoose.model("CalibrationRecord", CalibrationRecordSchema);
