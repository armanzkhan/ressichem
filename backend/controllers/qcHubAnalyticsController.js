const QCHubBatchRecord = require("../models/QCHubBatchRecord");
const QCHubFormSubmission = require("../models/QCHubFormSubmission");
const RawMaterialBatch = require("../models/RawMaterialBatch");
const RDExperiment = require("../models/RDExperiment");
const NCR = require("../models/NCR");
const CAPA = require("../models/CAPA");
const InternalAudit = require("../models/InternalAudit");
const { TREND_PARAMETERS, getAllModules } = require("../utils/qcHubDryMortarSrs");
const {
  fetchExportData,
  buildCsvContent,
  buildXlsxBuffer,
} = require("../utils/qcHubPowerBIExport");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values, avg) {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

/** SRS 3.4.1 — Batch trend forecasting for Dry Mortar Hub data */
exports.getBatchTrends = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, productName, grade, from, to } = req.query;
    const filter = { company_id, isActive: true, status: "approved" };
    if (module) filter.module = String(module);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await QCHubBatchRecord.find(filter).sort({ testDate: 1 }).lean();
    const trends = {};

    for (const param of TREND_PARAMETERS) {
      trends[param] = records
        .map((r) => {
          const val = r.parameters?.[param];
          const num = val !== undefined && val !== "" ? Number(val) : NaN;
          if (Number.isNaN(num)) return null;
          return {
            date: r.testDate,
            batchNo: r.batchNo,
            value: num,
            productName: r.productName,
            grade: r.grade,
            module: r.module,
          };
        })
        .filter(Boolean);
    }

    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS 3.4.2 — Abnormality prediction */
exports.getAbnormalityAlerts = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, productName, from, to } = req.query;
    const filter = { company_id, isActive: true, status: "approved" };
    if (module) filter.module = String(module);
    if (productName) filter.productName = String(productName);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await QCHubBatchRecord.find(filter).sort({ testDate: 1 }).lean();
    const alerts = [];

    for (const param of TREND_PARAMETERS) {
      const points = records
        .map((r) => {
          const val = r.parameters?.[param];
          const num = val !== undefined && val !== "" ? Number(val) : NaN;
          if (Number.isNaN(num)) return null;
          return { batchNo: r.batchNo, date: r.testDate, value: num, productName: r.productName, module: r.module };
        })
        .filter(Boolean);

      if (points.length < 5) continue;

      const values = points.map((p) => p.value);
      const avg = mean(values);
      const sd = stdDev(values, avg);
      const threshold = sd > 0 ? 2 * sd : avg * 0.1;

      for (const p of points.slice(-10)) {
        const deviation = Math.abs(p.value - avg);
        if (deviation > threshold) {
          alerts.push({
            type: "OUT_OF_SPEC_PATTERN",
            parameter: param,
            batchNo: p.batchNo,
            productName: p.productName,
            module: p.module,
            date: p.date,
            value: p.value,
            historicalMean: Math.round(avg * 1000) / 1000,
            deviation: Math.round(deviation * 1000) / 1000,
            severity: deviation > threshold * 1.5 ? "HIGH" : "MEDIUM",
            message: `${param} for batch ${p.batchNo} deviates from historical mean (${avg.toFixed(2)})`,
          });
        }
      }
    }

    // Raw material correlation hint
    const rmBatches = await RawMaterialBatch.find({ company_id, isActive: true, status: "REJECTED" })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("rawMaterial", "materialName supplier")
      .lean();

    for (const rm of rmBatches) {
      alerts.push({
        type: "RAW_MATERIAL_IMPACT",
        parameter: "rawMaterial",
        batchNo: rm.batchNo,
        productName: rm.rawMaterial?.materialName || "",
        severity: "MEDIUM",
        message: `Rejected raw material batch ${rm.batchNo} may impact finished product quality`,
      });
    }

    res.json({ success: true, data: { alerts, totalAlerts: alerts.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** SRS Section 6 — Power BI export (API + CSV + XLSX) */
exports.exportPowerBI = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { format = "json", module, from, to, status = "approved" } = req.query;

    const data = await fetchExportData(company_id, { module, from, to, status });
    const payload = {
      exportedAt: data.exportedAt,
      system: data.system,
      qcBatchRecords: data.qcBatchRecords,
      qcFormSubmissions: data.formRows.length,
      rndExperiments: data.rndExperiments,
    };

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qc_hub_dry_mortar_${Date.now()}.csv"`);
      return res.send(buildCsvContent(data.qcBatchRecords));
    }

    if (format === "xlsx") {
      const buf = buildXlsxBuffer(data.qcBatchRecords, data.formRows, data.rndExperiments);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="qc_hub_dry_mortar_${Date.now()}.xlsx"`);
      return res.send(buf);
    }

    res.json({ success: true, data: payload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
    }

    const batchFilter = { company_id, isActive: true };
    if (from || to) batchFilter.testDate = dateFilter;

    const [totalBatches, approvedBatches, pendingBatches, openNcrs, openCapas, audits, modules] = await Promise.all([
      QCHubBatchRecord.countDocuments(batchFilter),
      QCHubBatchRecord.countDocuments({ ...batchFilter, status: "approved" }),
      QCHubBatchRecord.countDocuments({ ...batchFilter, status: { $in: ["draft", "submitted"] } }),
      NCR.countDocuments({ company_id, isActive: true, status: { $in: ["OPEN", "UNDER_INVESTIGATION"] } }),
      CAPA.countDocuments({ company_id, isActive: true, status: { $in: ["OPEN", "IN_PROGRESS", "PENDING_APPROVAL"] } }),
      InternalAudit.countDocuments({ company_id, isActive: true }),
      QCHubBatchRecord.aggregate([
        { $match: batchFilter },
        { $group: { _id: "$module", count: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } } } },
      ]),
    ]);

    const moduleStats = getAllModules().map((m) => {
      const stat = modules.find((s) => s._id === m.key);
      return { module: m.key, label: m.label, slug: m.slug, total: stat?.count || 0, approved: stat?.approved || 0 };
    });

    res.json({
      success: true,
      data: {
        totalBatches,
        approvedBatches,
        pendingBatches,
        openNcrs,
        openCapas,
        audits,
        moduleStats,
        approvalRate: totalBatches ? Math.round((approvedBatches / totalBatches) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
