// backend/scripts/migrations/seed-qc-dry-mortar-tests.js
// Seeds QCTest definitions for DRY_MORTAR so Hub Plan items can be linked to Tests.
//
// Usage:
//   node backend/scripts/migrations/seed-qc-dry-mortar-tests.js RESSICHEM
// or set COMPANY_ID env var.

require("dotenv").config();

const { connect, disconnect } = require("../../config/_db");
const QCTest = require("../../models/QCTest");

async function upsertTest(company_id, t) {
  const filter = { company_id, code: t.code };
  const update = { ...t, company_id, code: String(t.code).trim().toUpperCase() };
  await QCTest.updateOne(filter, { $set: update, $setOnInsert: { createdBy: null } }, { upsert: true });
}

async function run() {
  const companyId = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    const tests = [
      { code: "DM_SLIP", name: "Slip", unit: "mm", dataType: "number", method: "EN 12004-2:2017 (8.2)" },
      {
        code: "DM_ITAS",
        name: "Initial Tensile Adhesion Strength",
        unit: "N/mm2",
        dataType: "number",
        method: "EN 12004-2:2017 (8.3.3.2)",
      },
      { code: "DM_WATER_RETENTION", name: "Water Retention", unit: "%", dataType: "number", method: "SOP / In-house" },
      { code: "DM_WETTING", name: "Wetting Capability", unit: "%", dataType: "number", method: "EN 1347:2007" },
      { code: "DM_SIEVE", name: "Complete Sieve Analysis", unit: "", dataType: "string", method: "SOP / In-house" },
      { code: "DM_DBD", name: "Dry Bulk Density", unit: "g/l", dataType: "number", method: "SOP / In-house" },

      { code: "DM_FLEX_DRY", name: "Flexural Strength After Dry Storage", unit: "N/mm2", dataType: "number", method: "EN 13888-2:2022" },
      {
        code: "DM_COMP_DRY",
        name: "Compressive Strength After Dry Storage",
        unit: "N/mm2",
        dataType: "number",
        method: "EN 13888-2:2022",
      },
      { code: "DM_SHRINKAGE", name: "Shrinkage", unit: "mm/m", dataType: "number", method: "EN 13888-2:2022" },
      { code: "DM_WABS_30", name: "Water Absorption (30 min)", unit: "", dataType: "number", method: "EN 13888-2:2022" },
      { code: "DM_WABS_240", name: "Water Absorption (240 min)", unit: "", dataType: "number", method: "EN 13888-2:2022" },

      { code: "DM_BULK_FRESH", name: "Bulk Density of Fresh Mortar", unit: "kg/mm3", dataType: "number", method: "EN 1015-6:1999" },
      { code: "DM_FLOW", name: "Spreadability (Flow Value)", unit: "mm", dataType: "number", method: "EN 1015-3:2004" },
      { code: "DM_AIR", name: "Air Content of Fresh Mortar", unit: "%", dataType: "number", method: "EN 1015-7:1999" },
      {
        code: "DM_DBD_HARDENED",
        name: "Dry Bulk Density of Hardened Mortar",
        unit: "g/l",
        dataType: "number",
        method: "EN 1015-10:1999",
      },
      {
        code: "DM_CAP_WATER",
        name: "Water Absorption Coefficient (Capillary Action)",
        unit: "kg/(m2·min0.5)",
        dataType: "number",
        method: "EN 1015-18:2002",
      },
      { code: "DM_FLEX", name: "Flexural Strength", unit: "N/mm2", dataType: "number", method: "EN 1015-11:2019" },
      { code: "DM_COMP", name: "Compressive Strength", unit: "N/mm2", dataType: "number", method: "EN 1015-11:2019" },
      { code: "DM_ADHESIVE", name: "Adhesive Strength", unit: "N/mm2", dataType: "number", method: "EN 1015-12:2000" },
    ].map((t) => ({
      ...t,
      description: "Dry Mortar QC (QC Hub)",
      applicableModules: ["DRY_MORTAR"],
      isActive: true,
    }));

    for (const t of tests) {
      await upsertTest(companyId, t);
    }

    console.log(`✅ Seeded/updated ${tests.length} DRY_MORTAR tests for ${companyId}`);
  } catch (err) {
    console.error("❌ Seed DRY_MORTAR tests failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();


