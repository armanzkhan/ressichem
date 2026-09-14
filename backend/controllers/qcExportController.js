const QCResult = require("../models/QCResult");
const QCTest = require("../models/QCTest");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function csvEscape(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/qc/exports/results.csv
 * - Default format: long (Power BI friendly)
 *   columns: batchNo, testCode, testName, value, numericValue, unit, ...
 */
exports.exportResultsCsv = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { system, module, productCategory, productName, grade, status, from, to, format = "long" } = req.query;

    const filter = { company_id, isActive: true };
    if (system) filter.system = String(system);
    if (module) filter.module = String(module);
    if (productCategory) filter.productCategory = String(productCategory);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (status) filter.status = String(status);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const results = await QCResult.find(filter).sort({ testDate: -1 }).limit(50000).lean();

    // Build lookup for test metadata
    const testIds = new Set();
    for (const r of results) {
      for (const v of r.values || []) {
        if (v?.test) testIds.add(String(v.test));
      }
    }
    const tests = await QCTest.find({ company_id, _id: { $in: Array.from(testIds) } }).lean();
    const byId = new Map(tests.map((t) => [String(t._id), t]));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qc_results_${Date.now()}.csv"`);

    if (String(format).toLowerCase() !== "long") {
      return res.status(400).send("Only format=long is implemented right now.");
    }

    const header = [
      "company_id",
      "system",
      "module",
      "productCategory",
      "productName",
      "grade",
      "batchNo",
      "testDate",
      "status",
      "testCode",
      "testName",
      "value",
      "numericValue",
      "unit",
      "valueNotes",
      "remarks",
    ];
    res.write(header.join(",") + "\n");

    for (const r of results) {
      for (const v of r.values || []) {
        const t = byId.get(String(v.test)) || {};
        const row = [
          r.company_id,
          r.system,
          r.module,
          r.productCategory,
          r.productName,
          r.grade,
          r.batchNo,
          r.testDate ? new Date(r.testDate).toISOString() : "",
          r.status,
          t.code || "",
          t.name || "",
          v.value,
          v.numericValue,
          v.unit || t.unit || "",
          v.notes || "",
          r.remarks || "",
        ].map(csvEscape);
        res.write(row.join(",") + "\n");
      }
    }

    res.end();
  } catch (err) {
    console.error("QC export error:", err);
    res.status(500).json({ success: false, message: "Export failed", error: err.message });
  }
};


