// Manual one-off QC Hub Power BI export (CSV + XLSX + JSON to disk).
//
// Usage:
//   node backend/scripts/run-qc-hub-export.js RESSICHEM
// or:
//   npm run qc:export:hub

require("dotenv").config();
const mongoose = require("mongoose");
const { runScheduledExport } = require("../services/qcHubExportScheduler");

const company_id = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
const mongoUri = process.env.CONNECTION_STRING || process.env.MONGODB_URI;

async function main() {
  if (!mongoUri) {
    console.error("❌ CONNECTION_STRING / MONGODB_URI not set");
    process.exit(1);
  }
  process.env.QC_HUB_EXPORT_COMPANY_ID = company_id;
  await mongoose.connect(mongoUri);
  try {
    const result = await runScheduledExport();
    console.log("Files written:");
    console.log("  CSV: ", result.csvPath);
    console.log("  XLSX:", result.xlsxPath);
    console.log("  JSON:", result.jsonPath);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Export failed:", err.message);
  process.exit(1);
});
