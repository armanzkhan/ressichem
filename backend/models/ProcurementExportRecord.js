const mongoose = require("mongoose");

const sourceDocumentSchema = new mongoose.Schema(
  {
    path: { type: String, default: "" },
    firebasePath: { type: String, default: "" },
    storage: { type: String, enum: ["local", "firebase"], default: "local" },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const procurementExportRecordSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    recordType: { type: String, enum: ["document", "shipment"], required: true, index: true },
    recordNumber: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    documentCategory: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    documentDate: { type: Date },
    notes: { type: String, default: "" },
    sourceDocument: { type: sourceDocumentSchema, default: () => ({}) },
    /** Export shipment tracking form — Letter of Credit */
    lcNumber: { type: String, default: "" },
    lcIssueDate: { type: Date },
    lcExpiryDate: { type: Date },
    lcAmendment1: { type: String, default: "" },
    lcAmendment2: { type: String, default: "" },
    lcAmendment3: { type: String, default: "" },
    /** Shipment section */
    vesselName: { type: String, default: "" },
    ets: { type: Date },
    eta: { type: Date },
    /** Documents section */
    docsDispatchDate: { type: Date },
    docsReceiveDate: { type: Date },
    dhlNumber: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementExportRecordSchema.index({ company_id: 1, recordNumber: 1 }, { unique: true });
procurementExportRecordSchema.index({ company_id: 1, recordType: 1, createdAt: -1 });

module.exports = mongoose.model("ProcurementExportRecord", procurementExportRecordSchema);
