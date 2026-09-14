const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const QCResult = require("../models/QCResult");
const QCStandardCriteria = require("../models/QCStandardCriteria");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

// SRS 3.4.1 - Batch Trend Forecasting
// EEW trend lines, Viscosity change patterns, Gel time variations, Hardener value deviation patterns
exports.getBatchTrends = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productType, productName, grade, parameter, from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    let trends = {};

    // Resin Trends
    if (!productType || productType === "RESIN") {
      const resinRecords = await ResinQC.find(filter)
        .sort({ testDate: 1 })
        .select("testDate batchNo eew gelTime viscosity mixViscosity exothermicTemperature hycl solidContent productName grade")
        .lean();

      trends.resin = {
        eew: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.eew, productName: r.productName, grade: r.grade })),
        gelTime: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.gelTime, productName: r.productName, grade: r.grade })),
        viscosity: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.viscosity, productName: r.productName, grade: r.grade })),
        mixViscosity: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.mixViscosity, productName: r.productName, grade: r.grade })),
        exothermicTemperature: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.exothermicTemperature, productName: r.productName, grade: r.grade })),
        hycl: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.hycl, productName: r.productName, grade: r.grade })),
        solidContent: resinRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.solidContent, productName: r.productName, grade: r.grade })),
      };
    }

    // Hardener Trends
    if (!productType || productType === "HARDENER") {
      const hardenerRecords = await HardenerQC.find(filter)
        .sort({ testDate: 1 })
        .select("testDate batchNo amineValue gelTime viscosity mixViscosity exothermicTemperature solidContent productName grade category")
        .lean();

      trends.hardener = {
        amineValue: hardenerRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.amineValue, productName: r.productName, grade: r.grade, category: r.category })),
        gelTime: hardenerRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.gelTime, productName: r.productName, grade: r.grade, category: r.category })),
        viscosity: hardenerRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.viscosity, productName: r.productName, grade: r.grade, category: r.category })),
        mixViscosity: hardenerRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.mixViscosity, productName: r.productName, grade: r.grade, category: r.category })),
        exothermicTemperature: hardenerRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.exothermicTemperature, productName: r.productName, grade: r.grade, category: r.category })),
        solidContent: hardenerRecords.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.solidContent, productName: r.productName, grade: r.grade, category: r.category })),
      };
    }

    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching batch trends", error: err.message });
  }
};

// SRS 3.4.2 - Abnormality Prediction
// Based on historical values, highlight:
// - Out-of-spec patterns
// - Raw material impact correlations
// - Batch quality risk alerts
exports.getAbnormalityPredictions = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productType, productName, grade, from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const predictions = {
      outOfSpecPatterns: [],
      rawMaterialCorrelations: [],
      batchQualityRisks: [],
    };

    // Get standard criteria for comparison
    const criteria = await QCStandardCriteria.find({
      company_id,
      isActive: true,
      ...(productName && { productName }),
      ...(grade && { grade }),
    }).lean();

    // Analyze Resin data
    if (!productType || productType === "RESIN") {
      const resinRecords = await ResinQC.find(filter).sort({ testDate: -1 }).limit(100).lean();

      resinRecords.forEach((record) => {
        const recordCriteria = criteria.find(
          (c) => c.productName === record.productName && c.grade === record.grade && c.module === "RESIN"
        );

        if (recordCriteria) {
          // Check EEW
          if (record.eew !== undefined && recordCriteria.min !== undefined && recordCriteria.max !== undefined) {
            if (record.eew < recordCriteria.min || record.eew > recordCriteria.max) {
              predictions.outOfSpecPatterns.push({
                type: "RESIN",
                batchNo: record.batchNo,
                parameter: "EEW",
                value: record.eew,
                spec: { min: recordCriteria.min, max: recordCriteria.max },
                date: record.testDate,
                risk: record.eew < recordCriteria.min * 0.9 || record.eew > recordCriteria.max * 1.1 ? "HIGH" : "MEDIUM",
              });
            }
          }

          // Check Viscosity
          if (record.viscosity !== undefined && recordCriteria.min !== undefined && recordCriteria.max !== undefined) {
            if (record.viscosity < recordCriteria.min || record.viscosity > recordCriteria.max) {
              predictions.outOfSpecPatterns.push({
                type: "RESIN",
                batchNo: record.batchNo,
                parameter: "Viscosity",
                value: record.viscosity,
                spec: { min: recordCriteria.min, max: recordCriteria.max },
                date: record.testDate,
                risk: "MEDIUM",
              });
            }
          }
        }

        // Calculate trend-based risk
        const recentRecords = resinRecords.filter((r) => r.productName === record.productName && r.grade === record.grade).slice(0, 10);
        if (recentRecords.length >= 5) {
          const avgEEW = recentRecords.reduce((sum, r) => sum + (r.eew || 0), 0) / recentRecords.length;
          const stdDev = Math.sqrt(
            recentRecords.reduce((sum, r) => sum + Math.pow((r.eew || 0) - avgEEW, 2), 0) / recentRecords.length
          );

          if (record.eew && Math.abs(record.eew - avgEEW) > 2 * stdDev) {
            predictions.batchQualityRisks.push({
              type: "RESIN",
              batchNo: record.batchNo,
              parameter: "EEW",
              value: record.eew,
              average: avgEEW,
              deviation: Math.abs(record.eew - avgEEW),
              date: record.testDate,
              risk: "HIGH",
            });
          }
        }
      });
    }

    // Analyze Hardener data
    if (!productType || productType === "HARDENER") {
      const hardenerRecords = await HardenerQC.find(filter).sort({ testDate: -1 }).limit(100).lean();

      hardenerRecords.forEach((record) => {
        const recordCriteria = criteria.find(
          (c) => c.productName === record.productName && c.grade === record.grade && c.module === "HARDENER"
        );

        if (recordCriteria) {
          // Check Amine Value
          if (record.amineValue !== undefined && recordCriteria.min !== undefined && recordCriteria.max !== undefined) {
            if (record.amineValue < recordCriteria.min || record.amineValue > recordCriteria.max) {
              predictions.outOfSpecPatterns.push({
                type: "HARDENER",
                batchNo: record.batchNo,
                parameter: "Amine Value",
                value: record.amineValue,
                spec: { min: recordCriteria.min, max: recordCriteria.max },
                date: record.testDate,
                risk: "MEDIUM",
              });
            }
          }
        }
      });
    }

    res.json({ success: true, data: predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error generating abnormality predictions", error: err.message });
  }
};

