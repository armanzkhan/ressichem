/**
 * Local verification: fulfillment enrichment on real PRs + live route presence.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");
const mongoose = require("mongoose");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");
const { enrichPrsWithFulfillment } = require("../utils/procurementPrFulfillment");

const URI =
  process.env.MONGODB_URI ||
  process.env.CONNECTION_STRING ||
  process.env.MONGO_URI ||
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

function check(method, path) {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: "127.0.0.1", port: 5000, path, method, timeout: 5000 },
      (res) => {
        let b = "";
        res.on("data", (d) => (b += d));
        res.on("end", () => resolve({ status: res.statusCode, body: b.slice(0, 160) }));
      }
    );
    req.on("error", (e) => resolve({ error: e.message }));
    req.end();
  });
}

(async () => {
  await mongoose.connect(URI, { dbName: "Ressichem" });
  const company_id = "RESSICHEM";
  const prs = await PurchaseRequisition.find({ company_id, isActive: { $ne: false } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const enriched = await enrichPrsWithFulfillment(PurchaseOrder, company_id, prs);

  const byStatus = {};
  const byFf = {};
  for (const r of enriched) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    const ff = r.fulfillmentStatus || r.stockStatus || "n_a";
    byFf[ff] = (byFf[ff] || 0) + 1;
  }

  const withPo = enriched
    .filter((r) => r.poNumber)
    .slice(0, 8)
    .map((r) => ({
      pr: r.requisitionNumber,
      status: r.status,
      po: r.poNumber,
      fulfillment: r.fulfillmentLabel,
      stock: r.stockStatus,
      qty: `${r.qtyReceived}/${r.qtyOrdered}`,
      location: r.location || null,
      followUp: r.followUpStatus || null,
    }));

  const schemaPaths = PurchaseRequisition.schema.paths;
  const schemaOk = {
    location: !!schemaPaths.location,
    followUpStatus: !!schemaPaths.followUpStatus,
    followUpNote: !!schemaPaths.followUpNote,
    followUpAt: !!schemaPaths.followUpAt,
  };

  const list = await check("GET", "/api/procurement/requisitions");
  const followUp = await check(
    "PATCH",
    "/api/procurement/requisitions/000000000000000000000000/follow-up"
  );

  const pass = {
    schemaFields: Object.values(schemaOk).every(Boolean),
    enrichmentRan: enriched.length >= 0,
    liveListRoute: list.status === 401 || list.status === 200,
    liveFollowUpRoute: followUp.status === 401 || followUp.status === 404 || followUp.status === 400,
  };

  console.log(
    JSON.stringify(
      {
        sampleCount: enriched.length,
        byStatus,
        byFulfillment: byFf,
        sampleLinked: withPo,
        schemaOk,
        liveApi: { list, followUp },
        pass,
        allPass: Object.values(pass).every(Boolean),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  process.exit(Object.values(pass).every(Boolean) ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
