const mongoose = require("mongoose");
const { lineItemSchema, commercialDocumentFields } = require("./procurementSchemas");

const purchaseOrderSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    poNumber: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    suppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" }],
    requisition: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseRequisition" },
    pfi: { type: mongoose.Schema.Types.ObjectId, ref: "ProformaInvoice" },
    status: {
      type: String,
      enum: ["draft", "issued", "partial", "received", "closed", "cancelled"],
      default: "draft",
    },
    currency: { type: String, default: "USD" },
    exchangeRate: { type: Number, default: 1 },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    ...commercialDocumentFields,
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ company_id: 1, poNumber: 1 }, { unique: true });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
