const mongoose = require("mongoose");
const { bankingSchema } = require("./procurementSchemas");

const procurementSupplierSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    supplierCode: { type: String, required: true },
    name: { type: String, required: true },
    /** Registered / legal company name (may differ from short supplier name) */
    companyName: { type: String, default: "" },
    contactName: { type: String, default: "" },
    email: { type: String, default: "" },
    mobile: { type: String, default: "" },
    phone: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    country: { type: String, default: "" },
    countryCode: { type: String, default: "" },
    phoneDialCode: { type: String, default: "" },
    defaultCurrency: { type: String, default: "USD" },
    paymentTerms: { type: String, default: "" },
    leadTimeDays: { type: Number, default: 0 },
    incoTerm: { type: String, default: "" },
    hsCode: { type: String, default: "" },
    /** NTN (National Tax Number) */
    taxId: { type: String, default: "" },
    /** Sales tax registration number */
    strn: { type: String, default: "" },
    /** Income tax exemption certificate / status */
    incomeTaxExemption: { type: String, default: "" },
    /** SRB (Sindh Revenue Board) rate, e.g. 3% or Exempt */
    srb: { type: String, default: "" },
    banking: { type: bankingSchema, default: () => ({}) },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementSupplierSchema.index({ company_id: 1, supplierCode: 1 }, { unique: true });
procurementSupplierSchema.index({ company_id: 1, name: 1 });

module.exports = mongoose.model("ProcurementSupplier", procurementSupplierSchema);
