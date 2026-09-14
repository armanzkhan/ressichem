const mongoose = require("mongoose");

/**
 * Maps a PR department (title) to the approver's email for routing on submit.
 */
const procurementDepartmentApproverSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    department: { type: String, required: true, trim: true },
    departmentKey: { type: String, required: true, trim: true, lowercase: true },
    approverEmail: { type: String, required: true, trim: true, lowercase: true },
    approverName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementDepartmentApproverSchema.index(
  { company_id: 1, departmentKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("ProcurementDepartmentApprover", procurementDepartmentApproverSchema);
