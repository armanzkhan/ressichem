const path = require("path");
const { writeExportFiles } = require("../utils/qcHubPowerBIExport");

function isEnabled() {
  return String(process.env.QC_HUB_EXPORT_SCHEDULE_ENABLED || "").toLowerCase() === "true";
}

async function runScheduledExport() {
  const company_id = process.env.QC_HUB_EXPORT_COMPANY_ID || process.env.COMPANY_ID || "RESSICHEM";
  const exportDir = process.env.QC_HUB_EXPORT_DIR || path.join(__dirname, "..", "exports", "qc-hub");
  const status = process.env.QC_HUB_EXPORT_STATUS || "approved";

  try {
    const result = await writeExportFiles(company_id, { exportDir, status });
    console.log(
      `✅ QC Hub scheduled export complete (${result.batchCount} batches) → ${path.basename(result.csvPath)}, ${path.basename(result.xlsxPath)}`
    );
    return result;
  } catch (err) {
    console.error("❌ QC Hub scheduled export failed:", err.message);
    throw err;
  }
}

function initializeQcHubExportScheduler() {
  if (!isEnabled()) return;

  const hours = Math.max(1, Number(process.env.QC_HUB_EXPORT_INTERVAL_HOURS || 24));
  const intervalMs = hours * 60 * 60 * 1000;

  // Run once shortly after startup, then on interval
  setTimeout(() => {
    runScheduledExport().catch(() => {});
  }, 5000);

  setInterval(() => {
    runScheduledExport().catch(() => {});
  }, intervalMs);

  console.log(`✅ QC Hub Power BI export scheduler enabled every ${hours}h`);
}

module.exports = { initializeQcHubExportScheduler, runScheduledExport, isEnabled };
