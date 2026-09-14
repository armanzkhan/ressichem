// Seeds demo Dry Mortar QC Hub data for dashboards, trends, QA & reporting.
//
// Usage:
//   node backend/scripts/migrations/seed-qc-hub-dry-mortar-demo.js RESSICHEM
// or:
//   npm run qc:seed:drymortar:demo

require("dotenv").config();

const { connect, disconnect } = require("../../config/_db");
const QCHubBatchRecord = require("../../models/QCHubBatchRecord");
const QCHubFormSubmission = require("../../models/QCHubFormSubmission");
const NCR = require("../../models/NCR");
const CalibrationRecord = require("../../models/CalibrationRecord");
const InternalAudit = require("../../models/InternalAudit");
const RDExperiment = require("../../models/RDExperiment");
const { getAllModules } = require("../../utils/qcHubDryMortarSrs");

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function sampleParams(moduleKey, i) {
  const drift = (i - 3) * 0.02;
  const maps = {
    TILE_ADHESIVE: {
      appearance: "Grey powder, no lumps",
      bulkDensity: 1.45 + drift,
      waterDemand: 24 + i * 0.3,
      openTime: 20,
      slip: 0.3 + drift * 0.1,
      tensileAdhesionInitial: 1.2 + drift,
      tensileAdhesionWaterImmersion: 1.0 + drift,
      tensileAdhesionHeatAging: 0.95 + drift,
      tensileAdhesionFreezeThaw: 0.9 + drift,
      potLife: 45,
      waterRetention: 82 + i * 0.5,
    },
    TILE_GROUT: {
      appearance: "White powder",
      waterDemand: 22 + i,
      flow: 165,
      flexuralStrength: 4.5 + drift,
      compressiveStrength: 18 + i * 0.4,
      abrasionResistance: 0.8,
      waterAbsorption: 3.2,
      shrinkage: 1.1,
      colourConsistency: "Pass",
    },
    PREMIX_PLASTER: {
      appearance: "Off-white",
      bulkDensity: 1.35 + drift,
      waterDemand: 18 + i * 0.2,
      workability: "Good",
      settingTime: 120,
      dryDensity: 1450,
      compressiveStrength: 6 + i * 0.15,
      adhesion: 0.6,
      crackObservation: "None",
      spreadability: 165,
    },
    SKIM_COAT: {
      appearance: "Fine white",
      fineness: 45,
      waterDemand: 26,
      workability: "Smooth",
      potLife: 40,
      spreadability: 170,
      adhesion: 0.55,
      crackResistance: "Pass",
    },
    REPAIR_MORTAR: {
      appearance: "Grey",
      flow: 140,
      compressiveStrength: 25 + i * 0.3,
      flexuralStrength: 5.2,
      pullOffStrength: 1.8,
      bondStrength: 1.5,
      shrinkage: 0.9,
    },
    WATERPROOFING: {
      potLife: 35,
      waterPermeability: "Pass",
      hydrostaticPressureResistance: "1.5 bar",
      crackBridgingAbility: "2 mm",
      adhesionStrength: 1.1,
      pullOffStrength: 1.0,
      dryFilmThickness: 1200,
      waterAbsorption: 2.5,
    },
    CRACK_FILLER: {
      appearance: "Grey paste",
      consistency: "Thixotropic",
      workability: "Good",
      dryingTime: 180,
      adhesion: 0.7,
      shrinkage: 0.5,
      crackBridgingAbility: "3 mm",
    },
    SELF_LEVEL_SEALERS: {
      appearance: "Clear liquid",
      viscosity: 850 + i * 20,
      dryingTime: 90,
      adhesion: 1.2,
      waterRepellency: "Pass",
      chemicalResistance: "Good",
      weatheringUvResistance: "Pass",
    },
  };
  return maps[moduleKey] || { appearance: "OK" };
}

async function upsertBatch(company_id, doc) {
  return QCHubBatchRecord.findOneAndUpdate(
    { company_id, module: doc.module, batchNo: doc.batchNo },
    { $set: { ...doc, company_id, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function run() {
  const company_id = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    const modules = getAllModules();
    let batchCount = 0;

    for (const mod of modules) {
      for (let i = 0; i < 6; i++) {
        const batchNo = `DM-${mod.key.slice(0, 3)}-${String(i + 1).padStart(3, "0")}`;
        await upsertBatch(company_id, {
          planGroup: "DRY_MORTAR",
          module: mod.key,
          category: mod.categories[0],
          productName: `${mod.label.replace(" QC", "")} Demo`,
          grade: mod.categories[0],
          batchNo,
          testDate: daysAgo(30 - i * 5),
          parameters: sampleParams(mod.key, i),
          remarks: i === 5 ? "Review — slight deviation" : "",
          status: i < 5 ? "approved" : "submitted",
          approvedAt: i < 5 ? daysAgo(29 - i * 5) : undefined,
        });
        batchCount++;
      }
    }

    // Sample raw data form
    await QCHubFormSubmission.findOneAndUpdate(
      { company_id, batchNo: "DM-TIL-001", formType: "WATER_RETENTION" },
      {
        $set: {
          company_id,
          planGroup: "DRY_MORTAR",
          productType: "TILE_ADHESIVE",
          productName: "Tile Adhesive Demo",
          batchNo: "DM-TIL-001",
          formType: "WATER_RETENTION",
          testDate: daysAgo(10),
          status: "approved",
          payload: { rows: [{ sr: "1", waterRetentionPct: "83.5" }] },
          isActive: true,
        },
      },
      { upsert: true }
    );

    const year = new Date().getFullYear();

    await NCR.findOneAndUpdate(
      { company_id, ncrNo: `NCR-${year}-DEMO1` },
      {
        $set: {
          company_id,
          ncrNo: `NCR-${year}-DEMO1`,
          title: "Water demand above target — Tile Adhesive batch DM-TIL-006",
          description: "Water demand measured 26.5% vs spec 24–26%.",
          detectedDate: daysAgo(3),
          severity: "MINOR",
          sourceType: "QC_BATCH",
          relatedBatchNo: "DM-TIL-006",
          relatedProductName: "Tile Adhesive Demo",
          relatedModule: "TILE_ADHESIVE",
          status: "OPEN",
          isActive: true,
        },
      },
      { upsert: true }
    );

    await CalibrationRecord.findOneAndUpdate(
      { company_id, recordNo: `CAL-${year}-DEMO1` },
      {
        $set: {
          company_id,
          recordNo: `CAL-${year}-DEMO1`,
          equipmentName: "Compression Testing Machine",
          equipmentId: "CTM-01",
          location: "QC Lab",
          calibrationDate: daysAgo(60),
          nextDueDate: daysAgo(-25),
          calibratedBy: "External Lab",
          status: "DUE_SOON",
          isActive: true,
        },
      },
      { upsert: true }
    );

    await InternalAudit.findOneAndUpdate(
      { company_id, auditNo: `AUD-${year}-DEMO1` },
      {
        $set: {
          company_id,
          auditNo: `AUD-${year}-DEMO1`,
          title: "Q1 Internal QC Process Audit",
          auditType: "INTERNAL",
          auditDate: daysAgo(15),
          auditor: "Quality Manager",
          scope: "Dry Mortar batch testing & documentation",
          findings: [
            {
              findingNo: "F-01",
              description: "Two batch records missing attachment of testing summary sheet",
              severity: "MINOR",
              status: "OPEN",
            },
          ],
          status: "COMPLETED",
          isActive: true,
        },
      },
      { upsert: true }
    );

    await RDExperiment.findOneAndUpdate(
      { company_id, experimentCode: `R&D-${year}-DEMO` },
      {
        $set: {
          company_id,
          experimentCode: `R&D-${year}-DEMO`,
          experimentName: "Tile Adhesive cost reduction trial",
          objective: "Reduce RDP dosage while maintaining adhesion (T0/T1/T2 comparison)",
          productType: "TILE_ADHESIVE",
          targetProduct: "C2 Tile Adhesive",
          trials: [],
          overallResults: "T0 baseline approved; T1 -5% RDP shows similar adhesion; T2 under test",
          status: "IN_PROGRESS",
          isActive: true,
        },
      },
      { upsert: true }
    );

    console.log(`✅ Seeded QC Hub Dry Mortar demo data for ${company_id}`);
    console.log(`   • ${batchCount} batch records across ${modules.length} modules`);
    console.log(`   • 1 form submission, 1 NCR, 1 calibration, 1 audit, 1 R&D experiment`);
    console.log(`   Tip: Open /qc/hub and /qc/hub/predictive-analytics to see trends & alerts.`);
  } finally {
    await disconnect();
  }
}

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
