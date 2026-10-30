const mongoose = require("mongoose");
const { lineItemSchema } = require("./procurementSchemas");

const prApprovalSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    departmentKey: { type: String, default: "" },
    /**
     * department = line/dept managers (parallel);
     * lab / finance / boss = corporate stages after all departments approve (sequential).
     */
    stage: {
      type: String,
      enum: ["department", "lab", "finance", "boss"],
      default: "department",
    },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      // cancelled = later stage not reached because someone earlier rejected / SLA closed
      enum: ["pending", "approved", "rejected", "held", "cancelled"],
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
    /**
     * Approval chain variants:
     * - standard: department → finance → boss
     * - skip_finance: department → boss (e.g. Siraj)
     * - lab_then_finance: department → lab → finance (Production/Maintenance)
     */
    approvals: [prApprovalSchema],
    approvalChain: {
      type: String,
      enum: ["standard", "skip_finance", "lab_then_finance"],
      default: "standard",
    },
    /** @deprecated use approvalChain === "skip_finance" */
    skipFinanceApproval: { type: Boolean, default: false },
    /**
     * Sticky at submit: Lahore PRs use tahira@ as Finance Manager (not finance@ / Boss),
     * even if location/title is edited later.
     */
    lahoreFinalApproval: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
    heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    heldAt: { type: Date },
    holdReason: { type: String, default: "" },
    /** Hold pauses the 72-hour SLA until this instant (heldAt + 30 days). */
    holdExpiresAt: { type: Date },
    /** Hold-expiry reminder keys already sent, e.g. "hold7d", "hold24h". */
    holdRemindersSent: { type: [String], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    /**
     * 72 hours from submit. Stored at submit so in-flight PRs keep their original deadline.
     */
    slaDueAt: { type: Date },
    slaReminderSentAt: { type: Date },
    /** Reminder keys already sent, e.g. "48h", "24h". */
    slaRemindersSent: { type: [String], default: [] },
    slaClosedByDeadline: { type: Boolean, default: false },
    /** Line fingerprint at SLA close. Resubmit resumes only when this still matches. */
    slaContentKey: { type: String, default: "" },
    /** Rejection and hold remarks kept after resubmit or release. */
    decisionLog: [
      {
        kind: { type: String, enum: ["rejected", "held", "approved"], required: true },
        at: { type: Date, default: Date.now },
        actorName: { type: String, default: "" },
        reason: { type: String, default: "" },
      },
    ],
    /**
     * Optional site / plant location for location-wise reports.
     * Empty on existing records — does not affect approval workflow.
     */
    location: { type: String, default: "", trim: true, index: true },
    /**
     * Optional follow-up for pending / on-hold PRs (additive; never blocks submit/approve).
     */
    followUpStatus: {
      type: String,
      enum: ["", "open", "in_progress", "done"],
      default: "",
    },
    followUpNote: { type: String, default: "" },
    followUpBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    followUpAt: { type: Date },
    /** Soft-delete flag — inactive rows are hidden from lists */
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseRequisitionSchema.index({ company_id: 1, requisitionNumber: 1 }, { unique: true });
purchaseRequisitionSchema.index({ company_id: 1, "approvals.approver": 1, status: 1 });

module.exports = mongoose.model("PurchaseRequisition", purchaseRequisitionSchema);
