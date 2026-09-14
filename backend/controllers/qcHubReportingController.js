const QCHubBatchRecord = require("../models/QCHubBatchRecord");
const QCHubFormSubmission = require("../models/QCHubFormSubmission");
const RawMaterialBatch = require("../models/RawMaterialBatch");
const PackagingMaterialQC = require("../models/PackagingMaterialQC");
const RDExperiment = require("../models/RDExperiment");
const Formulation = require("../models/Formulation");
const InternalAudit = require("../models/InternalAudit");
const NCR = require("../models/NCR");
const CAPA = require("../models/CAPA");
const Complaint = require("../models/Complaint");
const { getAllModules } = require("../utils/qcHubDryMortarSrs");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

/** SRS 3.6 — QC summary reports by batch and product */
exports.getQcSummary = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, productName, from, to } = req.query;
    const filter = { company_id, isActive: true };
    if (module) filter.module = String(module);
    if (productName) filter.productName = { $regex: productName, $options: "i" };
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await QCHubBatchRecord.find(filter).sort({ testDate: -1 }).limit(5000).lean();
    const byProduct = {};
    for (const r of records) {
      const key = `${r.module}|${r.productName}|${r.grade || ""}`;
      if (!byProduct[key]) {
        byProduct[key] = { module: r.module, productName: r.productName, grade: r.grade, total: 0, approved: 0, rejected: 0, batches: [] };
      }
      byProduct[key].total++;
      if (r.status === "approved") byProduct[key].approved++;
      if (r.status === "rejected") byProduct[key].rejected++;
      byProduct[key].batches.push({ batchNo: r.batchNo, testDate: r.testDate, status: r.status });
    }

    res.json({ success: true, data: { records, byProduct: Object.values(byProduct) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS 3.6 — QA audit reports */
exports.getQaAuditReport = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;
    const filter = { company_id, isActive: true };
    if (from || to) {
      filter.auditDate = {};
      if (from) filter.auditDate.$gte = new Date(from);
      if (to) filter.auditDate.$lte = new Date(to);
    }

    const [audits, ncrs, capas] = await Promise.all([
      InternalAudit.find(filter).sort({ auditDate: -1 }).lean(),
      NCR.find({ company_id, isActive: true }).sort({ detectedDate: -1 }).limit(100).lean(),
      CAPA.find({ company_id, isActive: true }).sort({ identifiedDate: -1 }).limit(100).lean(),
    ]);

    res.json({ success: true, data: { audits, ncrs, capas, summary: { totalAudits: audits.length, openFindings: audits.reduce((s, a) => s + (a.findings || []).filter((f) => f.status === "OPEN").length, 0) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS 3.6 — Raw material inspection reports */
exports.getRawMaterialReport = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to, status } = req.query;
    const filter = { company_id, isActive: true };
    if (status) filter.status = status;
    if (from || to) {
      filter.receiptDate = {};
      if (from) filter.receiptDate.$gte = new Date(from);
      if (to) filter.receiptDate.$lte = new Date(to);
    }

    const batches = await RawMaterialBatch.find(filter)
      .populate("rawMaterial", "materialName materialCode supplier")
      .sort({ receiptDate: -1 })
      .limit(5000)
      .lean();
    const bySupplier = {};
    for (const b of batches) {
      const sup = b.rawMaterial?.supplier?.supplierName || b.rawMaterial?.supplierName || "Unknown";
      if (!bySupplier[sup]) bySupplier[sup] = { supplier: sup, total: 0, approved: 0, rejected: 0 };
      bySupplier[sup].total++;
      if (b.qcTestResult === "PASS" || b.status === "IN_STOCK") bySupplier[sup].approved++;
      if (b.status === "REJECTED" || b.qcTestResult === "FAIL") bySupplier[sup].rejected++;
    }

    res.json({ success: true, data: { batches, supplierPerformance: Object.values(bySupplier) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS 3.6 — R&D trial history reports */
exports.getRndTrialReport = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const experiments = await RDExperiment.find({ company_id, isActive: true }).sort({ createdAt: -1 }).populate("referenceFormulation", "formulationCode productName").lean();
    res.json({ success: true, data: experiments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS 3.6 — Product comparison reports */
exports.getProductComparison = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productName, module, batchNos } = req.query;
    if (!productName) return res.status(400).json({ success: false, message: "productName is required" });

    const filter = { company_id, isActive: true, productName: String(productName) };
    if (module) filter.module = String(module);
    if (batchNos) filter.batchNo = { $in: String(batchNos).split(",").map((s) => s.trim()) };

    const records = await QCHubBatchRecord.find(filter).sort({ testDate: -1 }).lean();
    const formulations = await Formulation.find({ company_id, isActive: true, productName: String(productName) }).lean();

    res.json({ success: true, data: { records, formulations, comparisonCount: records.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS 3.2.1 — Traceability report */
exports.getTraceability = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { batchNo } = req.query;
    if (!batchNo) return res.status(400).json({ success: false, message: "batchNo is required" });

    const [batchRecords, forms, complaints, ncrs, capas] = await Promise.all([
      QCHubBatchRecord.find({ company_id, isActive: true, batchNo: String(batchNo) }).lean(),
      QCHubFormSubmission.find({ company_id, isActive: true, batchNo: String(batchNo) }).lean(),
      Complaint.find({ company_id, isActive: true, batchNo: String(batchNo) }).lean(),
      NCR.find({ company_id, isActive: true, relatedBatchNo: String(batchNo) }).lean(),
      CAPA.find({ company_id, isActive: true, $or: [{ relatedBatchNo: String(batchNo) }, { "sourceReference.batchNo": String(batchNo) }] }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        batchNo,
        batchRecords,
        rawDataForms: forms,
        complaints,
        ncrs,
        capas,
        modules: getAllModules(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Packaging material inspection report */
exports.getPackagingReport = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to, status } = req.query;
    const filter = { company_id, isActive: true };
    if (status) filter.status = status;
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await PackagingMaterialQC.find(filter).sort({ testDate: -1 }).limit(5000).lean();
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
