const mongoose = require("mongoose");

const procurementItemPriceSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementItem", required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier", required: true },
    currency: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    minOrderQty: { type: Number, default: 1 },
    validFrom: { type: Date },
    validTo: { type: Date },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementItemPriceSchema.index({ company_id: 1, item: 1, supplier: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model("ProcurementItemPrice", procurementItemPriceSchema);
