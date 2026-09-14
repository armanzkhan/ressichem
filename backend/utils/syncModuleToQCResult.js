const QCResult = require("../models/QCResult");
const QCTest = require("../models/QCTest");

/**
 * Dual-write Site module records into QCResult
 * so /qc/site/results stays in sync with dedicated module pages.
 */

const RESIN_FIELD_MAP = [
  { codes: ["EEW"], field: "eew", unitField: null, defaultUnit: "g/eq" },
  { codes: ["VISCOSITY", "VISCOSITY_25C"], field: "viscosity", unitField: "viscosityUnit", defaultUnit: "cP" },
  { codes: ["GEL_TIME"], field: "gelTime", unitField: "gelTimeUnit", defaultUnit: "min" },
  { codes: ["MIX_VISCOSITY"], field: "mixViscosity", unitField: "mixViscosityUnit", defaultUnit: "cP" },
  { codes: ["EXO"], field: "exothermicTemperature", unitField: "exothermicTemperatureUnit", defaultUnit: "°C" },
  { codes: ["HYCL"], field: "hycl", unitField: "hyclUnit", defaultUnit: "ppm" },
  { codes: ["SOLIDS"], field: "solidContent", unitField: "solidContentUnit", defaultUnit: "%" },
  { codes: ["COLOR"], field: "color", unitField: null, defaultUnit: "" },
  { codes: ["TRANSPARENCY"], field: "transparency", unitField: null, defaultUnit: "" },
];

const HARDENER_FIELD_MAP = [
  { codes: ["AMINE_VALUE"], field: "amineValue", unitField: "amineValueUnit", defaultUnit: "mg KOH/g" },
  { codes: ["VISCOSITY", "VISCOSITY_25C"], field: "viscosity", unitField: "viscosityUnit", defaultUnit: "cP" },
  { codes: ["GEL_TIME"], field: "gelTime", unitField: "gelTimeUnit", defaultUnit: "min" },
  { codes: ["MIX_VISCOSITY"], field: "mixViscosity", unitField: "mixViscosityUnit", defaultUnit: "cP" },
  { codes: ["EXO"], field: "exothermicTemperature", unitField: "exothermicTemperatureUnit", defaultUnit: "°C" },
  { codes: ["SOLIDS"], field: "solidContent", unitField: "solidContentUnit", defaultUnit: "%" },
  { codes: ["COLOR"], field: "color", unitField: null, defaultUnit: "" },
  { codes: ["TRANSPARENCY"], field: "transparency", unitField: null, defaultUnit: "" },
];

const LMS_FIELD_MAP = [
  { codes: ["VISCOSITY", "VISCOSITY_25C"], field: "viscosity", unitField: "viscosityUnit", defaultUnit: "cP" },
  { codes: ["GEL_TIME"], field: "gelTime", unitField: "gelTimeUnit", defaultUnit: "min" },
  { codes: ["COLOR"], field: "color", unitField: null, defaultUnit: "" },
  { codes: ["TRANSPARENCY"], field: "transparency", unitField: null, defaultUnit: "" },
  { codes: ["EEW"], field: "eew", unitField: null, defaultUnit: "g/eq", fromMixed: true },
  { codes: ["AMINE_VALUE"], field: "amineValue", unitField: null, defaultUnit: "mg KOH/g", fromMixed: true },
];

function toNumericMaybe(val) {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "" && !Number.isNaN(Number(val))) return Number(val);
  return undefined;
}

function refId(value) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value._id) return value._id;
  return value;
}

function normalizeWorkflowStatus(status, source = "default", doc = null) {
  const raw = String(status || "draft").toLowerCase();
  if (source === "packaging") {
    if (raw === "pending") return "draft";
    if (raw === "conditional") return "submitted";
    if (raw === "approved") return "approved";
    if (raw === "rejected") return "rejected";
    return "draft";
  }
  if (source === "rnd") {
    if (raw === "planned" || raw === "on_hold") return "draft";
    if (raw === "in_progress") return "submitted";
    if (raw === "completed") return "approved";
    if (raw === "cancelled") return "rejected";
    return "draft";
  }
  if (source === "raw_material") {
    const qc = String(doc?.qcTestResult || "").toUpperCase();
    const inv = String(doc?.status || "").toUpperCase();
    if (qc === "PASS" || doc?.coa?.approved) return "approved";
    if (qc === "FAIL" || inv === "REJECTED") return "rejected";
    if (inv === "QUARANTINE" || (doc?.qcTested && qc === "PENDING")) return "submitted";
    return "draft";
  }
  if (["draft", "submitted", "approved", "rejected"].includes(raw)) return raw;
  return "draft";
}

function readField(doc, mapping) {
  let raw = doc?.[mapping.field];
  if ((raw === undefined || raw === null || raw === "") && mapping.fromMixed) {
    const phys = doc?.physicalTests || {};
    const chem = doc?.chemicalTests || {};
    const extra = doc?.testResults || {};
    raw = phys[mapping.field] ?? chem[mapping.field] ?? extra[mapping.field];
  }
  return raw;
}

async function resolveTestsByCodes(company_id, codeLists) {
  const allCodes = [...new Set(codeLists.flat())];
  if (!allCodes.length) return new Map();
  const tests = await QCTest.find({
    company_id,
    code: { $in: allCodes },
    isActive: { $ne: false },
  }).lean();
  return new Map(tests.map((t) => [t.code, t]));
}

async function resolveTestsForModule(company_id, module) {
  const moduleAliases = [module];
  if (module === "LMS") moduleAliases.push("LMS_RESIN", "LMS_HARDENER", "LMS_FLOORING");
  if (module.startsWith("LMS_")) moduleAliases.push("LMS");

  const tests = await QCTest.find({
    company_id,
    applicableModules: { $in: moduleAliases },
    isActive: { $ne: false },
  }).lean();
  return new Map(tests.map((t) => [t.code, t]));
}

function buildValues(doc, fieldMap, testsByCode) {
  const values = [];
  const usedTestIds = new Set();

  for (const mapping of fieldMap) {
    const raw = readField(doc, mapping);
    if (raw === undefined || raw === null || raw === "") continue;

    let test = null;
    for (const code of mapping.codes) {
      if (testsByCode.has(code)) {
        test = testsByCode.get(code);
        break;
      }
    }
    if (!test) continue;
    const tid = String(test._id);
    if (usedTestIds.has(tid)) continue;
    usedTestIds.add(tid);

    const numericValue = toNumericMaybe(raw);
    const unit =
      (mapping.unitField && doc?.[mapping.unitField]) ||
      test.unit ||
      mapping.defaultUnit ||
      "";

    values.push({
      test: test._id,
      value: numericValue !== undefined ? numericValue : raw,
      numericValue,
      unit,
      notes: "",
    });
  }

  return values;
}

function unwrapMixedValue(val) {
  if (val && typeof val === "object" && !Array.isArray(val) && "value" in val) {
    return val.value;
  }
  return val;
}

function flattenDocToMixed(doc) {
  const mixed = {};

  const assignBag = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    for (const [key, val] of Object.entries(obj)) {
      const unwrapped = unwrapMixedValue(val);
      if (unwrapped !== undefined && unwrapped !== null && unwrapped !== "") {
        mixed[key] = unwrapped;
      }
    }
  };

  assignBag(doc?.testParameters);
  assignBag(doc?.inspectionResults);
  assignBag(doc?.parameters);
  assignBag(doc?.coa?.testResults);

  const testResults = doc?.testResults;
  if (testResults && typeof testResults === "object" && !Array.isArray(testResults)) {
    if (Array.isArray(testResults.results)) {
      for (const row of testResults.results) {
        const key = row?.test || row?.code || row?.name;
        const val = row?.result ?? row?.value;
        if (key && val !== undefined && val !== null && String(val).trim() !== "") {
          mixed[String(key)] = val;
        }
      }
    }
    for (const [key, val] of Object.entries(testResults)) {
      if (key === "results" || key === "totals") continue;
      const unwrapped = unwrapMixedValue(val);
      if (unwrapped !== undefined && unwrapped !== null && unwrapped !== "") mixed[key] = unwrapped;
    }
  }

  const hourly = Array.isArray(doc?.hourlyRecords) ? doc.hourlyRecords.find((r) => r && Object.keys(r).length) : null;
  if (hourly) {
    for (const [key, val] of Object.entries(hourly)) {
      const unwrapped = unwrapMixedValue(val);
      if (unwrapped !== undefined && unwrapped !== null && String(unwrapped).trim() !== "") {
        mixed[key] = unwrapped;
      }
    }
  }

  return mixed;
}

function lookupMixedValue(mixed, code) {
  if (mixed[code] !== undefined && mixed[code] !== null && mixed[code] !== "") return mixed[code];
  const normalized = String(code).toLowerCase().replace(/\s+/g, "_");
  for (const [key, val] of Object.entries(mixed)) {
    if (val === undefined || val === null || val === "") continue;
    const keyNorm = String(key).toLowerCase().replace(/\s+/g, "_");
    if (keyNorm === normalized) return val;
  }
  return undefined;
}

function buildValuesFromMixed(doc, testsByCode, usedTestIds = new Set()) {
  const mixed = flattenDocToMixed(doc);
  const values = [];
  const tests = [...testsByCode.values()];

  for (const [code, test] of testsByCode.entries()) {
    const tid = String(test._id);
    if (usedTestIds.has(tid)) continue;
    const raw = lookupMixedValue(mixed, code);
    if (raw === undefined || raw === null || raw === "") continue;
    usedTestIds.add(tid);
    const numericValue = toNumericMaybe(raw);
    values.push({
      test: test._id,
      value: numericValue !== undefined ? numericValue : raw,
      numericValue,
      unit: test.unit || "",
      notes: "",
    });
  }

  for (const [key, raw] of Object.entries(mixed)) {
    if (raw === undefined || raw === null || raw === "") continue;
    const keyNorm = String(key).toLowerCase().replace(/\s+/g, "_");
    let test = tests.find((t) => {
      const tid = String(t._id);
      if (usedTestIds.has(tid)) return false;
      const codeNorm = String(t.code || "").toLowerCase();
      const nameNorm = String(t.name || "").toLowerCase().replace(/\s+/g, "_");
      return codeNorm === keyNorm || nameNorm === keyNorm;
    });
    if (!test) continue;
    const tid = String(test._id);
    if (usedTestIds.has(tid)) continue;
    usedTestIds.add(tid);
    const numericValue = toNumericMaybe(raw);
    values.push({
      test: test._id,
      value: numericValue !== undefined ? numericValue : raw,
      numericValue,
      unit: test.unit || "",
      notes: "",
    });
  }

  return values;
}

async function buildModuleValues(company_id, module, doc, fieldMap) {
  const testsByCodeFromMap = await resolveTestsByCodes(
    company_id,
    fieldMap.map((m) => m.codes)
  );
  const testsByModule = await resolveTestsForModule(company_id, module);
  const testsByCode = new Map([...testsByModule, ...testsByCodeFromMap]);

  const fromFields = buildValues(doc, fieldMap, testsByCode);
  const used = new Set(fromFields.map((v) => String(v.test)));
  const fromMixed = buildValuesFromMixed(doc, testsByCode, used);
  return [...fromFields, ...fromMixed];
}

async function findLinkedResult(company_id, module, sourceEntityType, sourceEntityId, batchNo) {
  if (sourceEntityId) {
    const bySource = await QCResult.findOne({
      company_id,
      system: "QC_SITE_AREA",
      module,
      sourceEntityType,
      sourceEntityId,
    });
    if (bySource) return bySource;
  }

  if (batchNo) {
    return QCResult.findOne({
      company_id,
      system: "QC_SITE_AREA",
      module,
      batchNo: String(batchNo).trim(),
      isActive: true,
      $or: [
        { sourceEntityId: { $exists: false } },
        { sourceEntityId: null },
        { sourceEntityId },
      ],
    }).sort({ updatedAt: -1 });
  }

  return null;
}

function resolveBatchNo(doc, override) {
  if (override) return String(override).trim();
  if (doc?.batchNo) return String(doc.batchNo).trim();
  if (doc?.fullTrialCode) return String(doc.fullTrialCode).trim();
  return "";
}

function qaBatchNo(doc) {
  const hourly = Array.isArray(doc?.hourlyRecords) ? doc.hourlyRecords : [];
  const withBatch = hourly.find((row) => row?.batchNo && String(row.batchNo).trim());
  if (withBatch) return String(withBatch.batchNo).trim();
  const datePart = doc?.date ? new Date(doc.date).toISOString().slice(0, 10) : "unknown-date";
  const operator = String(doc?.operator || "operator").replace(/\s+/g, "-");
  const shift = String(doc?.shift || "shift").replace(/\s+/g, "-");
  return `QA-${datePart}-${operator}-${shift}`;
}

/**
 * Upsert a QCResult from a Site module document.
 */
async function upsertQCResultFromModule({
  company_id,
  module,
  sourceEntityType,
  doc,
  user,
  batchNo: batchNoOverride,
  fieldMap: fieldMapOverride,
  productCategory,
  productName,
  grade,
  testDate,
  operator,
  shift,
  statusSource = "default",
}) {
  if (!doc) return null;

  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const batchNo = resolveBatchNo(plain, batchNoOverride);
  if (!batchNo) return null;

  const fieldMap =
    fieldMapOverride ||
    (module === "HARDENER" ? HARDENER_FIELD_MAP : module === "LMS" ? LMS_FIELD_MAP : RESIN_FIELD_MAP);

  const values = await buildModuleValues(company_id, module, plain, fieldMap);
  const sourceEntityId = plain._id;
  const existing = await findLinkedResult(
    company_id,
    module,
    sourceEntityType,
    sourceEntityId,
    batchNo
  );

  const payload = {
    company_id,
    system: "QC_SITE_AREA",
    module,
    productCategory: productCategory || plain.category || plain.productType || plain.materialType || module,
    productName: productName || plain.productName || plain.materialName || "",
    grade: grade || plain.grade || plain.targetGrade || "",
    batchNo,
    testDate: testDate
      ? new Date(testDate)
      : plain.testDate
        ? new Date(plain.testDate)
        : plain.trialDate
          ? new Date(plain.trialDate)
          : plain.date
            ? new Date(plain.date)
            : new Date(),
    operator: operator || plain.operator || plain.qcOfficer || "",
    shift: shift || plain.shift || "",
    values,
    remarks: plain.remarks || plain.observations || plain.conclusions || "",
    status: normalizeWorkflowStatus(plain.status, statusSource, plain),
    submittedAt: plain.submittedAt,
    approvedAt: plain.approvedAt,
    rejectedAt: plain.rejectedAt,
    rejectionReason: plain.rejectionReason || plain.rejectionNotes || "",
    approvedBy: refId(plain.approvedBy),
    updatedBy: refId(user?._id || plain.updatedBy),
    sourceEntityType,
    sourceEntityId,
    isActive: plain.isActive !== false,
  };

  if (existing) {
    Object.assign(existing, payload);
    if (!existing.createdBy && refId(user?._id || plain.createdBy)) {
      existing.createdBy = refId(user?._id || plain.createdBy);
    }
    await existing.save();
    return existing;
  }

  return QCResult.create({
    ...payload,
    createdBy: refId(user?._id || plain.createdBy),
  });
}

async function upsertPackagingToResults(company_id, doc, user) {
  return upsertQCResultFromModule({
    company_id,
    module: "PACKAGING",
    sourceEntityType: "PackagingMaterialQC",
    doc,
    user,
    fieldMap: [],
    statusSource: "packaging",
  });
}

async function upsertRawMaterialBatchToResults(company_id, doc, user) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  let material = plain.rawMaterial && typeof plain.rawMaterial === "object" ? plain.rawMaterial : null;
  if (!material && plain.rawMaterial) {
    const RawMaterial = require("../models/RawMaterial");
    material = await RawMaterial.findById(plain.rawMaterial).lean();
  }

  return upsertQCResultFromModule({
    company_id,
    module: "RAW_MATERIAL",
    sourceEntityType: "RawMaterialBatch",
    doc: {
      ...plain,
      testParameters: plain.coa?.testResults || {},
      testResults: plain.coa?.testResults || {},
    },
    user,
    fieldMap: [],
    productCategory: material?.category || "OTHER",
    productName: material?.materialName || "",
    testDate: plain.qcTestDate || plain.receiptDate,
    statusSource: "raw_material",
  });
}

async function upsertQABottleFillingToResults(company_id, doc, user) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return upsertQCResultFromModule({
    company_id,
    module: "QA_BOTTLE_FILLING",
    sourceEntityType: "QABottleFilling",
    doc: plain,
    user,
    batchNo: qaBatchNo(plain),
    fieldMap: [],
    productCategory: "Bottle Filling",
    productName: plain.machineName || plain.machineId || "Daily bottle filling",
    testDate: plain.date,
    operator: plain.operator,
    shift: plain.shift,
  });
}

async function upsertRDTrialToResults(company_id, doc, user) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return upsertQCResultFromModule({
    company_id,
    module: "RND_TRIAL",
    sourceEntityType: "RDTrialBatch",
    doc: plain,
    user,
    batchNo: plain.fullTrialCode || plain.trialBatchNo,
    fieldMap: [],
    productCategory: plain.productFolder || "R&D Trial",
    productName: plain.productName || "",
    grade: plain.targetGrade || "",
    testDate: plain.trialDate,
    statusSource: "rnd",
  });
}

async function softDeleteLinkedQCResult({ company_id, module, sourceEntityType, sourceEntityId, user }) {
  if (!sourceEntityId) return null;
  const existing = await QCResult.findOne({
    company_id,
    system: "QC_SITE_AREA",
    module,
    sourceEntityType,
    sourceEntityId,
    isActive: true,
  });
  if (!existing) return null;
  existing.isActive = false;
  existing.updatedBy = refId(user?._id);
  await existing.save();
  return existing;
}

module.exports = {
  upsertQCResultFromModule,
  upsertPackagingToResults,
  upsertRawMaterialBatchToResults,
  upsertQABottleFillingToResults,
  upsertRDTrialToResults,
  softDeleteLinkedQCResult,
  RESIN_FIELD_MAP,
  HARDENER_FIELD_MAP,
  LMS_FIELD_MAP,
};
