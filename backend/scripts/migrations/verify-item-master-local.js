/**
 * Verify Excel Item Master matches MongoDB local procurement items 1:1.
 *
 * Usage:
 *   node scripts/migrations/verify-item-master-local.js "C:/Users/Arman/Downloads/Item Master Data 17-10-26.xlsx"
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const path = require("path");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const ProcurementItem = require("../../models/ProcurementItem");

const COMPANY_ID = process.env.COMPANY_ID || "RESSICHEM";
const DEFAULT_URI =
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

function categoryFromCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return "General";
  if (c.startsWith("P.C")) return "P.C";
  const m = c.match(/^([A-Z]+(?:-[A-Z]+)?)/);
  return m ? m[1] : "General";
}

function norm(s) {
  return String(s ?? "").trim();
}

async function main() {
  const excelPath =
    process.argv[2] ||
    path.join(process.env.USERPROFILE || "", "Downloads", "Item Master Data 17-10-26.xlsx");

  const uri = process.env.MONGODB_URI || process.env.CONNECTION_STRING || process.env.MONGO_URI || DEFAULT_URI;
  await mongoose.connect(uri, { dbName: "Ressichem" });

  const wb = XLSX.readFile(excelPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });

  const excelByCode = new Map();
  const excelDupCodes = [];
  for (const row of rows) {
    const itemCode = norm(row.Code || row.code || row.itemCode);
    const name = norm(row.Name || row.name);
    const description = norm(row["Item Description"] || row.description || name);
    if (!itemCode) continue;
    if (excelByCode.has(itemCode)) excelDupCodes.push(itemCode);
    excelByCode.set(itemCode, { itemCode, name, description, category: categoryFromCode(itemCode) });
  }

  const codes = [...excelByCode.keys()];
  const dbItems = await ProcurementItem.find({
    company_id: COMPANY_ID,
    itemCode: { $in: codes },
  })
    .select("itemCode name description unit category tradeScope isActive")
    .lean();

  const dbByCode = new Map(dbItems.map((d) => [d.itemCode, d]));

  const missingInDb = [];
  const mismatches = [];
  let exactMatches = 0;

  for (const [code, excel] of excelByCode) {
    const db = dbByCode.get(code);
    if (!db) {
      missingInDb.push(code);
      continue;
    }

    const issues = [];
    if (norm(db.name) !== excel.name) issues.push({ field: "name", excel: excel.name, db: db.name });
    if (norm(db.description) !== excel.description) {
      issues.push({ field: "description", excel: excel.description, db: db.description });
    }
    if (norm(db.tradeScope) !== "local") issues.push({ field: "tradeScope", excel: "local", db: db.tradeScope });
    if (db.isActive === false) issues.push({ field: "isActive", excel: true, db: db.isActive });
    if (norm(db.unit) !== "EA") issues.push({ field: "unit", excel: "EA", db: db.unit });
    // category: expected from our mapping rule
    if (norm(db.category) !== excel.category) {
      issues.push({ field: "category", excel: excel.category, db: db.category });
    }

    if (issues.length) mismatches.push({ itemCode: code, issues });
    else exactMatches += 1;
  }

  // DB rows with these codes that shouldn't exist more than once
  const multi = await ProcurementItem.aggregate([
    { $match: { company_id: COMPANY_ID, itemCode: { $in: codes } } },
    { $group: { _id: "$itemCode", n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  const report = {
    excelRows: rows.length,
    excelUniqueCodes: excelByCode.size,
    excelDuplicateCodes: excelDupCodes.length,
    foundInDb: dbItems.length,
    exactMatches,
    missingInDb: missingInDb.length,
    fieldMismatches: mismatches.length,
    duplicateCodesInDb: multi.length,
    matchPercent: excelByCode.size
      ? Number(((exactMatches / excelByCode.size) * 100).toFixed(4))
      : 0,
    sampleMissing: missingInDb.slice(0, 15),
    sampleMismatches: mismatches.slice(0, 15),
  };

  console.log(JSON.stringify(report, null, 2));

  const perfect =
    report.excelUniqueCodes === report.excelRows &&
    report.missingInDb === 0 &&
    report.fieldMismatches === 0 &&
    report.duplicateCodesInDb === 0 &&
    report.exactMatches === report.excelUniqueCodes;

  console.log(perfect ? "\nRESULT: 100% MATCH" : "\nRESULT: NOT 100% — see details above");
  await mongoose.disconnect();
  process.exit(perfect ? 0 : 2);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
