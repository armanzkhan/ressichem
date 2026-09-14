const mongoose = require("mongoose");
const { lineItemSchema } = require("./procurementSchemas");

const prApprovalSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    departmentKey: { type: String, default: "" },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "held"],
      default: "pending",
    },
    actedAt: { type: Date },
    reason: { type: String, default: "" },
  },
  { _id: true }
);

const purchaseRequisitionSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    requisitionNumber: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" },
    /** Display label: unique departments joined (legacy single-dept still works). */
    title: { type: String, default: "" },
    purchaseType: { type: String, enum: ["local", "foreign"], default: "foreign" },
    status: {
      type: String,
      enum: ["draft", "submitted", "partially_approved", "approved", "rejected", "held", "cancelled"],
      default: "draft",
    },
    currency: { type: String, default: "USD" },
    exchangeRate: { type: Number, default: 1 },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** Primary / first pending approver (legacy + list convenience). */
    assignedApprover: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** One entry per department; PR is fully approved only when all are approved. */
    approvals: [prApprovalSchema],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
    heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    heldAt: { type: Date },
    holdReason: { type: String, default: "" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

purchaseRequisitionSchema.index({ company_id: 1, requisitionNumber: 1 }, { unique: true });
purchaseRequisitionSchema.index({ company_id: 1, "approvals.approver": 1, status: 1 });

module.exports = mongoose.model("PurchaseRequisition", purchaseRequisitionSchema);
