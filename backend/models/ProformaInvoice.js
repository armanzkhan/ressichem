const mongoose = require("mongoose");
const { lineItemSchema, commercialDocumentFields } = require("./procurementSchemas");

const proformaInvoiceSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    pfiNumber: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "converted", "cancelled"],
      default: "draft",
    },
    currency: { type: String, default: "USD" },
    exchangeRate: { type: Number, default: 1 },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    sourceDocument: {
      path: { type: String, default: "" },
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    /** import_received = from foreign suppliers; export_issued = we issue; export_received = received from buyers */
    pfiFlow: {
      type: String,
      enum: ["import_received", "export_issued", "export_received"],
      default: "import_received",
    },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    ...commercialDocumentFields,
  },
  { timestamps: true }
);

proformaInvoiceSchema.index({ company_id: 1, pfiNumber: 1 }, { unique: true });

module.exports = mongoose.model("ProformaInvoice", proformaInvoiceSchema);
