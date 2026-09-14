/**
 * Deactivate duplicate active suppliers (same normalized name).
 * Keeps the record with the earliest supplierCode; deactivates the rest.
 *
 * Usage: node scripts/dedupe-procurement-suppliers.js [company_id]
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { connect } = require("../config/_db");
const ProcurementSupplier = require("../models/ProcurementSupplier");
const { normalizeSupplierName } = require("../utils/procurementHelpers");

async function main() {
  const company_id = process.argv[2] || "RESSICHEM";
  await connect();

  const rows = await ProcurementSupplier.find({ company_id, isActive: true })
    .select("_id name supplierCode")
    .sort({ supplierCode: 1 })
    .lean();

  const groups = new Map();
  for (const row of rows) {
    const key = normalizeSupplierName(row.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let deactivated = 0;
  for (const [key, list] of groups) {
    if (list.length <= 1) continue;
    const [, ...dupes] = list;
    for (const d of dupes) {
      await ProcurementSupplier.updateOne(
        { _id: d._id },
        { isActive: false, status: "inactive" }
      );
      console.log(`Deactivated ${d.supplierCode} (duplicate of ${list[0].supplierCode}) — ${key}`);
      deactivated += 1;
    }
  }

  const remaining = await ProcurementSupplier.countDocuments({ company_id, isActive: true });
  console.log(`Done. Deactivated ${deactivated} duplicate(s). Active suppliers now: ${remaining}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
