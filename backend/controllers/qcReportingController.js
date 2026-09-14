const QCResult = require("../models/QCResult");
const Complaint = require("../models/Complaint");
const CAPA = require("../models/CAPA");
const MRM = require("../models/MRM");
const Formulation = require("../models/Formulation");
const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const QABottleFilling = require("../models/QABottleFilling");
const RDTrialBatch = require("../models/RDTrialBatch");
const { compareToSpecs, checkENCompliance } = require("../utils/qcSpecComparison");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Generate QC Certificate (COA)
exports.generateCertificate = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;

    const result = await QCResult.findOne({ _id: id, company_id, isActive: true })
      .populate("values.test")
      .populate("createdBy", "firstName lastName")
      .populate("approvedBy", "firstName lastName")
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    if (result.status !== "approved") {
      return res.status(400).json({ success: false, message: "Only approved results can generate certificates" });
    }

    // Get spec comparison
    const comparison = await compareToSpecs(company_id, result);

    const certificate = {
      certificateNo: `COA-${result.batchNo}-${new Date(result.testDate).getFullYear()}`,
      issueDate: new Date().toISOString(),
      product: {
        name: result.productName,
        category: result.productCategory,
        grade: result.grade,
        batchNo: result.batchNo,
      },
      testResults: comparison.results.map((r) => ({
        testName: r.testName,
        value: r.value,
        numericValue: r.numericValue,
        unit: r.unit,
        standard: r.standard,
        status: r.status,
      })),
      summary: comparison.summary,
      testedBy: result.createdBy ? `${result.createdBy.firstName} ${result.createdBy.lastName}` : "N/A",
      approvedBy: result.approvedBy ? `${result.approvedBy.firstName} ${result.approvedBy.lastName}` : "N/A",
      approvedAt: result.approvedAt,
    };

    return res.json({ success: true, data: certificate });
  } catch (error) {
    console.error("Error generating certificate:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// QC Performance Dashboard
exports.getPerformanceDashboard = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to, productType, grade } = req.query;

    const filter = { company_id, isActive: true };
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }
    if (productType) filter.productCategory = productType;
    if (grade) filter.grade = grade;

    const results = await QCResult.find(filter).lean();

    const totalBatches = results.length;
    const passedBatches = results.filter((r) => r.status === "approved").length;
    const failedBatches = results.filter((r) => r.status === "rejected").length;
    const pendingBatches = results.filter((r) => r.status === "submitted").length;
    const passRate = totalBatches > 0 ? (passedBatches / totalBatches) * 100 : 0;

    // Calculate out-of-spec count
    let outOfSpecCount = 0;
    for (const result of results.filter((r) => r.status === "approved")) {
      const comparison = await compareToSpecs(company_id, result);
      if (!comparison.allPass) outOfSpecCount++;
    }

    // Group by product
    const byProduct = {};
    results.forEach((r) => {
      const key = `${r.productName}-${r.grade}`;
      if (!byProduct[key]) {
        byProduct[key] = { productName: r.productName, grade: r.grade, total: 0, passed: 0, failed: 0 };
      }
      byProduct[key].total++;
      if (r.status === "approved") byProduct[key].passed++;
      if (r.status === "rejected") byProduct[key].failed++;
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalBatches,
          passedBatches,
          failedBatches,
          pendingBatches,
          passRate: Math.round(passRate * 100) / 100,
          outOfSpecCount,
        },
        byProduct: Object.values(byProduct),
        period: { from, to },
      },
    });
  } catch (error) {
    console.error("Error generating performance dashboard:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complaint Dashboard
exports.getComplaintDashboard = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const filter = { company_id, isActive: true };
    if (from || to) {
      filter.receivedDate = {};
      if (from) filter.receivedDate.$gte = new Date(from);
      if (to) filter.receivedDate.$lte = new Date(to);
    }

    const complaints = await Complaint.find(filter).lean();

    const total = complaints.length;
    const byType = {};
    const bySeverity = {};
    const byStatus = {};
    const unresolved = complaints.filter((c) => !["RESOLVED", "CLOSED"].includes(c.status)).length;

    complaints.forEach((c) => {
      byType[c.complaintType] = (byType[c.complaintType] || 0) + 1;
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        summary: { total, unresolved },
        byType,
        bySeverity,
        byStatus,
        period: { from, to },
      },
    });
  } catch (error) {
    console.error("Error generating complaint dashboard:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CAPA Dashboard
exports.getCAPADashboard = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const filter = { company_id, isActive: true };
    if (from || to) {
      filter.identifiedDate = {};
      if (from) filter.identifiedDate.$gte = new Date(from);
      if (to) filter.identifiedDate.$lte = new Date(to);
    }

    const capas = await CAPA.find(filter).lean();

    const total = capas.length;
    const byStatus = {};
    const byPriority = {};
    const overdue = capas.filter((c) => {
      if (!c.targetClosureDate) return false;
      return new Date(c.targetClosureDate) < new Date() && c.status !== "CLOSED";
    }).length;

    capas.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        summary: { total, overdue, open: byStatus.INITIATED + byStatus.ROOT_CAUSE_ANALYSIS + byStatus.PENDING_APPROVAL + byStatus.APPROVED + byStatus.IMPLEMENTATION + byStatus.VERIFICATION || 0 },
        byStatus,
        byPriority,
        period: { from, to },
      },
    });
  } catch (error) {
    console.error("Error generating CAPA dashboard:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// EN Compliance Report
exports.getENComplianceReport = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to, standardCode } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const results = await QCResult.find(filter).lean();

    const complianceData = [];
    for (const result of results) {
      const compliance = await checkENCompliance(company_id, result, standardCode || "EN 12004-1");
      complianceData.push({
        batchNo: result.batchNo,
        productName: result.productName,
        grade: result.grade,
        testDate: result.testDate,
        ...compliance,
      });
    }

    const total = complianceData.length;
    const compliant = complianceData.filter((c) => c.compliant).length;
    const nonCompliant = total - compliant;
    const complianceRate = total > 0 ? (compliant / total) * 100 : 0;

    return res.json({
      success: true,
      data: {
        summary: { total, compliant, nonCompliant, complianceRate: Math.round(complianceRate * 100) / 100 },
        details: complianceData,
        period: { from, to },
        standard: standardCode || "EN 12004-1",
      },
    });
  } catch (error) {
    console.error("Error generating EN compliance report:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Export data (Excel/CSV/PDF format)
exports.exportData = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { type, format, from, to } = req.query; // type: results, complaints, capa, mrm

    // This is a simplified export - full implementation would use libraries like exceljs, pdfkit, etc.
    const exportData = {
      type,
      format: format || "csv",
      period: { from, to },
      generatedAt: new Date().toISOString(),
      data: [],
    };

    switch (type) {
      case "results": {
        const filter = { company_id, isActive: true };
        if (from || to) {
          filter.testDate = {};
          if (from) filter.testDate.$gte = new Date(from);
          if (to) filter.testDate.$lte = new Date(to);
        }
        const results = await QCResult.find(filter).populate("values.test").lean();
        exportData.data = results.map((r) => ({
          batchNo: r.batchNo,
          productName: r.productName,
          grade: r.grade,
          testDate: r.testDate,
          status: r.status,
          values: r.values.map((v) => ({
            test: v.test?.name || "",
            value: v.value,
            unit: v.unit,
          })),
        }));
        break;
      }
      case "complaints": {
        const filter = { company_id, isActive: true };
        if (from || to) {
          filter.receivedDate = {};
          if (from) filter.receivedDate.$gte = new Date(from);
          if (to) filter.receivedDate.$lte = new Date(to);
        }
        const complaints = await Complaint.find(filter).lean();
        exportData.data = complaints;
        break;
      }
      case "capa": {
        const filter = { company_id, isActive: true };
        if (from || to) {
          filter.identifiedDate = {};
          if (from) filter.identifiedDate.$gte = new Date(from);
          if (to) filter.identifiedDate.$lte = new Date(to);
        }
        const capas = await CAPA.find(filter).lean();
        exportData.data = capas;
        break;
      }
      default:
        return res.status(400).json({ success: false, message: "Invalid export type" });
    }

    // For CSV format, return as CSV string
    if (format === "csv" && exportData.data.length > 0) {
      const headers = Object.keys(exportData.data[0]);
      const csvRows = [headers.join(",")];
      exportData.data.forEach((row) => {
        const values = headers.map((h) => {
          const val = row[h];
          if (typeof val === "object") return JSON.stringify(val);
          return String(val || "").replace(/"/g, '""');
        });
        csvRows.push(values.map((v) => `"${v}"`).join(","));
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${type}-export-${Date.now()}.csv"`);
      return res.send(csvRows.join("\n"));
    }

    return res.json({ success: true, data: exportData });
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SRS 3.6 - QC summary reports as per batch & product
exports.getQCSummaryByBatch = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { batchNo, from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (batchNo) filter.batchNo = String(batchNo);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const [resinResults, hardenerResults, qcResults] = await Promise.all([
      ResinQC.find(filter).lean(),
      HardenerQC.find(filter).lean(),
      QCResult.find(filter).populate("values.test").lean(),
    ]);

    const summary = {
      batchNo: batchNo || "ALL",
      period: { from, to },
      resin: {
        total: resinResults.length,
        batches: resinResults.map((r) => ({
          batchNo: r.batchNo,
          productName: r.productName,
          grade: r.grade,
          testDate: r.testDate,
          eew: r.eew,
          viscosity: r.viscosity,
          gelTime: r.gelTime,
        })),
      },
      hardener: {
        total: hardenerResults.length,
        batches: hardenerResults.map((r) => ({
          batchNo: r.batchNo,
          productName: r.productName,
          grade: r.grade,
          testDate: r.testDate,
          amineValue: r.amineValue,
          viscosity: r.viscosity,
          gelTime: r.gelTime,
        })),
      },
      other: {
        total: qcResults.length,
        batches: qcResults.map((r) => ({
          batchNo: r.batchNo,
          module: r.module,
          productName: r.productName,
          grade: r.grade,
          testDate: r.testDate,
          testCount: r.values.length,
        })),
      },
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error generating QC summary by batch:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQCSummaryByProduct = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productName, grade, from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (productName) filter.productName = { $regex: String(productName), $options: "i" };
    if (grade) filter.grade = String(grade);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const [resinResults, hardenerResults, qcResults] = await Promise.all([
      ResinQC.find(filter).lean(),
      HardenerQC.find(filter).lean(),
      QCResult.find(filter).populate("values.test").lean(),
    ]);

    const summary = {
      productName: productName || "ALL",
      grade: grade || "ALL",
      period: { from, to },
      totalBatches: resinResults.length + hardenerResults.length + qcResults.length,
      resin: {
        total: resinResults.length,
        batches: resinResults.map((r) => r.batchNo),
        avgEEW: resinResults.length > 0 ? resinResults.reduce((sum, r) => sum + (r.eew || 0), 0) / resinResults.length : 0,
        avgViscosity: resinResults.length > 0 ? resinResults.reduce((sum, r) => sum + (r.viscosity || 0), 0) / resinResults.length : 0,
      },
      hardener: {
        total: hardenerResults.length,
        batches: hardenerResults.map((r) => r.batchNo),
        avgAmineValue: hardenerResults.length > 0 ? hardenerResults.reduce((sum, r) => sum + (r.amineValue || 0), 0) / hardenerResults.length : 0,
        avgViscosity: hardenerResults.length > 0 ? hardenerResults.reduce((sum, r) => sum + (r.viscosity || 0), 0) / hardenerResults.length : 0,
      },
      other: {
        total: qcResults.length,
        batches: qcResults.map((r) => r.batchNo),
      },
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error generating QC summary by product:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SRS 3.6 - QA audit summary
exports.getQAAuditSummary = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const filter = { company_id, isActive: true };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const qaRecords = await QABottleFilling.find(filter).lean();

    const summary = {
      period: { from, to },
      totalRecords: qaRecords.length,
      byStatus: {},
      byOperator: {},
      byShift: {},
      byMachine: {},
      totalBatches: qaRecords.reduce((sum, r) => sum + (r.totalBatches || 0), 0),
      totalWeight: qaRecords.reduce((sum, r) => sum + (r.totalWeight || 0), 0),
      approved: qaRecords.filter((r) => r.status === "approved").length,
      submitted: qaRecords.filter((r) => r.status === "submitted").length,
      draft: qaRecords.filter((r) => r.status === "draft").length,
    };

    qaRecords.forEach((r) => {
      summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
      summary.byOperator[r.operator] = (summary.byOperator[r.operator] || 0) + 1;
      summary.byShift[r.shift] = (summary.byShift[r.shift] || 0) + 1;
      if (r.machineId) {
        summary.byMachine[r.machineId] = (summary.byMachine[r.machineId] || 0) + 1;
      }
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error generating QA audit summary:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SRS 3.6 - Daily line-wise bottle filling traceability report
exports.getBottleFillingTraceability = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { date, operator, shift, machineId } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (date) filter.date = new Date(date);
    if (operator) filter.operator = String(operator);
    if (shift) filter.shift = String(shift);
    if (machineId) filter.machineId = String(machineId);

    const records = await QABottleFilling.find(filter)
      .sort({ date: 1, operator: 1, shift: 1 })
      .lean();

    // Flatten hourly records for traceability
    const traceability = [];
    records.forEach((record) => {
      record.hourlyRecords.forEach((hourly) => {
        traceability.push({
          date: record.date,
          hour: hourly.hour,
          operator: record.operator,
          shift: record.shift,
          machineId: record.machineId,
          machineName: record.machineName,
          batchNo: hourly.batchNo,
          grade: hourly.grade,
          drumIbcNo: hourly.drumIbcNo,
          productName: hourly.productName,
          kitSize: hourly.kitSize,
          cartonLabeling: hourly.cartonLabeling,
          weight: hourly.weight,
          weightUnit: hourly.weightUnit,
          stacking: hourly.stacking,
          remarks: hourly.remarks || "",
        });
      });
    });

    res.json({ success: true, data: traceability });
  } catch (error) {
    console.error("Error generating bottle filling traceability report:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SRS 3.6 - R&D trial history report
exports.getRDTrialHistory = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productFolder, productName, from, to } = req.query;

    const filter = { company_id, isActive: true };
    if (productFolder) filter.productFolder = String(productFolder);
    if (productName) filter.productName = { $regex: String(productName), $options: "i" };
    if (from || to) {
      filter.trialDate = {};
      if (from) filter.trialDate.$gte = new Date(from);
      if (to) filter.trialDate.$lte = new Date(to);
    }

    const trials = await RDTrialBatch.find(filter)
      .sort({ productFolder: 1, trialBatchNo: 1 })
      .populate("formulation")
      .lean();

    const history = {
      period: { from, to },
      totalTrials: trials.length,
      byProductFolder: {},
      byStatus: {},
      trials: trials.map((t) => ({
        productFolder: t.productFolder,
        trialBatchNo: t.trialBatchNo,
        fullTrialCode: t.fullTrialCode,
        productName: t.productName,
        productType: t.productType,
        targetGrade: t.targetGrade,
        trialDate: t.trialDate,
        status: t.status,
        costPerUnit: t.costPerUnit,
        costUnit: t.costUnit,
        performanceCostRatio: t.performanceCostRatio,
        observations: t.observations,
        conclusions: t.conclusions,
        nextSteps: t.nextSteps,
      })),
    };

    trials.forEach((t) => {
      history.byProductFolder[t.productFolder] = (history.byProductFolder[t.productFolder] || 0) + 1;
      history.byStatus[t.status] = (history.byStatus[t.status] || 0) + 1;
    });

    res.json({ success: true, data: history });
  } catch (error) {
    console.error("Error generating R&D trial history report:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

