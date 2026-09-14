const mongoose = require("mongoose");

/**
 * CAPA (Corrective and Preventive Action)
 * - Linked to complaints and QC deviations
 * - Workflow: initiation, root cause analysis, corrective/preventive actions,
 *   management approval, implementation, verification, closure
 * - Access: QC can initiate, Management approves & closes, R&D involved only when assigned
 */
const ActionItemSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: ["CORRECTIVE", "PREVENTIVE"],
      required: true,
    },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    evidence: [{ type: String }], // URLs to documents
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const CAPASchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // CAPA identification
    capaNo: { type: String, required: true, index: true }, // e.g. "CAPA-2024-001"
    title: { type: String, required: true },

    // Source
    sourceType: {
      type: String,
      enum: ["COMPLAINT", "QC_DEVIATION", "INTERNAL_AUDIT", "MANAGEMENT_REVIEW", "OTHER"],
      required: true,
      index: true,
    },
    sourceReference: { type: String, default: "" }, // e.g. complaint number, deviation ID
    sourceEntityId: { type: mongoose.Schema.Types.ObjectId }, // link to complaint, deviation, etc.

    // Problem description
    problemDescription: { type: String, required: true },
    identifiedDate: { type: Date, default: Date.now },

    // Root cause analysis
    rootCauseAnalysis: {
      conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      conductedDate: { type: Date },
      method: { type: String, default: "" }, // e.g. "5 Whys", "Fishbone", "FMEA"
      rootCauses: [{ type: String }], // list of identified root causes
      analysisDetails: { type: String, default: "" },
    },

    // Actions
    correctiveActions: { type: [ActionItemSchema], default: [] },
    preventiveActions: { type: [ActionItemSchema], default: [] },

    // Management approval
    managementApproval: {
      approved: { type: Boolean, default: false },
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvalSignature: { type: mongoose.Schema.Types.ObjectId, ref: "ElectronicSignature" },
      comments: { type: String, default: "" },
    },

    // Implementation
    implementation: {
      started: { type: Boolean, default: false },
      startedAt: { type: Date },
      startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      progress: { type: Number, default: 0, min: 0, max: 100 }, // percentage
      notes: { type: String, default: "" },
    },

    // Verification
    verification: {
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verificationMethod: { type: String, default: "" },
      verificationResults: { type: String, default: "" },
      evidence: [{ type: String }], // URLs to documents
    },

    // Closure
    closure: {
      closed: { type: Boolean, default: false },
      closedAt: { type: Date },
      closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      closureSignature: { type: mongoose.Schema.Types.ObjectId, ref: "ElectronicSignature" },
      closureComments: { type: String, default: "" },
    },

    // Status & workflow
    status: {
      type: String,
      enum: [
        "INITIATED",
        "ROOT_CAUSE_ANALYSIS",
        "PENDING_APPROVAL",
        "APPROVED",
        "IMPLEMENTATION",
        "VERIFICATION",
        "CLOSED",
        "REJECTED",
      ],
      default: "INITIATED",
      index: true,
    },

    // Assignments
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // QC user
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // can include R&D if needed
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // primary responsible person

    // Effectiveness review (post-closure)
    effectivenessReview: {
      reviewed: { type: Boolean, default: false },
      reviewedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      effective: { type: Boolean },
      reviewComments: { type: String, default: "" },
    },

    // Metadata
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    targetClosureDate: { type: Date },
    tags: [{ type: String }],
    notes: { type: String, default: "" },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CAPASchema.index({ company_id: 1, capaNo: 1 }, { unique: true });
CAPASchema.index({ company_id: 1, status: 1, identifiedDate: -1 });
CAPASchema.index({ company_id: 1, sourceType: 1, sourceEntityId: 1 });

module.exports = mongoose.model("CAPA", CAPASchema);

