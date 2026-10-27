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
    /** Plant lock for scoped buyers — e.g. "lahore" for Local (Lahore) buyers */
    plantScope: { type: String, default: "", index: true },
    /** Soft-delete flag — inactive rows are hidden from lists */
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** Business cancel (record stays listed; PR can create a new PO) */
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String, default: "" },
    ...commercialDocumentFields,
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ company_id: 1, poNumber: 1 }, { unique: true });
/** Speeds PR list fulfillment enrich (find POs by requisition ids) */
purchaseOrderSchema.index({ company_id: 1, requisition: 1, isActive: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
