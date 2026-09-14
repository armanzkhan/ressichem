// backend/scripts/migrations/seed-qc-hub-dry-mortar-plan.js
// Seeds QC Hub Dry Mortar plan items as per provided document (minimal structured form).
//
// Usage:
//   node backend/scripts/migrations/seed-qc-hub-dry-mortar-plan.js RESSICHEM
// or set COMPANY_ID env var.

require("dotenv").config();

const { connect, disconnect } = require("../../config/_db");
const QCHubPlanItem = require("../../models/QCHubPlanItem");
const QCTest = require("../../models/QCTest");

async function upsertPlanItem(company_id, item) {
  const filter = {
    company_id,
    planGroup: item.planGroup,
    productType: item.productType,
    testName: item.testName,
    methodRef: item.methodRef || "",
  };
  const update = { ...item, company_id };

  // optional: link to QCTest (seeded via seed-qc-dry-mortar-tests.js)
  if (!update.test) {
    const codeByName = {
      Slip: "DM_SLIP",
      "Initial Tensile Adhesion Strength": "DM_ITAS",
      "Water Retention": "DM_WATER_RETENTION",
      "Wetting Capability": "DM_WETTING",
      "Complete Sieve Analysis": "DM_SIEVE",
      "Dry Bulk Density": "DM_DBD",
      "Flexural Strength After Dry Storage": "DM_FLEX_DRY",
      "Compressive Strength After Dry Storage": "DM_COMP_DRY",
      Shrinkage: "DM_SHRINKAGE",
      "Water Absorption (30 min)": "DM_WABS_30",
      "Water Absorption (240 min)": "DM_WABS_240",
      "Bulk Density of Fresh Mortar": "DM_BULK_FRESH",
      "Spreadability (Flow Value)": "DM_FLOW",
      "Air Content of Fresh Mortar": "DM_AIR",
      "Dry Bulk Density of Hardened Mortar": "DM_DBD_HARDENED",
      "Water Absorption Coefficient (Capillary Action)": "DM_CAP_WATER",
      "Flexural Strength": "DM_FLEX",
      "Compressive Strength": "DM_COMP",
      "Adhesive Strength": "DM_ADHESIVE",
    };
    const code = codeByName[item.testName];
    if (code) {
      const t = await QCTest.findOne({ company_id, code });
      if (t) update.test = t._id;
    }
  }
  await QCHubPlanItem.updateOne(filter, { $set: update }, { upsert: true });
}

async function run() {
  const companyId = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    const planGroup = "DRY_MORTAR";
    const daily = "Daily 1 batch of each product";

    const items = [
      // Tile Adhesive (EN 12004)
      {
        planGroup,
        productType: "TILE_ADHESIVE",
        testName: "Slip",
        frequency: daily,
        methodRef: "EN 12004-2:2017 (8.2)",
        requirement: "≤ 0.5 mm",
        unit: "mm",
        isActive: true,
      },
      {
        planGroup,
        productType: "TILE_ADHESIVE",
        testName: "Initial Tensile Adhesion Strength",
        frequency: daily,
        methodRef: "EN 12004-2:2017 (8.3.3.2)",
        requirement: "(C1) ≥ 0.5 N/mm2 ; (C2) ≥ 1.0 N/mm2",
        unit: "N/mm2",
        isActive: true,
      },
      {
        planGroup,
        productType: "TILE_ADHESIVE",
        testName: "Water Retention",
        frequency: daily,
        methodRef: "In-house / SOP",
        requirement: "—",
        unit: "%",
        isActive: true,
      },
      {
        planGroup,
        productType: "TILE_ADHESIVE",
        testName: "Wetting Capability",
        frequency: daily,
        methodRef: "EN 1347:2007",
        requirement: "≥ 99% (In House)",
        unit: "%",
        isActive: true,
      },
      {
        planGroup,
        productType: "TILE_ADHESIVE",
        testName: "Complete Sieve Analysis",
        frequency: daily,
        methodRef: "In-house / SOP",
        requirement: "—",
        isActive: true,
      },
      {
        planGroup,
        productType: "TILE_ADHESIVE",
        testName: "Dry Bulk Density",
        frequency: daily,
        methodRef: "In-house / SOP",
        requirement: "—",
        unit: "g/l",
        isActive: true,
      },

      // Grouts (EN 13888)
      {
        planGroup,
        productType: "GROUTS",
        testName: "Flexural Strength After Dry Storage",
        frequency: daily,
        methodRef: "EN 13888-2:2022",
        requirement: "≥ 2.5 N/mm2",
        unit: "N/mm2",
        isActive: true,
      },
      {
        planGroup,
        productType: "GROUTS",
        testName: "Compressive Strength After Dry Storage",
        frequency: daily,
        methodRef: "EN 13888-2:2022",
        requirement: "≥ 15 N/mm2",
        unit: "N/mm2",
        isActive: true,
      },
      {
        planGroup,
        productType: "GROUTS",
        testName: "Shrinkage",
        frequency: daily,
        methodRef: "EN 13888-2:2022",
        requirement: "≤ 3 mm/m",
        unit: "mm/m",
        isActive: true,
      },
      {
        planGroup,
        productType: "GROUTS",
        testName: "Water Absorption (30 min)",
        frequency: daily,
        methodRef: "EN 13888-2:2022",
        requirement: "≤ 5",
        isActive: true,
      },
      {
        planGroup,
        productType: "GROUTS",
        testName: "Water Absorption (240 min)",
        frequency: daily,
        methodRef: "EN 13888-2:2022",
        requirement: "≤ 10",
        isActive: true,
      },
      {
        planGroup,
        productType: "GROUTS",
        testName: "Complete Sieve Analysis",
        frequency: daily,
        methodRef: "In-house / SOP",
        requirement: "—",
        isActive: true,
      },

      // Plaster / Render / Other Mortar (EN 1015 / EN 998-1)
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Bulk Density of Fresh Mortar",
        frequency: daily,
        methodRef: "EN 1015-6:1999",
        requirement: "Table 1 (EN 1015-2:1998) / In-house spec",
        unit: "kg/mm3",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Spreadability (Flow Value)",
        frequency: daily,
        methodRef: "EN 1015-3:2004",
        requirement: "Table 1 (EN 1015-2:1998) / In-house spec",
        unit: "mm",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Air Content of Fresh Mortar",
        frequency: daily,
        methodRef: "EN 1015-7:1999",
        requirement: "Table 1 (EN 1015-2:1998) / In-house spec",
        unit: "%",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Dry Bulk Density of Hardened Mortar",
        frequency: daily,
        methodRef: "EN 1015-10:1999",
        requirement: "—",
        unit: "g/l",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Water Absorption Coefficient (Capillary Action)",
        frequency: daily,
        methodRef: "EN 1015-18:2002",
        requirement: "W0: Not specified; W1: ≤ 0.4; W2: ≤ 0.2 (kg/(m2·min0.5))",
        unit: "kg/(m2·min0.5)",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Flexural Strength",
        frequency: daily,
        methodRef: "EN 1015-11:2019",
        requirement: "—",
        unit: "N/mm2",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Compressive Strength",
        frequency: daily,
        methodRef: "EN 1015-11:2019",
        requirement: "CS I: 0.4–2.5; CS II: 1.5–5.0; CS III: 3.5–7.5; CS IV: ≥ 6 (N/mm2)",
        unit: "N/mm2",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Complete Sieve Analysis",
        frequency: daily,
        methodRef: "In-house / SOP",
        requirement: "—",
        isActive: true,
      },
      {
        planGroup,
        productType: "PLASTER_RENDER_OTHER",
        testName: "Adhesive Strength",
        frequency: daily,
        methodRef: "EN 1015-12:2000",
        requirement: "—",
        unit: "N/mm2",
        isActive: true,
      },
    ];

    for (const item of items) {
      await upsertPlanItem(companyId, item);
    }

    console.log(`✅ Seeded/updated ${items.length} QC Hub plan items for ${companyId}`);
  } catch (err) {
    console.error("❌ Seed QC Hub plan failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();


