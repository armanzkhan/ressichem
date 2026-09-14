const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const QCHubBatchRecord = require("../models/QCHubBatchRecord");
const QCHubFormSubmission = require("../models/QCHubFormSubmission");
const RDExperiment = require("../models/RDExperiment");

function buildPowerBIRows(records) {
  const rows = [];
  for (const r of records) {
    const base = {
      Date: r.testDate,
      Module: r.module,
      Category: r.category,
      ProductName: r.productName,
      Grade: r.grade,
      BatchNo: r.batchNo,
      Status: r.status,
      Remarks: r.remarks || "",
    };
    const params = r.parameters || {};
    const keys = Object.keys(params);
    if (!keys.length) {
      rows.push({ ...base, Parameter: "", Value: "", Unit: "" });
      continue;
    }
    for (const key of keys) {
      rows.push({ ...base, Parameter: key, Value: params[key], Unit: "" });
    }
  }
  return rows;
}

async function fetchExportData(company_id, options = {}) {
  const { module, from, to, status = "approved" } = options;
  const filter = { company_id, isActive: true };
  if (status) filter.status = String(status);
  if (module) filter.module = String(module);
  if (from || to) {
    filter.testDate = {};
    if (from) filter.testDate.$gte = new Date(from);
    if (to) filter.testDate.$lte = new Date(to);
  }

  const [batchRecords, formRows, rndRows] = await Promise.all([
    QCHubBatchRecord.find(filter).sort({ testDate: 1 }).lean(),
    QCHubFormSubmission.find({
      company_id,
      isActive: true,
      planGroup: "DRY_MORTAR",
      ...(status ? { status: String(status) } : {}),
    })
      .sort({ testDate: 1 })
      .lean(),
    RDExperiment.find({ company_id, isActive: true }).sort({ createdAt: -1 }).lean(),
  ]);

  const qcData = buildPowerBIRows(batchRecords);
  const rndExperiments = rndRows.map((e) => ({
    ExperimentCode: e.experimentCode,
    Name: e.experimentName,
    ProductType: e.productType,
    TargetProduct: e.targetProduct,
    Status: e.status,
    TrialCount: (e.trials || []).length,
  }));

  return {
    exportedAt: new Date().toISOString(),
    system: "QC_HUB_DRY_MORTAR",
    qcBatchRecords: qcData,
    formRows,
    rndExperiments,
    batchCount: batchRecords.length,
  };
}

function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsvContent(qcData) {
  const header = ["Date", "Module", "Category", "ProductName", "Grade", "BatchNo", "Parameter", "Value", "Status", "Remarks"];
  const lines = [header.join(",")];
  for (const row of qcData) {
    lines.push(
      [row.Date, row.Module, row.Category, row.ProductName, row.Grade, row.BatchNo, row.Parameter, row.Value, row.Status, row.Remarks]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

function buildXlsxBuffer(qcData, formRows, rndExperiments) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(qcData), "QC_Batch_Data");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      formRows.map((f) => ({
        FormType: f.formType,
        ProductType: f.productType,
        BatchNo: f.batchNo,
        TestDate: f.testDate,
        Status: f.status,
      }))
    ),
    "QC_Forms"
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rndExperiments), "RND_Trials");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

async function writeExportFiles(company_id, options = {}) {
  const exportDir = options.exportDir || path.join(__dirname, "..", "exports", "qc-hub");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const data = await fetchExportData(company_id, options);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `qc_hub_dry_mortar_${company_id}_${ts}`;

  const csvPath = path.join(exportDir, `${base}.csv`);
  const xlsxPath = path.join(exportDir, `${base}.xlsx`);
  const jsonPath = path.join(exportDir, `${base}.json`);

  fs.writeFileSync(csvPath, buildCsvContent(data.qcBatchRecords), "utf8");
  fs.writeFileSync(xlsxPath, buildXlsxBuffer(data.qcBatchRecords, data.formRows, data.rndExperiments));
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        exportedAt: data.exportedAt,
        system: data.system,
        qcBatchRecords: data.qcBatchRecords,
        qcFormSubmissions: data.formRows.length,
        rndExperiments: data.rndExperiments,
      },
      null,
      2
    ),
    "utf8"
  );

  // Keep only the latest N export sets to avoid disk bloat
  const keep = Number(process.env.QC_HUB_EXPORT_KEEP || 14);
  pruneOldExports(exportDir, keep * 3);

  return { csvPath, xlsxPath, jsonPath, batchCount: data.batchCount, exportedAt: data.exportedAt };
}

function pruneOldExports(exportDir, maxFiles) {
  try {
    const files = fs
      .readdirSync(exportDir)
      .filter((f) => f.startsWith("qc_hub_dry_mortar_"))
      .map((f) => ({ f, t: fs.statSync(path.join(exportDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const old of files.slice(maxFiles)) {
      fs.unlinkSync(path.join(exportDir, old.f));
    }
  } catch {
    /* ignore prune errors */
  }
}

module.exports = {
  fetchExportData,
  buildPowerBIRows,
  buildCsvContent,
  buildXlsxBuffer,
  writeExportFiles,
};
