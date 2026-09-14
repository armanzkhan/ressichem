// backend/scripts/migrations/seed-qc-site-test-data.js
// Seeds test data for QC Site Area modules (SRS 3.x)
//
// Usage:
//   node backend/scripts/migrations/seed-qc-site-test-data.js RESSICHEM
// or set COMPANY_ID env var.

require("dotenv").config();

const { connect, disconnect } = require("../../config/_db");
const ResinQC = require("../../models/ResinQC");
const HardenerQC = require("../../models/HardenerQC");
const LMSQC = require("../../models/LMSQC");
const PackagingMaterialQC = require("../../models/PackagingMaterialQC");
const QABottleFilling = require("../../models/QABottleFilling");
const RDTrialBatch = require("../../models/RDTrialBatch");
const RawMaterial = require("../../models/RawMaterial");
const RawMaterialBatch = require("../../models/RawMaterialBatch");
const QCDocumentIndex = require("../../models/QCDocumentIndex");
const QCTest = require("../../models/QCTest");
const QCStandardCriteria = require("../../models/QCStandardCriteria");
const QCResult = require("../../models/QCResult");

function dateFromYMD(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

async function upsertBy(model, filter, data) {
  return model.findOneAndUpdate(filter, { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function getOrCreateRawMaterial(company_id, material) {
  const existing = await RawMaterial.findOne({ company_id, materialCode: material.materialCode });
  if (existing) {
    await RawMaterial.updateOne({ _id: existing._id }, { $set: { ...material, company_id } });
    return RawMaterial.findById(existing._id);
  }
  return RawMaterial.create({ ...material, company_id });
}

function buildHourlyTotals(hourlyRecords) {
  const totalBatches = hourlyRecords.length;
  const totalWeight = hourlyRecords.reduce((sum, record) => sum + (record.weight || 0), 0);
  return { totalBatches, totalWeight };
}

async function run() {
  const company_id = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    // QCTest + Standard Criteria (for predictive analytics and reporting)
    const tests = [
      {
        code: "EEW",
        name: "Epoxy Equivalent Weight (EEW)",
        unit: "g/eq",
        applicableModules: ["RESIN"],
      },
      {
        code: "VISCOSITY_25C",
        name: "Viscosity at 25C",
        unit: "cP",
        applicableModules: ["RESIN", "HARDENER", "LMS_RESIN"],
      },
      {
        code: "GEL_TIME",
        name: "Gel Time",
        unit: "min",
        applicableModules: ["RESIN", "HARDENER", "LMS_RESIN"],
      },
      {
        code: "AMINE_VALUE",
        name: "Amine Value",
        unit: "mg KOH/g",
        applicableModules: ["HARDENER"],
      },
    ];

    const testMap = {};
    for (const test of tests) {
      const t = await upsertBy(QCTest, { company_id, code: test.code }, { ...test, company_id });
      testMap[test.code] = t;
    }

    const criteriaEffectiveFrom = dateFromYMD("2025-01-01");
    const criteria = [
      {
        module: "RESIN",
        productCategory: "Epoxy Resin",
        productName: "Epoxy Resin R-101",
        grade: "A",
        test: testMap.EEW._id,
        min: 180,
        max: 200,
        target: 190,
        unit: "g/eq",
      },
      {
        module: "RESIN",
        productCategory: "Epoxy Resin",
        productName: "Epoxy Resin R-101",
        grade: "A",
        test: testMap.VISCOSITY_25C._id,
        min: 10000,
        max: 15000,
        target: 12000,
        unit: "cP",
      },
      {
        module: "HARDENER",
        productCategory: "Epoxy Hardener",
        productName: "Hardener H-220",
        grade: "B",
        test: testMap.AMINE_VALUE._id,
        min: 380,
        max: 480,
        target: 430,
        unit: "mg KOH/g",
      },
    ];

    for (const c of criteria) {
      await upsertBy(
        QCStandardCriteria,
        {
          company_id,
          system: "QC_SITE_AREA",
          module: c.module,
          productCategory: c.productCategory,
          productName: c.productName,
          grade: c.grade,
          test: c.test,
          effectiveFrom: criteriaEffectiveFrom,
        },
        {
          ...c,
          company_id,
          system: "QC_SITE_AREA",
          effectiveFrom: criteriaEffectiveFrom,
        }
      );
    }

    // Resin QC (SRS 3.1.1)
    const resinRecords = [
      {
        batchNo: "R-TEST-001",
        productName: "Epoxy Resin R-101",
        grade: "A",
        testDate: dateFromYMD("2025-01-20"),
        color: "Clear",
        transparency: "Transparent",
        eew: 190,
        gelTime: 35,
        viscosity: 12000,
        mixViscosity: 9500,
        exothermicTemperature: 150,
        hycl: 120,
        solidContent: 99.2,
        remarks: "Stable batch",
        status: "approved",
        submittedAt: dateFromYMD("2025-01-21"),
        approvedAt: dateFromYMD("2025-01-22"),
      },
      {
        batchNo: "R-TEST-002",
        productName: "Epoxy Resin R-101",
        grade: "A",
        testDate: dateFromYMD("2025-02-05"),
        color: "Light amber",
        transparency: "Semi-transparent",
        eew: 210,
        gelTime: 40,
        viscosity: 14500,
        mixViscosity: 11000,
        exothermicTemperature: 155,
        hycl: 140,
        solidContent: 98.7,
        remarks: "Slightly high EEW",
        status: "approved",
        submittedAt: dateFromYMD("2025-02-06"),
        approvedAt: dateFromYMD("2025-02-07"),
      },
      {
        batchNo: "R-TEST-003",
        productName: "Epoxy Resin R-205",
        grade: "B",
        testDate: dateFromYMD("2025-02-12"),
        color: "Clear",
        transparency: "Transparent",
        eew: 185,
        gelTime: 33,
        viscosity: 11800,
        mixViscosity: 9000,
        exothermicTemperature: 148,
        hycl: 110,
        solidContent: 99.0,
        remarks: "Pending review",
        status: "submitted",
        submittedAt: dateFromYMD("2025-02-13"),
      },
    ];

    const resinDocs = [];
    for (const record of resinRecords) {
      const doc = await upsertBy(
        ResinQC,
        { company_id, batchNo: record.batchNo, testDate: record.testDate },
        { ...record, company_id, isActive: true }
      );
      resinDocs.push(doc);
    }

    // Hardener QC (SRS 3.1.2)
    const hardenerRecords = [
      {
        batchNo: "H-TEST-010",
        productName: "Hardener H-220",
        grade: "B",
        category: "Hardeners",
        testDate: dateFromYMD("2025-01-18"),
        color: "Pale yellow",
        transparency: "Transparent",
        amineValue: 430,
        gelTime: 28,
        viscosity: 6200,
        mixViscosity: 5200,
        exothermicTemperature: 140,
        solidContent: 97.5,
        remarks: "Within spec",
        status: "approved",
        submittedAt: dateFromYMD("2025-01-19"),
        approvedAt: dateFromYMD("2025-01-20"),
      },
      {
        batchNo: "H-TEST-011",
        productName: "Hardener H-220",
        grade: "B",
        category: "Hardeners",
        testDate: dateFromYMD("2025-02-03"),
        color: "Amber",
        transparency: "Clear",
        amineValue: 500,
        gelTime: 30,
        viscosity: 7000,
        mixViscosity: 5600,
        exothermicTemperature: 143,
        solidContent: 97.0,
        remarks: "High amine value",
        status: "approved",
        submittedAt: dateFromYMD("2025-02-04"),
        approvedAt: dateFromYMD("2025-02-05"),
      },
    ];

    const hardenerDocs = [];
    for (const record of hardenerRecords) {
      const doc = await upsertBy(
        HardenerQC,
        { company_id, batchNo: record.batchNo, testDate: record.testDate },
        { ...record, company_id, isActive: true }
      );
      hardenerDocs.push(doc);
    }

    // LMS QC (SRS 3.1.3)
    const lmsRecords = [
      {
        productType: "LMS_EPOXY_RESIN",
        batchNo: "LMS-R-001",
        productName: "LMS Resin XR-1",
        grade: "A",
        testDate: dateFromYMD("2025-01-25"),
        color: "Clear",
        transparency: "Transparent",
        viscosity: 8500,
        gelTime: 32,
        physicalTests: { viscosity: 8500, unit: "cP", color: "Clear" },
        chemicalTests: { eew: 188, unit: "g/eq" },
        testResults: { hardness: "Good", clarity: "High" },
        status: "approved",
        submittedAt: dateFromYMD("2025-01-26"),
        approvedAt: dateFromYMD("2025-01-27"),
      },
      {
        productType: "LMS_EPOXY_FLOORING",
        batchNo: "LMS-F-002",
        productName: "LMS Flooring FX-20",
        grade: "B",
        testDate: dateFromYMD("2025-02-08"),
        color: "Gray",
        transparency: "Opaque",
        viscosity: 9200,
        gelTime: 38,
        physicalTests: { viscosity: 9200, unit: "cP", color: "Gray" },
        chemicalTests: { solids: 98.0, unit: "%" },
        testResults: { abrasion: "Pass", slipResistance: "High" },
        status: "submitted",
        submittedAt: dateFromYMD("2025-02-09"),
      },
    ];

    const lmsDocs = [];
    for (const record of lmsRecords) {
      const doc = await upsertBy(
        LMSQC,
        { company_id, productType: record.productType, batchNo: record.batchNo, testDate: record.testDate },
        { ...record, company_id, isActive: true }
      );
      lmsDocs.push(doc);
    }

    // Packaging Material QC (SRS 3.1.5)
    const packagingRecords = [
      {
        materialType: "Bottle",
        materialName: "HDPE Bottle 1L",
        batchNo: "PM-BTL-1001",
        testDate: dateFromYMD("2025-01-15"),
        supplier: "PackPro Ltd.",
        supplierContact: "support@packpro.example",
        supplierAddress: "Industrial Zone A",
        coaNumber: "COA-PP-1001",
        coaDate: dateFromYMD("2025-01-14"),
        inspectionResults: { dimensions: "OK", weight: "OK", defects: "None" },
        testParameters: { thickness: 0.65, unit: "mm", dropTest: "Pass" },
        status: "approved",
        acceptanceNotes: "Meets all specs",
        approvedAt: dateFromYMD("2025-01-16"),
      },
      {
        materialType: "Carton",
        materialName: "Carton 4x1L",
        batchNo: "PM-CRT-2203",
        testDate: dateFromYMD("2025-02-02"),
        supplier: "BoxWorks",
        supplierContact: "qa@boxworks.example",
        supplierAddress: "Logistics Park B",
        coaNumber: "COA-BW-2203",
        coaDate: dateFromYMD("2025-02-01"),
        inspectionResults: { compression: "OK", labeling: "OK", defects: "Minor scuff" },
        testParameters: { gsm: 450, unit: "gsm", moisture: "Low" },
        status: "conditional",
        acceptanceNotes: "Use with additional QC check",
      },
    ];

    const packagingDocs = [];
    for (const record of packagingRecords) {
      const doc = await upsertBy(
        PackagingMaterialQC,
        { company_id, materialType: record.materialType, batchNo: record.batchNo },
        { ...record, company_id, isActive: true }
      );
      packagingDocs.push(doc);
    }

    // QA Bottle Filling (SRS 3.2)
    const qaRecords = [
      {
        date: dateFromYMD("2025-01-22"),
        operator: "Ahmed",
        shift: "Morning",
        machineId: "FILL-01",
        machineName: "Filling Line 1",
        hourlyRecords: [
          {
            hour: 8,
            batchNo: "R-TEST-001",
            grade: "A",
            drumIbcNo: "DR-110",
            productName: "Epoxy Resin R-101",
            kitSize: "1L",
            cartonLabeling: "OK",
            weight: 980,
            stacking: "OK",
            remarks: "",
          },
          {
            hour: 9,
            batchNo: "R-TEST-001",
            grade: "A",
            drumIbcNo: "DR-111",
            productName: "Epoxy Resin R-101",
            kitSize: "1L",
            cartonLabeling: "OK",
            weight: 975,
            stacking: "OK",
            remarks: "",
          },
        ],
        status: "approved",
        submittedAt: dateFromYMD("2025-01-22"),
        approvedAt: dateFromYMD("2025-01-23"),
      },
      {
        date: dateFromYMD("2025-02-06"),
        operator: "Sara",
        shift: "Night",
        machineId: "FILL-02",
        machineName: "Filling Line 2",
        hourlyRecords: [
          {
            hour: 20,
            batchNo: "H-TEST-010",
            grade: "B",
            drumIbcNo: "IBC-55",
            productName: "Hardener H-220",
            kitSize: "5L",
            cartonLabeling: "OK",
            weight: 4950,
            stacking: "OK",
            remarks: "",
          },
        ],
        status: "submitted",
        submittedAt: dateFromYMD("2025-02-06"),
      },
    ];

    const qaDocs = [];
    for (const record of qaRecords) {
      const totals = buildHourlyTotals(record.hourlyRecords);
      const doc = await upsertBy(
        QABottleFilling,
        { company_id, date: record.date, operator: record.operator, shift: record.shift },
        { ...record, ...totals, company_id, isActive: true }
      );
      qaDocs.push(doc);
    }

    // R&D Trial Batch (SRS 3.3.1)
    const rdRecords = [
      {
        productFolder: "tile_adhesive",
        trialBatchNo: "T0",
        fullTrialCode: "tile_adhesive-T0",
        productName: "Tile Adhesive TA-10",
        productType: "CEMENT_BASED",
        targetGrade: "C1",
        trialDate: dateFromYMD("2025-01-10"),
        parameters: { waterRatio: 0.24, polymer: "P-100" },
        testResults: { bondStrength: 0.6, unit: "N/mm2" },
        trendData: { bondStrengthTrend: [0.5, 0.6] },
        chartData: { x: ["T-1", "T0"], y: [0.5, 0.6] },
        comparisonWithPrevious: { improvement: "10%" },
        costPerUnit: 120,
        costUnit: "per ton",
        performanceCostRatio: 1.25,
        status: "completed",
        observations: "Good workability",
        conclusions: "Proceed to T1",
        nextSteps: "Optimize polymer dosage",
      },
      {
        productFolder: "tile_adhesive",
        trialBatchNo: "T1",
        fullTrialCode: "tile_adhesive-T1",
        productName: "Tile Adhesive TA-10",
        productType: "CEMENT_BASED",
        targetGrade: "C2",
        trialDate: dateFromYMD("2025-02-01"),
        parameters: { waterRatio: 0.22, polymer: "P-120" },
        testResults: { bondStrength: 0.85, unit: "N/mm2" },
        trendData: { bondStrengthTrend: [0.6, 0.85] },
        chartData: { x: ["T0", "T1"], y: [0.6, 0.85] },
        comparisonWithPrevious: { improvement: "42%" },
        costPerUnit: 135,
        costUnit: "per ton",
        performanceCostRatio: 1.4,
        status: "in_progress",
        observations: "Higher strength",
        conclusions: "Validate on scale-up",
        nextSteps: "Run pilot batch",
      },
    ];

    const rdDocs = [];
    for (const record of rdRecords) {
      const doc = await upsertBy(
        RDTrialBatch,
        { company_id, productFolder: record.productFolder, trialBatchNo: record.trialBatchNo },
        { ...record, company_id, isActive: true }
      );
      rdDocs.push(doc);
    }

    // Raw Materials + Batches (SRS 3.3.2/3.3.3)
    const rawMaterials = [
      {
        materialCode: "CEM-001",
        materialName: "Portland Cement Type I",
        category: "CEMENT",
        description: "High early strength cement",
        unit: "kg",
        specifications: { fineness: "3000 cm2/g", settingTime: "45 min" },
        supplier: { supplierName: "CemCo", supplierCode: "CEMCO" },
        storageConditions: "Dry warehouse",
        shelfLife: 180,
      },
      {
        materialCode: "POL-010",
        materialName: "Redispersible Polymer Powder",
        category: "POLYMER",
        description: "Improves adhesion",
        unit: "kg",
        specifications: { solids: "99%", Tg: "0C" },
        supplier: { supplierName: "PolyChem", supplierCode: "POLY" },
        storageConditions: "Cool, dry",
        shelfLife: 365,
      },
    ];

    const rawMaterialDocs = [];
    for (const material of rawMaterials) {
      rawMaterialDocs.push(await getOrCreateRawMaterial(company_id, material));
    }

    const rawMaterialBatches = [
      {
        rawMaterial: rawMaterialDocs[0]._id,
        batchNo: "CEM-001-B01",
        receiptDate: dateFromYMD("2025-01-05"),
        quantity: 20000,
        unit: "kg",
        status: "IN_STOCK",
        qcTested: true,
        qcTestDate: dateFromYMD("2025-01-06"),
        qcTestResult: "PASS",
        remainingQuantity: 12000,
      },
      {
        rawMaterial: rawMaterialDocs[1]._id,
        batchNo: "POL-010-B03",
        receiptDate: dateFromYMD("2025-01-12"),
        quantity: 5000,
        unit: "kg",
        status: "QUARANTINE",
        qcTested: false,
        qcTestResult: "PENDING",
        remainingQuantity: 5000,
        quarantineReason: "Awaiting COA confirmation",
      },
    ];

    for (const batch of rawMaterialBatches) {
      await upsertBy(
        RawMaterialBatch,
        { company_id, rawMaterial: batch.rawMaterial, batchNo: batch.batchNo },
        { ...batch, company_id, isActive: true }
      );
    }

    // QC Results (for reporting)
    const qcResults = [
      {
        module: "RESIN",
        productCategory: "Epoxy Resin",
        productName: "Epoxy Resin R-101",
        grade: "A",
        batchNo: "R-TEST-001",
        testDate: dateFromYMD("2025-01-20"),
        operator: "Ahmed",
        shift: "Morning",
        values: [
          { test: testMap.EEW._id, value: 190, numericValue: 190, unit: "g/eq", notes: "" },
          { test: testMap.VISCOSITY_25C._id, value: 12000, numericValue: 12000, unit: "cP", notes: "" },
          { test: testMap.GEL_TIME._id, value: 35, numericValue: 35, unit: "min", notes: "" },
        ],
        status: "approved",
        submittedAt: dateFromYMD("2025-01-21"),
        approvedAt: dateFromYMD("2025-01-22"),
      },
      {
        module: "HARDENER",
        productCategory: "Epoxy Hardener",
        productName: "Hardener H-220",
        grade: "B",
        batchNo: "H-TEST-010",
        testDate: dateFromYMD("2025-01-18"),
        operator: "Sara",
        shift: "Night",
        values: [
          { test: testMap.AMINE_VALUE._id, value: 430, numericValue: 430, unit: "mg KOH/g", notes: "" },
          { test: testMap.VISCOSITY_25C._id, value: 6200, numericValue: 6200, unit: "cP", notes: "" },
          { test: testMap.GEL_TIME._id, value: 28, numericValue: 28, unit: "min", notes: "" },
        ],
        status: "approved",
        submittedAt: dateFromYMD("2025-01-19"),
        approvedAt: dateFromYMD("2025-01-20"),
      },
    ];

    for (const result of qcResults) {
      await upsertBy(
        QCResult,
        { company_id, module: result.module, batchNo: result.batchNo, testDate: result.testDate },
        { ...result, company_id, system: "QC_SITE_AREA", isActive: true }
      );
    }

    // Document Index (SRS 3.5)
    const docIndexRecords = [
      {
        documentId: resinDocs[0]._id,
        documentType: "RESIN_QC",
        batchNumber: resinDocs[0].batchNo,
        date: resinDocs[0].testDate,
        productName: resinDocs[0].productName,
        grade: resinDocs[0].grade,
        module: "RESIN",
        fileName: "resin-qc-r-001.pdf",
        fileType: "PDF",
        fileSize: 245000,
        fileUrl: "https://example.com/docs/resin-qc-r-001.pdf",
        tags: ["resin", "qc", "batch"],
        description: "Resin QC batch report",
        searchKeywords: "resin qc R-TEST-001",
      },
      {
        documentId: hardenerDocs[0]._id,
        documentType: "HARDENER_QC",
        batchNumber: hardenerDocs[0].batchNo,
        date: hardenerDocs[0].testDate,
        productName: hardenerDocs[0].productName,
        grade: hardenerDocs[0].grade,
        module: "HARDENER",
        fileName: "hardener-qc-h-010.pdf",
        fileType: "PDF",
        fileSize: 210000,
        fileUrl: "https://example.com/docs/hardener-qc-h-010.pdf",
        tags: ["hardener", "qc", "batch"],
        description: "Hardener QC batch report",
        searchKeywords: "hardener qc H-TEST-010",
      },
      {
        documentId: lmsDocs[0]._id,
        documentType: "LMS_QC",
        batchNumber: lmsDocs[0].batchNo,
        date: lmsDocs[0].testDate,
        productName: lmsDocs[0].productName,
        grade: lmsDocs[0].grade,
        module: "LMS",
        productType: lmsDocs[0].productType,
        fileName: "lms-qc-r-001.xlsx",
        fileType: "XLSX",
        fileSize: 128000,
        fileUrl: "https://example.com/docs/lms-qc-r-001.xlsx",
        tags: ["lms", "qc", "resin"],
        description: "LMS QC testing sheet",
        searchKeywords: "lms qc LMS-R-001",
      },
      {
        documentId: packagingDocs[0]._id,
        documentType: "PACKAGING_MATERIAL_QC",
        batchNumber: packagingDocs[0].batchNo,
        date: packagingDocs[0].testDate,
        productName: packagingDocs[0].materialName,
        module: "PACKAGING",
        fileName: "packaging-bottle-1001.pdf",
        fileType: "PDF",
        fileSize: 156000,
        fileUrl: "https://example.com/docs/packaging-bottle-1001.pdf",
        tags: ["packaging", "bottle", "qc"],
        description: "Packaging material inspection report",
        searchKeywords: "packaging qc bottle",
      },
      {
        documentId: qaDocs[0]._id,
        documentType: "QA_BOTTLE_FILLING",
        batchNumber: "R-TEST-001",
        date: qaDocs[0].date,
        productName: "Epoxy Resin R-101",
        grade: "A",
        module: "QA_BOTTLE_FILLING",
        operator: qaDocs[0].operator,
        shift: qaDocs[0].shift,
        fileName: "qa-bottle-filling-2025-01-22.pdf",
        fileType: "PDF",
        fileSize: 98000,
        fileUrl: "https://example.com/docs/qa-bottle-filling-2025-01-22.pdf",
        tags: ["qa", "bottle", "traceability"],
        description: "Daily bottle filling log",
        searchKeywords: "qa bottle filling traceability",
      },
      {
        documentId: rdDocs[0]._id,
        documentType: "RD_TRIAL",
        batchNumber: rdDocs[0].trialBatchNo,
        date: rdDocs[0].trialDate,
        productName: rdDocs[0].productName,
        grade: rdDocs[0].targetGrade,
        module: "RD_TRIAL",
        fileName: "rd-trial-t0.xlsx",
        fileType: "XLSX",
        fileSize: 74000,
        fileUrl: "https://example.com/docs/rd-trial-t0.xlsx",
        tags: ["rd", "trial", "formulation"],
        description: "R&D trial batch summary",
        searchKeywords: "rd trial tile adhesive",
      },
    ];

    for (const doc of docIndexRecords) {
      await upsertBy(
        QCDocumentIndex,
        { company_id, documentId: doc.documentId, documentType: doc.documentType },
        { ...doc, company_id, isActive: true }
      );
    }

    console.log("✅ QC Site Area test data seeded/updated");
  } catch (err) {
    console.error("❌ QC Site Area test data seed failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();
