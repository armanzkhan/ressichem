const mongoose = require("mongoose");

const grnLineSchema = new mongoose.Schema(
  {
    poLineId: { type: mongoose.Schema.Types.ObjectId },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementItem" },
    itemCode: { type: String, default: "" },
    itemName: { type: String, default: "" },
    unit: { type: String, default: "EA" },
    orderedQuantity: { type: Number, default: 0 },
    receivedQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
  },
  { _id: true }
);

const goodsReceiptNoteSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    grnNumber: { type: String, required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true, index: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" },
    purchaseType: { type: String, enum: ["local", "foreign"], default: "foreign" },
    receiptDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["draft", "posted", "cancelled"],
      default: "posted",
    },
    items: [grnLineSchema],
    notes: { type: String, default: "" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

goodsReceiptNoteSchema.index({ company_id: 1, grnNumber: 1 }, { unique: true });

module.exports = mongoose.model("GoodsReceiptNote", goodsReceiptNoteSchema);
