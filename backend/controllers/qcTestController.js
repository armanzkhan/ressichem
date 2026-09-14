const QCTest = require("../models/QCTest");
const { writeAudit } = require("../utils/qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, active = "true", search } = req.query;

    const filter = { company_id };
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (module) filter.applicableModules = { $in: [String(module)] };
    if (search) {
      const s = String(search);
      filter.$or = [{ code: new RegExp(s, "i") }, { name: new RegExp(s, "i") }];
    }

    const tests = await QCTest.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data: tests });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing tests", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const payload = req.body || {};
    const code = String(payload.code || "").trim().toUpperCase();
    const name = String(payload.name || "").trim();

    if (!code || !name) {
      return res.status(400).json({ success: false, message: "code and name are required" });
    }

    const doc = await QCTest.create({
      company_id,
      code,
      name,
      description: payload.description || "",
      unit: payload.unit || "",
      dataType: payload.dataType || "number",
      suggestedMin: payload.suggestedMin,
      suggestedMax: payload.suggestedMax,
      method: payload.method || "",
      applicableModules: Array.isArray(payload.applicableModules) ? payload.applicableModules : [],
      isActive: payload.isActive !== undefined ? !!payload.isActive : true,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCTest",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    const status = err?.code === 11000 ? 409 : 500;
    res.status(status).json({ success: false, message: "Error creating test", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const payload = req.body || {};

    const before = await QCTest.findOne({ _id: id, company_id });
    if (!before) return res.status(404).json({ success: false, message: "Test not found" });

    const update = { ...payload, updatedBy: req.user?._id };
    if (payload.code) update.code = String(payload.code).trim().toUpperCase();
    if (payload.name) update.name = String(payload.name).trim();

    const after = await QCTest.findOneAndUpdate({ _id: id, company_id }, update, { new: true });

    await writeAudit({
      req,
      company_id,
      entityType: "QCTest",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after: after.toObject(),
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating test", error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;

    const before = await QCTest.findOne({ _id: id, company_id });
    if (!before) return res.status(404).json({ success: false, message: "Test not found" });

    const after = await QCTest.findOneAndUpdate({ _id: id, company_id }, { isActive: false, updatedBy: req.user?._id }, { new: true });

    await writeAudit({
      req,
      company_id,
      entityType: "QCTest",
      entityId: after._id,
      action: "DELETE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { softDelete: true },
    });

    res.json({ success: true, message: "Test deactivated", data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting test", error: err.message });
  }
};


