const QCResult = require("../models/QCResult");
const QCTest = require("../models/QCTest");
const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const LMSQC = require("../models/LMSQC");
const PackagingMaterialQC = require("../models/PackagingMaterialQC");
const QABottleFilling = require("../models/QABottleFilling");
const RDTrialBatch = require("../models/RDTrialBatch");
const RawMaterial = require("../models/RawMaterial");
const RawMaterialBatch = require("../models/RawMaterialBatch");
const {
  RESIN_FIELD_MAP,
  HARDENER_FIELD_MAP,
  LMS_FIELD_MAP,
} = require("./syncModuleToQCResult");

/**
 * Dual-write QCResult records into dedicated Site module collections
 * so module pages stay in sync with /qc/site/results.
 */

const LMS_MODULES = new Set(["LMS", "LMS_RESIN", "LMS_HARDENER", "LMS_FLOORING"]);

const MODULE_TO_ENTITY = {
  RESIN: "ResinQC",
  HARDENER: "HardenerQC",
  LMS: "LMSQC",
  LMS_RESIN: "LMSQC",
  LMS_HARDENER: "LMSQC",
  LMS_FLOORING: "LMSQC",
  PACKAGING: "PackagingMaterialQC",
  QA_BOTTLE_FILLING: "QABottleFilling",
  RND_TRIAL: "RDTrialBatch",
  RAW_MATERIAL: "RawMaterialBatch",
};

const LMS_MODULE_TO_PRODUCT_TYPE = {
  LMS_RESIN: "LMS_EPOXY_RESIN",
  LMS_HARDENER: "LMS_EPOXY_HARDENER",
  LMS_FLOORING: "LMS_EPOXY_FLOORING",
};

function refId(value) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value._id) return value._id;
  return value;
}

function qcStatusToPackaging(status) {
  const raw = String(status || "draft").toLowerCase();
  if (raw === "draft") return "pending";
  if (raw === "submitted") return "conditional";
  if (raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  return "pending";
}

function qcStatusToRawMaterial(status) {
  const raw = String(status || "draft").toLowerCase();
  if (raw === "approved") {
    return { status: "IN_STOCK", qcTestResult: "PASS", qcTested: true, coaApproved: true };
  }
  if (raw === "rejected") {
    return { status: "REJECTED", qcTestResult: "FAIL", qcTested: true, coaApproved: false };
  }
  if (raw === "submitted") {
    return { status: "QUARANTINE", qcTestResult: "PENDING", qcTested: true, coaApproved: false };
  }
  return { status: "RECEIVED", qcTestResult: "PENDING", qcTested: false, coaApproved: false };
}

function qcStatusToRnd(status) {
  const raw = String(status || "draft").toLowerCase();
  if (raw === "draft") return "planned";
  if (raw === "submitted") return "in_progress";
  if (raw === "approved") return "completed";
  if (raw === "rejected") return "cancelled";
  return "planned";
}

function resolveLmsProductType(module, productCategory) {
  if (LMS_MODULE_TO_PRODUCT_TYPE[module]) return LMS_MODULE_TO_PRODUCT_TYPE[module];
  const cat = String(productCategory || "").toLowerCase();
  if (cat.includes("hardener")) return "LMS_EPOXY_HARDENER";
  if (cat.includes("floor")) return "LMS_EPOXY_FLOORING";
  return "LMS_EPOXY_RESIN";
}

function parseTrialCode(result) {
  const batchNo = String(result.batchNo || "").trim();
  const idx = batchNo.lastIndexOf("-");
  if (idx > 0) {
    return {
      productFolder: batchNo.slice(0, idx),
      trialBatchNo: batchNo.slice(idx + 1),
      fullTrialCode: batchNo,
    };
  }
  return {
    productFolder: String(result.productCategory || "general").trim() || "general",
    trialBatchNo: batchNo || "T0",
    fullTrialCode: batchNo || `${result.productCategory || "general"}-T0`,
  };
}

async function ensureValuesPopulated(values = []) {
  const rows = Array.isArray(values) ? values : [];
  const missingIds = rows
    .filter((v) => v?.test && !v.test.code)
    .map((v) => refId(v.test))
    .filter(Boolean);

  if (!missingIds.length) return rows;

  const tests = await QCTest.find({ _id: { $in: missingIds } }).lean();
  const byId = new Map(tests.map((t) => [String(t._id), t]));

  return rows.map((v) => {
    if (v?.test?.code) return v;
    const testId = refId(v.test);
    const test = testId ? byId.get(String(testId)) : null;
    return test ? { ...v, test } : v;
  });
}

function valuesByCode(values = []) {
  const map = new Map();
  for (const v of values) {
    const code = v?.test?.code;
    if (code) map.set(code, v);
  }
  return map;
}

function valuesToModuleFields(values, fieldMap) {
  const byCode = valuesByCode(values);
  const fields = {};
  const testResults = {};
  const usedCodes = new Set();

  for (const mapping of fieldMap) {
    for (const code of mapping.codes) {
      if (!byCode.has(code)) continue;
      const entry = byCode.get(code);
      usedCodes.add(code);
      fields[mapping.field] = entry.value;
      if (mapping.unitField && entry.unit) {
        fields[mapping.unitField] = entry.unit;
      }
      break;
    }
  }

  for (const [code, entry] of byCode.entries()) {
    if (usedCodes.has(code)) continue;
    testResults[code] = entry.value;
  }

  return { fields, testResults };
}

function valuesToMixedMaps(values, fieldMap) {
  const byCode = valuesByCode(values);
  const direct = {};
  const physicalTests = {};
  const chemicalTests = {};
  const testResults = {};
  const usedCodes = new Set();

  for (const mapping of fieldMap) {
    for (const code of mapping.codes) {
      if (!byCode.has(code)) continue;
      const entry = byCode.get(code);
      usedCodes.add(code);
      if (mapping.fromMixed) {
        chemicalTests[mapping.field] = entry.value;
      } else {
        direct[mapping.field] = entry.value;
        if (mapping.unitField && entry.unit) {
          direct[mapping.unitField] = entry.unit;
        }
      }
      break;
    }
  }

  for (const [code, entry] of byCode.entries()) {
    if (usedCodes.has(code)) continue;
    testResults[code] = entry.value;
  }

  return { direct, physicalTests, chemicalTests, testResults };
}

function workflowFields(result, user) {
  return {
    status: result.status || "draft",
    submittedAt: result.submittedAt,
    approvedAt: result.approvedAt,
    rejectedAt: result.rejectedAt,
    rejectionReason: result.rejectionReason || "",
    approvedBy: refId(result.approvedBy),
    updatedBy: refId(user?._id || result.updatedBy),
    isActive: result.isActive !== false,
  };
}

async function findExistingModuleDoc(Model, company_id, result, extraFilter = {}) {
  if (result.sourceEntityId) {
    const bySource = await Model.findOne({ _id: result.sourceEntityId, company_id });
    if (bySource) return bySource;
  }

  if (result.batchNo) {
    return Model.findOne({
      company_id,
      batchNo: String(result.batchNo).trim(),
      isActive: true,
      ...extraFilter,
    }).sort({ updatedAt: -1 });
  }

  return null;
}

async function upsertSimpleBatchModule({ Model, fieldMap, company_id, result, values, user, extra = {} }) {
  const { fields } = valuesToModuleFields(values, fieldMap);
  const payload = {
    company_id,
    batchNo: result.batchNo,
    productName: result.productName || "",
    grade: result.grade || "",
    testDate: result.testDate ? new Date(result.testDate) : new Date(),
    remarks: result.remarks || "",
    ...fields,
    ...workflowFields(result, user),
    ...extra,
  };

  const existing = await findExistingModuleDoc(Model, company_id, result);
  if (existing) {
    Object.assign(existing, payload);
    if (!existing.createdBy && refId(user?._id || result.createdBy)) {
      existing.createdBy = refId(user?._id || result.createdBy);
    }
    await existing.save();
    return existing;
  }

  return Model.create({
    ...payload,
    createdBy: refId(user?._id || result.createdBy),
    status: payload.status || "draft",
  });
}

async function upsertResin(company_id, result, values, user) {
  return upsertSimpleBatchModule({
    Model: ResinQC,
    fieldMap: RESIN_FIELD_MAP,
    company_id,
    result,
    values,
    user,
  });
}

async function upsertHardener(company_id, result, values, user) {
  return upsertSimpleBatchModule({
    Model: HardenerQC,
    fieldMap: HARDENER_FIELD_MAP,
    company_id,
    result,
    values,
    user,
    extra: { category: result.productCategory || "Hardeners" },
  });
}

async function upsertLms(company_id, result, values, user) {
  const productType = resolveLmsProductType(result.module, result.productCategory);
  const { direct, physicalTests, chemicalTests, testResults } = valuesToMixedMaps(values, LMS_FIELD_MAP);

  const payload = {
    company_id,
    productType,
    batchNo: result.batchNo,
    productName: result.productName || "",
    grade: result.grade || "",
    testDate: result.testDate ? new Date(result.testDate) : new Date(),
    remarks: result.remarks || "",
    color: direct.color || "",
    transparency: direct.transparency || "",
    viscosity: direct.viscosity,
    viscosityUnit: direct.viscosityUnit || "cP",
    gelTime: direct.gelTime,
    gelTimeUnit: direct.gelTimeUnit || "min",
    physicalTests,
    chemicalTests,
    testResults,
    ...workflowFields(result, user),
  };

  const existing = await findExistingModuleDoc(LMSQC, company_id, result, { productType });
  if (existing) {
    Object.assign(existing, payload);
    if (!existing.createdBy && refId(user?._id || result.createdBy)) {
      existing.createdBy = refId(user?._id || result.createdBy);
    }
    await existing.save();
    return existing;
  }

  return LMSQC.create({
    ...payload,
    createdBy: refId(user?._id || result.createdBy),
    status: payload.status || "draft",
  });
}

async function upsertPackaging(company_id, result, values, user) {
  const testParameters = {};
  const inspectionResults = {};
  for (const v of values) {
    const code = v?.test?.code;
    if (!code) continue;
    testParameters[code] = v.value;
  }

  const payload = {
    company_id,
    materialType: result.productCategory || "General",
    materialName: result.productName || result.batchNo,
    batchNo: result.batchNo,
    testDate: result.testDate ? new Date(result.testDate) : new Date(),
    supplier: String(result.operator || "").trim() || "Not specified",
    testParameters,
    inspectionResults,
    remarks: result.remarks || "",
    status: qcStatusToPackaging(result.status),
    approvedAt: result.approvedAt,
    rejectedAt: result.rejectedAt,
    rejectionNotes: result.rejectionReason || "",
    approvedBy: refId(result.approvedBy),
    updatedBy: refId(user?._id || result.updatedBy),
    isActive: result.isActive !== false,
  };

  const existing = await findExistingModuleDoc(PackagingMaterialQC, company_id, result);
  if (existing) {
    Object.assign(existing, payload);
    if (!existing.createdBy && refId(user?._id || result.createdBy)) {
      existing.createdBy = refId(user?._id || result.createdBy);
    }
    await existing.save();
    return existing;
  }

  return PackagingMaterialQC.create({
    ...payload,
    createdBy: refId(user?._id || result.createdBy),
  });
}

async function upsertQABottleFilling(company_id, result, values, user) {
  const hourlyExtras = {};
  for (const v of values) {
    const code = v?.test?.code;
    if (code) hourlyExtras[code] = v.value;
  }

  const hourlyRow = {
    batchNo: result.batchNo,
    productName: result.productName || "",
    grade: result.grade || "",
    ...hourlyExtras,
  };

  const payload = {
    company_id,
    date: result.testDate ? new Date(result.testDate) : new Date(),
    operator: String(result.operator || "").trim() || "Unknown",
    shift: String(result.shift || "").trim() || "Day",
    machineName: result.productName || "",
    machineId: result.productCategory || "",
    remarks: result.remarks || "",
    ...workflowFields(result, user),
  };

  let existing = null;
  if (result.sourceEntityId) {
    existing = await QABottleFilling.findOne({ _id: result.sourceEntityId, company_id });
  }
  if (!existing) {
    existing = await QABottleFilling.findOne({
      company_id,
      date: payload.date,
      operator: payload.operator,
      shift: payload.shift,
      isActive: true,
    }).sort({ updatedAt: -1 });
  }

  if (existing) {
    const records = Array.isArray(existing.hourlyRecords) ? [...existing.hourlyRecords] : [];
    const idx = records.findIndex((r) => String(r?.batchNo || "").trim() === String(result.batchNo || "").trim());
    if (idx >= 0) {
      records[idx] = { ...(typeof records[idx].toObject === "function" ? records[idx].toObject() : records[idx]), ...hourlyRow };
    } else {
      records.push(hourlyRow);
    }
    Object.assign(existing, payload, { hourlyRecords: records });
    if (!existing.createdBy && refId(user?._id || result.createdBy)) {
      existing.createdBy = refId(user?._id || result.createdBy);
    }
    await existing.save();
    return existing;
  }

  return QABottleFilling.create({
    ...payload,
    hourlyRecords: [hourlyRow],
    createdBy: refId(user?._id || result.createdBy),
    status: payload.status || "draft",
  });
}

const RAW_MATERIAL_CATEGORIES = new Set(["CEMENT", "SAND", "POLYMER", "ADDITIVE", "FILLER", "PIGMENT", "OTHER"]);

async function resolveOrCreateRawMaterial(company_id, result, user) {
  const name = String(result.productName || "").trim();
  const categoryRaw = String(result.productCategory || "OTHER").toUpperCase();
  const category = RAW_MATERIAL_CATEGORIES.has(categoryRaw) ? categoryRaw : "OTHER";

  if (name) {
    const byName = await RawMaterial.findOne({ company_id, materialName: name, isActive: true });
    if (byName) return byName;
  }

  const codeHint = String(result.productCategory || "").trim();
  if (codeHint && codeHint !== category) {
    const byCode = await RawMaterial.findOne({ company_id, materialCode: codeHint, isActive: true });
    if (byCode) return byCode;
  }

  const materialCode = `RM-${String(result.batchNo || Date.now())
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 24)}`;
  const existingCode = await RawMaterial.findOne({ company_id, materialCode });
  if (existingCode) return existingCode;

  return RawMaterial.create({
    company_id,
    materialCode,
    materialName: name || materialCode,
    category,
    createdBy: refId(user?._id || result.createdBy),
  });
}

async function upsertRawMaterial(company_id, result, values, user) {
  const material = await resolveOrCreateRawMaterial(company_id, result, user);
  const mapped = qcStatusToRawMaterial(result.status);
  const testResults = {};
  for (const v of values) {
    const code = v?.test?.code;
    if (!code) continue;
    testResults[code] = {
      testId: refId(v.test),
      code,
      value: v.value,
      unit: v.unit || "",
    };
  }

  const payload = {
    company_id,
    rawMaterial: material._id,
    batchNo: String(result.batchNo).trim(),
    receiptDate: result.testDate ? new Date(result.testDate) : new Date(),
    quantity: 1,
    unit: material.unit || "kg",
    remainingQuantity: 1,
    remarks: result.remarks || "",
    status: mapped.status,
    qcTested: mapped.qcTested || Object.keys(testResults).length > 0,
    qcTestResult: mapped.qcTestResult,
    qcTestDate: result.testDate ? new Date(result.testDate) : new Date(),
    rejectionReason: result.rejectionReason || "",
    coa: {
      testResults,
      approved: mapped.coaApproved,
      approvedAt: mapped.coaApproved ? result.approvedAt || new Date() : undefined,
      approvedBy: mapped.coaApproved ? refId(result.approvedBy) : undefined,
    },
    updatedBy: refId(user?._id || result.updatedBy),
    isActive: result.isActive !== false,
  };

  let existing = null;
  if (result.sourceEntityId) {
    existing = await RawMaterialBatch.findOne({ _id: result.sourceEntityId, company_id });
  }
  if (!existing) {
    existing = await RawMaterialBatch.findOne({
      company_id,
      rawMaterial: material._id,
      batchNo: payload.batchNo,
      isActive: true,
    });
  }

  if (existing) {
    const prevQty = existing.quantity;
    const prevRemaining = existing.remainingQuantity;
    Object.assign(existing, {
      ...payload,
      quantity: prevQty || payload.quantity,
      remainingQuantity: prevRemaining ?? payload.remainingQuantity,
      coa: {
        ...(existing.coa?.toObject?.() || existing.coa || {}),
        ...payload.coa,
        testResults: {
          ...(existing.coa?.testResults || {}),
          ...testResults,
        },
      },
    });
    if (!existing.createdBy && refId(user?._id || result.createdBy)) {
      existing.createdBy = refId(user?._id || result.createdBy);
    }
    await existing.save();
    return existing;
  }

  return RawMaterialBatch.create({
    ...payload,
    createdBy: refId(user?._id || result.createdBy),
  });
}

async function upsertRndTrial(company_id, result, values, user) {
  const trial = parseTrialCode(result);
  const testResults = {};
  const parameters = {};
  for (const v of values) {
    const code = v?.test?.code;
    if (!code) continue;
    testResults[code] = v.value;
  }

  const payload = {
    company_id,
    productFolder: trial.productFolder,
    trialBatchNo: trial.trialBatchNo,
    fullTrialCode: trial.fullTrialCode,
    productName: result.productName || result.batchNo,
    targetGrade: result.grade || "",
    trialDate: result.testDate ? new Date(result.testDate) : new Date(),
    parameters,
    testResults,
    observations: result.remarks || "",
    status: qcStatusToRnd(result.status),
    updatedBy: refId(user?._id || result.updatedBy),
    isActive: result.isActive !== false,
  };

  let existing = null;
  if (result.sourceEntityId) {
    existing = await RDTrialBatch.findOne({ _id: result.sourceEntityId, company_id });
  }
  if (!existing && trial.fullTrialCode) {
    existing = await RDTrialBatch.findOne({
      company_id,
      fullTrialCode: trial.fullTrialCode,
      isActive: true,
    }).sort({ updatedAt: -1 });
  }

  if (existing) {
    Object.assign(existing, payload);
    if (!existing.createdBy && refId(user?._id || result.createdBy)) {
      existing.createdBy = refId(user?._id || result.createdBy);
    }
    await existing.save();
    return existing;
  }

  return RDTrialBatch.create({
    ...payload,
    createdBy: refId(user?._id || result.createdBy),
  });
}

const MODULE_UPSERTERS = {
  RESIN: upsertResin,
  HARDENER: upsertHardener,
  LMS: upsertLms,
  LMS_RESIN: upsertLms,
  LMS_HARDENER: upsertLms,
  LMS_FLOORING: upsertLms,
  PACKAGING: upsertPackaging,
  QA_BOTTLE_FILLING: upsertQABottleFilling,
  RND_TRIAL: upsertRndTrial,
  RAW_MATERIAL: upsertRawMaterial,
};

/**
 * Upsert the linked Site module record for a QCResult.
 * Updates QCResult.sourceEntityType / sourceEntityId when a link is created.
 */
async function upsertModuleFromQCResult({ company_id, result, user }) {
  const plain = typeof result.toObject === "function" ? result.toObject() : result;
  const module = String(plain.module || "").toUpperCase();
  const upsert = MODULE_UPSERTERS[module];
  if (!upsert) return null;

  const values = await ensureValuesPopulated(plain.values || []);
  const moduleDoc = await upsert(company_id, plain, values, user);
  if (!moduleDoc?._id || !plain._id) return moduleDoc;

  await QCResult.updateOne(
    { _id: plain._id, company_id },
    {
      sourceEntityType: MODULE_TO_ENTITY[module] || "",
      sourceEntityId: moduleDoc._id,
      updatedBy: refId(user?._id || plain.updatedBy),
    }
  );

  return moduleDoc;
}

module.exports = {
  upsertModuleFromQCResult,
  MODULE_UPSERTERS,
  MODULE_TO_ENTITY,
  LMS_MODULES,
};
