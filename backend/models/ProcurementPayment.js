const mongoose = require("mongoose");

const procurementPaymentSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    paymentNumber: { type: String, required: true },
    supplierInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcurementSupplierInvoice",
      required: true,
      index: true,
    },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" },
    purchaseType: { type: String, enum: ["local", "foreign"], default: "foreign" },
    paymentDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD" },
    exchangeRate: { type: Number, default: 1 },
    method: {
      type: String,
      enum: ["bank_transfer", "cheque", "cash", "lc", "other"],
      default: "bank_transfer",
    },
    reference: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "posted", "cancelled"],
      default: "posted",
    },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementPaymentSchema.index({ company_id: 1, paymentNumber: 1 }, { unique: true });

module.exports = mongoose.model("ProcurementPayment", procurementPaymentSchema);
