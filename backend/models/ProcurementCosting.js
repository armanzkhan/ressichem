const mongoose = require("mongoose");

/**
 * Procurement payment / costing / expense sheet.
 * Supports two parallel calculations:
 *  - tax_purpose: duty base uses a fixed payment rate
 *  - all_inclusive: landed cost uses a (possibly different) payment rate
 */
const procurementCostingSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    costingNumber: { type: String, required: true },
    /** local | import */
    tradeScope: { type: String, enum: ["local", "import"], default: "import", index: true },
    status: {
      type: String,
      enum: ["draft", "final", "cancelled"],
      default: "draft",
    },

    // Basic
    documentDate: { type: Date, default: Date.now },
    hsCode: { type: String, default: "" },
    bondCiDate: { type: String, default: "" },
    product: { type: String, default: "" },
    productDetail: { type: String, default: "" },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementItem" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    qtyExBond: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    exchangeRate: { type: Number, default: 1 },

    // CFR / commercial — tax purpose (rate fixed for duty calc)
    taxPurposeUnitPrice: { type: Number, default: 0 },
    taxPurposeInsuranceUsd: { type: Number, default: 0 },
    taxPurposeLandingPct: { type: Number, default: 1 },

    // CFR / commercial — everything inclusive (rate may differ)
    inclusiveUnitPrice: { type: Number, default: 0 },
    inclusiveInsuranceUsd: { type: Number, default: 0 },
    inclusiveLandingPct: { type: Number, default: 1 },

    // Duty rates (%)
    cdPct: { type: Number, default: 0 },
    addCdPct: { type: Number, default: 0 },
    adSalesTaxPct: { type: Number, default: 0 },
    salesTaxPct: { type: Number, default: 18 },
    incomeTaxPct: { type: Number, default: 2 },

    // Other charges (PKR)
    whsc: { type: Number, default: 0 },
    dutiesBond: { type: Number, default: 0 },
    agentBill: { type: Number, default: 0 },
    insurancePkr: { type: Number, default: 0 },
    bankComm: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },

    notes: { type: String, default: "" },

    // Stored computed snapshots (refreshed on save)
    taxPurpose: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    allInclusive: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementCostingSchema.index({ company_id: 1, costingNumber: 1 }, { unique: true });
procurementCostingSchema.index({ company_id: 1, tradeScope: 1, createdAt: -1 });

module.exports = mongoose.model("ProcurementCosting", procurementCostingSchema);
