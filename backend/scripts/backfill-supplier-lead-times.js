/**
 * Backfill leadTimeDays from a suppliers import spreadsheet.
 *
 * Usage:
 *   node scripts/backfill-supplier-lead-times.js
 *   node scripts/backfill-supplier-lead-times.js "C:/Users/Arman/Downloads/procurement-suppliers-template (1).xlsx"
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const { connect } = require("../config/_db");
const ProcurementSupplier = require("../models/ProcurementSupplier");
const { parseLeadTimeDays } = require("../utils/procurementSpreadsheet");

const DEFAULT_FILE = "C:/Users/Arman/Downloads/procurement-suppliers-template (1).xlsx";

async function main() {
  const filePath = path.resolve(process.argv[2] || DEFAULT_FILE);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    console.error("");
    console.error("Pass the full path to your .xlsx file, for example:");
    console.error('  node scripts/backfill-supplier-lead-times.js "C:/Users/Arman/Downloads/procurement-suppliers-template (1).xlsx"');
    process.exit(1);
  }

  await connect();

  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  let updated = 0;

  for (const row of rows) {
    const name = String(row.name || "").trim();
    const days = parseLeadTimeDays(row.lead_time_days ?? row.lead_time);
    if (!name || !days) continue;

    const res = await ProcurementSupplier.updateMany(
      { company_id: "RESSICHEM", name, leadTimeDays: 0 },
      { $set: { leadTimeDays: days } }
    );
    updated += res.modifiedCount || 0;
  }

  console.log(`Backfilled leadTimeDays for ${updated} supplier(s) from ${filePath}`);
  const sample = await ProcurementSupplier.find({
    supplierCode: { $in: ["SUP-2026-00203", "SUP-2026-00192", "SUP-2026-00215"] },
  })
    .select("supplierCode name leadTimeDays")
    .lean();
  console.log("Sample:", sample);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
