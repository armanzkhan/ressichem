const mongoose = require("mongoose");

/**
 * MRM (Management Review Meeting)
 * - Periodic reviews (monthly/quarterly/annual)
 * - Pulls QC performance, complaints, CAPA, EN compliance
 * - Decisions, action items, responsibilities tracked
 * - Management e-signature required for approval
 * - Audit-ready with unique IDs & attendance
 */
const MRMAttendeeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String, default: "" },
    attended: { type: Boolean, default: true },
    signature: { type: mongoose.Schema.Types.ObjectId, ref: "ElectronicSignature" }, // optional per-attendee signature
  },
  { _id: false }
);

const MRMActionItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"],
      default: "OPEN",
    },
    completedAt: { type: Date },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const MRMDecisionSchema = new mongoose.Schema(
  {
    decision: { type: String, required: true },
    rationale: { type: String, default: "" },
    actionItems: { type: [String], default: [] }, // references to action item indices
  },
  { _id: false }
);

const MRMSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // MRM identification
    mrmNo: { type: String, required: true, index: true }, // e.g. "MRM-2024-Q1"
    title: { type: String, required: true },
    reviewPeriod: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "ANNUAL", "AD_HOC"],
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Meeting details
    meetingDate: { type: Date, required: true, index: true },
    meetingLocation: { type: String, default: "" },
    meetingDuration: { type: Number }, // in minutes
    chairperson: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attendees: { type: [MRMAttendeeSchema], default: [] },

    // Review data (pulled from system)
    qcPerformance: {
      totalBatches: { type: Number, default: 0 },
      passedBatches: { type: Number, default: 0 },
      failedBatches: { type: Number, default: 0 },
      passRate: { type: Number, default: 0 },
      outOfSpecCount: { type: Number, default: 0 },
      summary: { type: String, default: "" },
    },

    complaints: {
      total: { type: Number, default: 0 },
      byType: { type: mongoose.Schema.Types.Mixed, default: {} },
      bySeverity: { type: mongoose.Schema.Types.Mixed, default: {} },
      unresolved: { type: Number, default: 0 },
      summary: { type: String, default: "" },
    },

    capa: {
      total: { type: Number, default: 0 },
      open: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      summary: { type: String, default: "" },
    },

    enCompliance: {
      totalProducts: { type: Number, default: 0 },
      compliant: { type: Number, default: 0 },
      nonCompliant: { type: Number, default: 0 },
      complianceRate: { type: Number, default: 0 },
      details: [{ type: mongoose.Schema.Types.Mixed }],
      summary: { type: String, default: "" },
    },

    // Meeting content
    agenda: [{ type: String }],
    minutes: { type: String, default: "" },
    decisions: { type: [MRMDecisionSchema], default: [] },
    actionItems: { type: [MRMActionItemSchema], default: [] },

    // Status & approval
    status: {
      type: String,
      enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "APPROVED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },

    approved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvalSignature: { type: mongoose.Schema.Types.ObjectId, ref: "ElectronicSignature" },

    // Follow-up
    nextReviewDate: { type: Date },
    followUpRequired: { type: Boolean, default: false },
    followUpNotes: { type: String, default: "" },

    // Attachments
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],

    // Metadata
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

MRMSchema.index({ company_id: 1, mrmNo: 1 }, { unique: true });
MRMSchema.index({ company_id: 1, reviewPeriod: 1, periodStart: -1 });
MRMSchema.index({ company_id: 1, status: 1, meetingDate: -1 });

module.exports = mongoose.model("MRM", MRMSchema);

