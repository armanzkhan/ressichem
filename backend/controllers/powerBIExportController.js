const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const LMSQC = require("../models/LMSQC");
const QABottleFilling = require("../models/QABottleFilling");
const RDTrialBatch = require("../models/RDTrialBatch");
const QCResult = require("../models/QCResult");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

// SRS Section 6 - Power BI Integration
// Export cleaned, column-aligned batch datasets
// Time-series QC values
// R&D trial data
// QA logs

// Export Resin QC data for Power BI
exports.exportResinQC = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await ResinQC.find(filter)
      .sort({ testDate: 1 })
      .select("batchNo productName grade testDate color transparency eew gelTime viscosity mixViscosity exothermicTemperature hycl solidContent remarks")
      .lean();

    // Power BI-friendly format (column-aligned)
    const powerBIData = records.map((r) => ({
      Date: r.testDate,
      BatchNo: r.batchNo,
      ProductName: r.productName,
      Grade: r.grade,
      Color: r.color,
      Transparency: r.transparency,
      EEW: r.eew,
      GelTime_Min: r.gelTime,
      Viscosity_cP: r.viscosity,
      MixViscosity_cP: r.mixViscosity,
      ExothermicTemperature_C: r.exothermicTemperature,
      HyCl_ppm: r.hycl,
      SolidContent_Percent: r.solidContent,
      Remarks: r.remarks || "",
    }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="resin-qc-powerbi-${Date.now()}.json"`);
    res.json({ success: true, data: powerBIData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting Resin QC data", error: err.message });
  }
};

// Export Hardener QC data for Power BI
exports.exportHardenerQC = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await HardenerQC.find(filter)
      .sort({ testDate: 1 })
      .select("batchNo productName grade category testDate color transparency amineValue gelTime viscosity mixViscosity exothermicTemperature solidContent remarks")
      .lean();

    const powerBIData = records.map((r) => ({
      Date: r.testDate,
      BatchNo: r.batchNo,
      ProductName: r.productName,
      Grade: r.grade,
      Category: r.category,
      Color: r.color,
      Transparency: r.transparency,
      AmineValue_mgKOHg: r.amineValue,
      GelTime_Min: r.gelTime,
      Viscosity_cP: r.viscosity,
      MixViscosity_cP: r.mixViscosity,
      ExothermicTemperature_C: r.exothermicTemperature,
      SolidContent_Percent: r.solidContent,
      Remarks: r.remarks || "",
    }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="hardener-qc-powerbi-${Date.now()}.json"`);
    res.json({ success: true, data: powerBIData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting Hardener QC data", error: err.message });
  }
};

// Export Time-series QC values (SRS Section 6)
exports.exportTimeSeriesQC = async (req, res) => {
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

    const records = await QCResult.find(filter)
      .sort({ testDate: 1 })
      .populate("values.test")
      .lean();

    // Time-series format for Power BI
    const timeSeriesData = [];
    records.forEach((record) => {
      record.values.forEach((value) => {
        timeSeriesData.push({
          Date: record.testDate,
          BatchNo: record.batchNo,
          Module: record.module,
          ProductName: record.productName,
          Grade: record.grade,
          TestName: value.test?.name || "",
          TestCode: value.test?.code || "",
          Value: value.numericValue || value.value,
          Unit: value.unit || value.test?.unit || "",
          Notes: value.notes || "",
        });
      });
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="timeseries-qc-powerbi-${Date.now()}.json"`);
    res.json({ success: true, data: timeSeriesData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting time-series QC data", error: err.message });
  }
};

// Export R&D trial data (SRS Section 6)
exports.exportRDTrialData = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productFolder, from, to } = req.query;

    const filter = { company_id, isActive: true };
    if (productFolder) filter.productFolder = String(productFolder);

    if (from || to) {
      filter.trialDate = {};
      if (from) filter.trialDate.$gte = new Date(from);
      if (to) filter.trialDate.$lte = new Date(to);
    }

    const records = await RDTrialBatch.find(filter)
      .sort({ trialDate: 1 })
      .select("productFolder trialBatchNo productName productType targetGrade trialDate parameters testResults costPerUnit costUnit performanceCostRatio status")
      .lean();

    const powerBIData = records.map((r) => ({
      Date: r.trialDate,
      ProductFolder: r.productFolder,
      TrialBatchNo: r.trialBatchNo,
      ProductName: r.productName,
      ProductType: r.productType,
      TargetGrade: r.targetGrade,
      CostPerUnit: r.costPerUnit,
      CostUnit: r.costUnit,
      PerformanceCostRatio: r.performanceCostRatio,
      Status: r.status,
      Parameters: JSON.stringify(r.parameters),
      TestResults: JSON.stringify(r.testResults),
    }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="rd-trials-powerbi-${Date.now()}.json"`);
    res.json({ success: true, data: powerBIData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting R&D trial data", error: err.message });
  }
};

// Export QA logs (SRS Section 6)
exports.exportQALogs = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await QABottleFilling.find(filter)
      .sort({ date: 1 })
      .select("date operator shift machineId machineName hourlyRecords totalBatches totalWeight")
      .lean();

    // Flatten hourly records for Power BI
    const powerBIData = [];
    records.forEach((record) => {
      record.hourlyRecords.forEach((hourly) => {
        powerBIData.push({
          Date: record.date,
          Hour: hourly.hour,
          Operator: record.operator,
          Shift: record.shift,
          MachineId: record.machineId,
          MachineName: record.machineName,
          BatchNo: hourly.batchNo,
          Grade: hourly.grade,
          DrumIbcNo: hourly.drumIbcNo,
          ProductName: hourly.productName,
          KitSize: hourly.kitSize,
          CartonLabeling: hourly.cartonLabeling,
          Weight: hourly.weight,
          WeightUnit: hourly.weightUnit,
          Stacking: hourly.stacking,
          Remarks: hourly.remarks || "",
        });
      });
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="qa-logs-powerbi-${Date.now()}.json"`);
    res.json({ success: true, data: powerBIData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting QA logs", error: err.message });
  }
};

// Combined export (all data types)
exports.exportAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { from, to } = req.query;

    const [resinData, hardenerData, timeSeriesData, rdTrialData, qaLogData] = await Promise.all([
      ResinQC.find({ company_id, isActive: true, status: "approved", ...(from && { testDate: { $gte: new Date(from) } }), ...(to && { testDate: { $lte: new Date(to) } }) }).lean(),
      HardenerQC.find({ company_id, isActive: true, status: "approved", ...(from && { testDate: { $gte: new Date(from) } }), ...(to && { testDate: { $lte: new Date(to) } }) }).lean(),
      QCResult.find({ company_id, isActive: true, status: "approved", ...(from && { testDate: { $gte: new Date(from) } }), ...(to && { testDate: { $lte: new Date(to) } }) }).populate("values.test").lean(),
      RDTrialBatch.find({ company_id, isActive: true, ...(from && { trialDate: { $gte: new Date(from) } }), ...(to && { trialDate: { $lte: new Date(to) } }) }).lean(),
      QABottleFilling.find({ company_id, isActive: true, status: "approved", ...(from && { date: { $gte: new Date(from) } }), ...(to && { date: { $lte: new Date(to) } }) }).lean(),
    ]);

    const exportData = {
      resinQC: resinData,
      hardenerQC: hardenerData,
      timeSeriesQC: timeSeriesData,
      rdTrials: rdTrialData,
      qaLogs: qaLogData,
      exportedAt: new Date(),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="qc-complete-export-powerbi-${Date.now()}.json"`);
    res.json({ success: true, data: exportData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting all data", error: err.message });
  }
};

