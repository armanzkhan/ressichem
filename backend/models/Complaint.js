const mongoose = require("mongoose");

/**
 * Complaint
 * - QC layer only (R&D cannot see customer data)
 * - Linked to batch and product
 * - QC investigation → Management review → Closure with corrective action
 */
const ComplaintInvestigationSchema = new mongoose.Schema(
  {
    investigatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    investigationDate: { type: Date },
    findings: { type: String, default: "" },
    rootCause: { type: String, default: "" },
    evidence: [{ type: String }], // URLs to documents/images
  },
  { _id: false }
);

const ComplaintSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Complaint identification
    complaintNo: { type: String, required: true, index: true }, // e.g. "COMP-2024-001"
    receivedDate: { type: Date, default: Date.now, required: true, index: true },

    // Customer information (QC layer only - R&D cannot access)
    customer: {
      customerName: { type: String, required: true },
      customerCode: { type: String, default: "" },
      contactPerson: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
      contactPhone: { type: String, default: "" },
      address: { type: String, default: "" },
    },

    // Product & batch information
    productType: {
      type: String,
      enum: [
        "TILE_ADHESIVE",
        "TILE_GROUT",
        "PREMIX_PLASTER",
        "REPAIR_PLASTER",
        "CRACK_FILLER",
        "WATERPROOFING_MEMBRANE",
        "SURFACE_SEALANT",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    productName: { type: String, required: true },
    grade: { type: String, default: "" },
    batchNo: { type: String, required: true, index: true },
    formulation: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation" },

    // Complaint details
    complaintType: {
      type: String,
      enum: ["QUALITY", "PERFORMANCE", "PACKAGING", "DELIVERY", "OTHER"],
      required: true,
    },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },

    // Supporting documents
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],

    // Investigation
    investigation: { type: ComplaintInvestigationSchema },

    // Management review
    managementReviewed: { type: Boolean, default: false },
    managementReviewedAt: { type: Date },
    managementReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managementComments: { type: String, default: "" },

    // CAPA linkage
    capa: { type: mongoose.Schema.Types.ObjectId, ref: "CAPA" },

    // Status & workflow
    status: {
      type: String,
      enum: ["RECEIVED", "UNDER_INVESTIGATION", "MANAGEMENT_REVIEW", "CAPA_INITIATED", "RESOLVED", "CLOSED"],
      default: "RECEIVED",
      index: true,
    },

    // Resolution
    resolution: { type: String, default: "" },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closureSignature: { type: mongoose.Schema.Types.ObjectId, ref: "ElectronicSignature" },

    // Customer response
    customerSatisfied: { type: Boolean },
    customerFeedback: { type: String, default: "" },

    // Assignments
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // QC Supervisor
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // QC Lab Technician

    remarks: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ComplaintSchema.index({ company_id: 1, complaintNo: 1 }, { unique: true });
ComplaintSchema.index({ company_id: 1, status: 1, receivedDate: -1 });
ComplaintSchema.index({ company_id: 1, batchNo: 1 });

module.exports = mongoose.model("Complaint", ComplaintSchema);

