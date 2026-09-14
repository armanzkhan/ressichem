/**
 * Backfill Site module records into QCResult so /qc/site/results shows them.
 *
 * Usage:
 *   node scripts/migrations/backfill-module-qc-results.js RESSICHEM
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const ResinQC = require("../../models/ResinQC");
const HardenerQC = require("../../models/HardenerQC");
const LMSQC = require("../../models/LMSQC");
const { upsertQCResultFromModule } = require("../../utils/syncModuleToQCResult");

async function connect() {
  const uri =
    process.env.MONGO_URI ||
    process.env.CONNECTION_STRING ||
    "mongodb://localhost:27017/Ressichem";
  await mongoose.connect(uri, { dbName: "Ressichem" });
}

async function syncAll(Model, module, sourceEntityType, company_id) {
  const rows = await Model.find({ company_id, isActive: true }).lean();
  let ok = 0;
  let fail = 0;
  for (const doc of rows) {
    try {
      await upsertQCResultFromModule({
        company_id,
        module,
        sourceEntityType,
        doc,
      });
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`  ✗ ${sourceEntityType} ${doc.batchNo}:`, err.message);
    }
  }
  console.log(`✅ ${sourceEntityType}: synced ${ok}/${rows.length}${fail ? ` (${fail} failed)` : ""}`);
}

async function main() {
  const company_id = process.argv[2] || "RESSICHEM";
  await connect();
  console.log("Connected. Backfilling module → QCResult for", company_id);

  await syncAll(ResinQC, "RESIN", "ResinQC", company_id);
  await syncAll(HardenerQC, "HARDENER", "HardenerQC", company_id);
  await syncAll(LMSQC, "LMS", "LMSQC", company_id);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
