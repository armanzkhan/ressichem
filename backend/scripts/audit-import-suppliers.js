require("dotenv").config();
const mongoose = require("mongoose");
const { connect } = require("../config/_db");
const ProcurementSupplier = require("../models/ProcurementSupplier");

function isLocalCountry(country) {
  const c = (country || "").toLowerCase().trim();
  return !c || c.includes("pakistan") || c === "pk";
}

async function main() {
  await connect();
  const all = await ProcurementSupplier.find({ company_id: "RESSICHEM", isActive: true })
    .select("supplierCode name country createdAt")
    .sort({ supplierCode: 1 })
    .lean();

  const importRows = all.filter((s) => !isLocalCountry(s.country));
  const fromBulk = importRows.filter((s) => /^SUP-2026-002/.test(s.supplierCode));
  const preBulk = importRows.filter((s) => !/^SUP-2026-002/.test(s.supplierCode));

  console.log("Import suppliers total:", importRows.length);
  console.log("  From bulk import (SUP-2026-002xx):", fromBulk.length);
  console.log("  Pre-existing import:", preBulk.length);
  preBulk.forEach((r) => console.log("   ", r.supplierCode, r.name));

  const byName = {};
  importRows.forEach((s) => {
    const k = (s.name || "").trim().toUpperCase();
    if (!byName[k]) byName[k] = [];
    byName[k].push(s.supplierCode);
  });
  const dupes = Object.entries(byName).filter(([, codes]) => codes.length > 1);
  console.log("\nDuplicate names in DB:", dupes.length);
  dupes.forEach(([name, codes]) => console.log(" ", name, "->", codes.join(", ")));
  console.log("\nUnique import supplier names:", Object.keys(byName).length);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
