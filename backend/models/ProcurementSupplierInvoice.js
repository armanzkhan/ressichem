const mongoose = require("mongoose");

const invoiceLineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementItem" },
    itemCode: { type: String, default: "" },
    itemName: { type: String, default: "" },
    description: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: true }
);

const procurementSupplierInvoiceSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    supplierInvoiceNo: { type: String, default: "" },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },
    goodsReceipt: { type: mongoose.Schema.Types.ObjectId, ref: "GoodsReceiptNote" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    purchaseType: { type: String, enum: ["local", "foreign"], default: "foreign" },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    currency: { type: String, default: "USD" },
    exchangeRate: { type: Number, default: 1 },
    items: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    matchedPoTotal: { type: Number, default: 0 },
    matchedReceivedTotal: { type: Number, default: 0 },
    matchStatus: {
      type: String,
      enum: ["unmatched", "matched", "variance"],
      default: "unmatched",
    },
    matchNotes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "submitted", "matched", "partially_paid", "paid", "cancelled"],
      default: "draft",
    },
    amountPaid: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    matchedAt: { type: Date },
  },
  { timestamps: true }
);

procurementSupplierInvoiceSchema.index({ company_id: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model("ProcurementSupplierInvoice", procurementSupplierInvoiceSchema);
