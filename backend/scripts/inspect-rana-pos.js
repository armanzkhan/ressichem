require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.CONNECTION_STRING || process.env.MONGO_URI, {
    dbName: "Ressichem",
  });
  const nums = ["PO-2026-00747", "PO-2026-00740", "PO-2026-00739", "PO-2026-00738"];
  const rows = await PurchaseOrder.find({ poNumber: { $in: nums } })
    .select("poNumber total subtotal taxAmount currency items status plantScope requisition")
    .lean();
  console.log(
    JSON.stringify(
      rows.map((r) => ({
        po: r.poNumber,
        total: r.total,
        subtotal: r.subtotal,
        tax: r.taxAmount,
        status: r.status,
        plantScope: r.plantScope,
        itemCount: (r.items || []).length,
        lines: (r.items || []).slice(0, 5).map((i) => ({
          name: i.itemName,
          qty: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      })),
      null,
      2
    )
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
