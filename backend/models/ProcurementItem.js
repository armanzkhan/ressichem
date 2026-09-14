const mongoose = require("mongoose");

const procurementItemSchema = new mongoose.Schema(
  {
    company_id: { type: String, required: true, index: true },
    itemCode: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    hsCode: { type: String, default: "" },
    unit: { type: String, default: "EA" },
    category: { type: String, default: "General" },
    /** local = domestic catalog; import = foreign purchase catalog */
    tradeScope: { type: String, enum: ["local", "import"], default: "import" },
    preferredSupplier: { type: mongoose.Schema.Types.ObjectId, ref: "ProcurementSupplier" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

procurementItemSchema.index({ company_id: 1, itemCode: 1 }, { unique: true });

procurementItemSchema.pre("validate", async function assignItemCode() {
  if (!this.isNew || this.itemCode) return;
  const { nextItemCode } = require("../utils/procurementHelpers");
  const company_id = this.company_id || "RESSICHEM";
  this.itemCode = await nextItemCode(this.constructor, company_id);
});

module.exports = mongoose.model("ProcurementItem", procurementItemSchema);
