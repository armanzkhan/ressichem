const mongoose = require("mongoose");
const QCResult = require("../models/QCResult");

const defaultUri = process.env.CONNECTION_STRING || process.env.BACKUP_MONGO_URI;
if (!defaultUri) {
  console.error("Missing CONNECTION_STRING or BACKUP_MONGO_URI");
  process.exit(1);
}

async function run() {
  await mongoose.connect(defaultUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "Ressichem",
  });

  const company_id = process.env.PERF_COMPANY_ID || "RESSICHEM";
  const limit = Number(process.env.PERF_LIMIT || 100000);

  const started = Date.now();
  const rows = await QCResult.find({ company_id, isActive: true })
    .sort({ testDate: -1 })
    .limit(limit)
    .select("batchNo testDate module productCategory productName grade status")
    .lean();
  const elapsedMs = Date.now() - started;

  console.log(`Fetched ${rows.length} rows in ${elapsedMs}ms`);
  if (rows.length >= 100000 && elapsedMs <= 3000) {
    console.log("✅ SRS 4.1 performance target met (100k in <= 3s)");
  } else {
    console.warn("⚠ SRS 4.1 performance target not met");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Performance check failed:", err.message);
  process.exit(1);
});
