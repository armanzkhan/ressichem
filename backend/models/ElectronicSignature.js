const mongoose = require("mongoose");

/**
 * ElectronicSignature
 * - Mandatory for approvals (R&D → QC, batch release, deviations)
 * - Records identity, role, date/time, comments
 * - Permanent & non-editable
 */
const ElectronicSignatureSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },

    // Signature context
    signatureType: {
      type: String,
      enum: [
        "R&D_TO_QC_APPROVAL",
        "BATCH_RELEASE",
        "DEVIATION_APPROVAL",
        "CAPA_APPROVAL",
        "CAPA_CLOSURE",
        "MRM_APPROVAL",
        "FORMULATION_FREEZE",
        "COMPLAINT_CLOSURE",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    // What is being signed
    relatedEntityType: {
      type: String,
      enum: ["FORMULATION", "BATCH", "QC_RESULT", "COMPLAINT", "CAPA", "MRM", "DEVIATION", "OTHER"],
      required: true,
    },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // Signer information
    signer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true }, // role at time of signing
      department: { type: String, default: "" },
    },

    // Signature details
    action: { type: String, required: true }, // e.g. "Approved for QC release", "Released batch"
    comments: { type: String, default: "" },
    signedAt: { type: Date, default: Date.now, required: true, index: true },

    // IP and device info (for audit)
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    // Status
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Make signatures non-editable by preventing updates after creation
ElectronicSignatureSchema.pre("save", function (next) {
  if (this.isNew) {
    return next();
  }
  // Prevent updates to existing signatures
  const error = new Error("Electronic signatures cannot be modified");
  error.name = "SignatureImmutable";
  return next(error);
});

ElectronicSignatureSchema.index({ company_id: 1, signatureType: 1, relatedEntityId: 1 });
ElectronicSignatureSchema.index({ company_id: 1, "signer.userId": 1, signedAt: -1 });

module.exports = mongoose.model("ElectronicSignature", ElectronicSignatureSchema);

