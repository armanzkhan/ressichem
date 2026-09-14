require("dotenv").config();
const { connect, disconnect } = require("../config/_db");
const { countLocalImportStats } = require("../utils/procurementDashboardStats");

async function run() {
  await connect();
  const company_id = process.argv[2] || "RESSICHEM";
  const stats = await countLocalImportStats(company_id);

  const expected = {
    local: {
      suppliers: stats.local.suppliers,
      items: stats.local.items,
      prAwaitingApproval: stats.local.requisitions.pending,
      prDrafts: stats.local.requisitions.draft,
      poIssued: stats.local.purchaseOrders.issued,
      poDrafts: stats.local.purchaseOrders.draft,
    },
    import: {
      suppliers: stats.import.suppliers,
      items: stats.import.items,
      openImportPfi: stats.import.pfiOpen,
      prAwaitingApproval: stats.import.requisitions.pending,
      prDrafts: stats.import.requisitions.draft,
      poIssued: stats.import.purchaseOrders.issued,
      poDrafts: stats.import.purchaseOrders.draft,
    },
    export: {
      exportPfiOpen: stats.export.pfiIssuedOpen,
      receivedPfiOpen: stats.export.pfiReceivedOpen,
      documents: stats.export.documents,
      shipments: stats.export.shipments,
    },
  };

  console.log(JSON.stringify({ company_id, expected, raw: stats }, null, 2));
  await disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
