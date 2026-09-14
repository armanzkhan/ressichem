require("dotenv").config();
const { connect, disconnect } = require("../config/_db");
const ProcurementSupplier = require("../models/ProcurementSupplier");
const ProcurementItem = require("../models/ProcurementItem");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");

async function run() {
  await connect();
  const company_id = process.argv[2] || "RESSICHEM";
  const base = { company_id, isActive: true };
  const localSupplierFilter = {
    $or: [{ country: { $regex: /pakistan/i } }, { country: { $regex: /^pk$/i } }],
  };

  const [localSuppliers, allSuppliers, localItems, allItems, localPR, allPR, localPO, allPO] =
    await Promise.all([
      ProcurementSupplier.countDocuments({ ...base, ...localSupplierFilter }),
      ProcurementSupplier.countDocuments(base),
      ProcurementItem.countDocuments({ ...base, tradeScope: "local" }),
      ProcurementItem.countDocuments(base),
      PurchaseRequisition.countDocuments({ company_id, purchaseType: "local" }),
      PurchaseRequisition.countDocuments({ company_id }),
      PurchaseOrder.countDocuments({ company_id, purchaseType: "local" }),
      PurchaseOrder.countDocuments({ company_id }),
    ]);

  const sampleSuppliers = await ProcurementSupplier.find(base).select("name country tradeScope").limit(8).lean();
  const sampleItems = await ProcurementItem.find(base).select("name tradeScope").limit(8).lean();

  console.log(
    JSON.stringify(
      {
        company_id,
        localSuppliers,
        allSuppliers,
        localItems,
        allItems,
        localPR,
        allPR,
        localPO,
        allPO,
        sampleSuppliers,
        sampleItems,
      },
      null,
      2
    )
  );
  await disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
