/**
 * Import Item Master Excel into Procurement Local catalog.
 *
 * Usage (from backend/):
 *   node scripts/migrations/import-item-master-local.js "C:/Users/Arman/Downloads/Item Master Data 17-10-26.xlsx"
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
  // e.g. FG-EA-..., TI-LI-..., PML-..., RML-..., SFG-..., CS-...
  const m = c.match(/^([A-Z]+(?:-[A-Z]+)?)/);
  return m ? m[1] : "General";
}

async function main() {
  const excelPath =
    process.argv[2] ||
    path.join(process.env.USERPROFILE || "", "Downloads", "Item Master Data 17-10-26.xlsx");

  const uri = process.env.MONGODB_URI || process.env.CONNECTION_STRING || process.env.MONGO_URI || DEFAULT_URI;
  await mongoose.connect(uri, { dbName: "Ressichem" });
  console.log("Connected. Reading:", excelPath);

  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  console.log("Excel rows:", rows.length);

  const existingBefore = await ProcurementItem.countDocuments({
    company_id: COMPANY_ID,
    tradeScope: "local",
  });
  console.log("Existing local items:", existingBefore);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failed = [];
  const categories = new Set();

  // Process in batches for speed
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const ops = [];

    for (const row of chunk) {
      const name = String(row.Name || row.name || "").trim();
      const itemCode = String(row.Code || row.code || row.itemCode || "").trim();
      const description = String(row["Item Description"] || row.description || name).trim();
      if (!name || !itemCode) {
        skipped += 1;
        continue;
      }
      const category = categoryFromCode(itemCode);
      categories.add(category);

      ops.push({
        updateOne: {
          filter: { company_id: COMPANY_ID, itemCode },
          update: {
            $set: {
              name,
              description,
              hsCode: "",
              unit: "EA",
              category,
              tradeScope: "local",
              isActive: true,
            },
            $setOnInsert: {
              company_id: COMPANY_ID,
              itemCode,
            },
          },
          upsert: true,
        },
      });
    }

    if (!ops.length) continue;
    try {
      const result = await ProcurementItem.bulkWrite(ops, { ordered: false });
      created += result.upsertedCount || 0;
      updated += result.modifiedCount || 0;
    } catch (err) {
      failed.push({ batch: i, message: err.message });
      console.error("Batch failed at", i, err.message);
    }

    if ((i / BATCH) % 5 === 0 || i + BATCH >= rows.length) {
      console.log(`Progress ${Math.min(i + BATCH, rows.length)}/${rows.length} (created=${created}, updated=${updated})`);
    }
  }

  const existingAfter = await ProcurementItem.countDocuments({
    company_id: COMPANY_ID,
    tradeScope: "local",
  });

  console.log("\n=== DONE ===");
  console.log({
    excelRows: rows.length,
    created,
    updated,
    skipped,
    failedBatches: failed.length,
    localItemsNow: existingAfter,
    categories: [...categories].sort(),
  });

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
