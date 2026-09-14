const mongoose = require("mongoose");

const partySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "" },
    phone: { type: String, default: "" },
    taxId: { type: String, default: "" },
    strn: { type: String, default: "" },
  },
  { _id: false }
);

const bankingSchema = new mongoose.Schema(
  {
    bankName: { type: String, default: "" },
    accountNo: { type: String, default: "" },
    swift: { type: String, default: "" },
    branch: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { _id: false }
);

const lineItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementItem" },
    itemCode: { type: String, default: "" },
    itemName: { type: String, default: "" },
    description: { type: String, default: "" },
    size: { type: String, default: "" },
    material: { type: String, default: "" },
    hsCode: { type: String, default: "" },
    packing: { type: String, default: "" },
    shipmentNote: { type: String, default: "" },
    remarks: { type: String, default: "" },
    unit: { type: String, default: "EA" },
    priceUom: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    receivedQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    lineTotal: { type: Number, default: 0 },
    /** Department owning this line (drives multi-approver PR routing). */
    department: { type: String, default: "" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" },
    supplierName: { type: String, default: "" },
  },
  { _id: true }
);

/** Shared commercial fields for PFI / PO */
const commercialDocumentFields = {
  documentDate: { type: Date },
  quoteNumber: { type: String, default: "" },
  customerNumber: { type: String, default: "" },
  referencePoNumber: { type: String, default: "" },
  referencePoDate: { type: Date },
  orderedBy: { type: String, default: "" },
  bookedBy: { type: String, default: "" },
  paymentTerms: { type: String, default: "" },
  incoTerm: { type: String, default: "" },
  portOfLoading: { type: String, default: "" },
  placeOfDelivery: { type: String, default: "" },
  loadingPort: { type: String, default: "" },
  shipment: { type: String, default: "" },
  saleTax: { type: String, default: "" },
  validFrom: { type: Date },
  validUntil: { type: Date },
  billTo: { type: partySchema, default: () => ({}) },
  shipTo: { type: partySchema, default: () => ({}) },
  supplierParty: { type: partySchema, default: () => ({}) },
  supplierBanking: { type: bankingSchema, default: () => ({}) },
  amountInWords: { type: String, default: "" },
  termsAndConditions: { type: String, default: "" },
  prNumber: { type: String, default: "" },
  /** local = Pakistan supplier / domestic; foreign = import with HS code & incoterms */
  purchaseType: { type: String, enum: ["local", "foreign"], default: "foreign" },
};

module.exports = {
  partySchema,
  bankingSchema,
  lineItemSchema,
  commercialDocumentFields,
};
