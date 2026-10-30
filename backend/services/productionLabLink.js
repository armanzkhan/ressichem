const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const LMSQC = require("../models/LMSQC");
const QCHubBatchRecord = require("../models/QCHubBatchRecord");
const QCResult = require("../models/QCResult");

const HUB_MODULE_LABEL = {
  TILE_ADHESIVE: "Tile adhesive",
  TILE_GROUT: "Tile grout",
  PREMIX_PLASTER: "Premix plaster",
  SKIM_COAT: "Skim coat",
  REPAIR_MORTAR: "Repair mortar",
  WATERPROOFING: "Waterproofing",
  CRACK_FILLER: "Crack filler",
  SELF_LEVEL_SEALERS: "Self level & sealers",
};

function batchKey(value) {
  return String(value || "").trim().toLowerCase();
}

function summarizeLab(records) {
  if (!records.length) return "none";
  if (records.some((row) => row.status === "rejected")) return "rejected";
  if (records.some((row) => row.status === "approved") && records.every((row) => row.status === "approved")) return "approved";
  if (records.some((row) => row.status === "approved")) return "partial";
  return "pending";
}

function pushRecord(map, batchNo, record) {
  const key = batchKey(batchNo);
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(record);
}

async function loadLabByBatch(company_id, batchNumbers) {
  const keys = [...new Set(batchNumbers.map((value) => String(value || "").trim()).filter(Boolean))];
  const byBatch = new Map();
  if (!keys.length) return byBatch;

  const filter = { company_id, isActive: { $ne: false }, batchNo: { $in: keys } };
  const collation = { locale: "en", strength: 2 };
  const [resin, hardener, lms, hub, results] = await Promise.all([
    ResinQC.find(filter).collation(collation).select("batchNo productName grade status testDate").lean(),
    HardenerQC.find(filter).collation(collation).select("batchNo productName grade status testDate").lean(),
    LMSQC.find(filter).collation(collation).select("batchNo productName grade productType status testDate").lean(),
    QCHubBatchRecord.find(filter).collation(collation).select("batchNo productName grade module status testDate").lean(),
    QCResult.find(filter).collation(collation).select("batchNo productName grade module system status testDate").lean(),
  ]);

  for (const row of resin) {
    pushRecord(byBatch, row.batchNo, {
      id: `resin:${row._id}`,
      batchNo: row.batchNo,
      source: "QC Site",
      lab: "Zepoxy lab",
      area: "Resin",
      productName: row.productName || row.grade || "",
      status: row.status || "draft",
      testDate: row.testDate || null,
      href: "/qc/site/resin",
    });
  }
  for (const row of hardener) {
    pushRecord(byBatch, row.batchNo, {
      id: `hardener:${row._id}`,
      batchNo: row.batchNo,
      source: "QC Site",
      lab: "Zepoxy lab",
      area: "Hardener",
      productName: row.productName || row.grade || "",
      status: row.status || "draft",
      testDate: row.testDate || null,
      href: "/qc/site/hardener",
    });
  }
  for (const row of lms) {
    pushRecord(byBatch, row.batchNo, {
      id: `lms:${row._id}`,
      batchNo: row.batchNo,
      source: "QC Site",
      lab: "Zepoxy lab",
      area: "LMS",
      productName: row.productName || row.grade || "",
      status: row.status || "draft",
      testDate: row.testDate || null,
      href: "/qc/site/lms",
    });
  }
  for (const row of hub) {
    pushRecord(byBatch, row.batchNo, {
      id: `hub:${row._id}`,
      batchNo: row.batchNo,
      source: "QC Hub",
      lab: "Drymix lab",
      area: HUB_MODULE_LABEL[row.module] || "Drymix",
      productName: row.productName || row.grade || "",
      status: row.status || "draft",
      testDate: row.testDate || null,
      href: "/qc/hub",
    });
  }
  for (const row of results) {
    const hub = String(row.system || "") === "QC_HUB";
    const moduleName = String(row.module || "").toUpperCase();
    const existing = byBatch.get(batchKey(row.batchNo)) || [];
    const alreadyListed = existing.some((record) => {
      if (hub && record.source === "QC Hub") return true;
      if (moduleName.includes("RESIN") && record.area === "Resin") return true;
      if (moduleName.includes("HARDENER") && record.area === "Hardener") return true;
      if (moduleName.includes("LMS") && record.area === "LMS") return true;
      return false;
    });
    if (alreadyListed) continue;
    pushRecord(byBatch, row.batchNo, {
      id: `result:${row._id}`,
      batchNo: row.batchNo,
      source: hub ? "QC Hub" : "QC Site",
      lab: hub ? "Drymix lab" : "Zepoxy lab",
      area: row.module || "Result",
      productName: row.productName || row.grade || "",
      status: row.status || "draft",
      testDate: row.testDate || null,
      href: hub ? "/qc/hub" : "/qc/site/results",
    });
  }
  return byBatch;
}

function labForEntry(entry, byBatch) {
  const seen = new Set();
  const labRecords = [];
  for (const value of [entry.batchNumber, entry.finishedBatch, entry.resinBatch, entry.hardenerBatch]) {
    for (const record of byBatch.get(batchKey(value)) || []) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      labRecords.push(record);
    }
  }
  return { labRecords, labStatus: summarizeLab(labRecords) };
}

async function attachLabLinks(company_id, entries) {
  const batches = [];
  for (const entry of entries) {
    batches.push(entry.batchNumber, entry.finishedBatch, entry.resinBatch, entry.hardenerBatch);
  }
  const byBatch = await loadLabByBatch(company_id, batches);
  return entries.map((entry) => ({ ...entry, ...labForEntry(entry, byBatch) }));
}

module.exports = { attachLabLinks, loadLabByBatch, labForEntry, summarizeLab };
