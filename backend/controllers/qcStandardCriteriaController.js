const QCStandardCriteria = require("../models/QCStandardCriteria");
const { writeAudit } = require("../utils/qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { system, module, productCategory, productName, grade, active = "true" } = req.query;

    const filter = { company_id };
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (system) filter.system = String(system);
    if (module) filter.module = String(module);
    if (productCategory) filter.productCategory = String(productCategory);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);

    const rows = await QCStandardCriteria.find(filter).populate("test").sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing standards", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const payload = req.body || {};

    if (!payload.test) return res.status(400).json({ success: false, message: "test is required" });

    const doc = await QCStandardCriteria.create({
      company_id,
      system: payload.system || "QC_SITE_AREA",
      module: payload.module || "",
      productCategory: payload.productCategory || "",
      productName: payload.productName || "",
      grade: payload.grade || "",
      test: payload.test,
      min: payload.min,
      max: payload.max,
      target: payload.target,
      unit: payload.unit || "",
      notes: payload.notes || "",
      effectiveFrom: payload.effectiveFrom || new Date(),
      effectiveTo: payload.effectiveTo,
      isActive: payload.isActive !== undefined ? !!payload.isActive : true,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCStandardCriteria",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    const populated = await QCStandardCriteria.findById(doc._id).populate("test");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    const status = err?.code === 11000 ? 409 : 500;
    res.status(status).json({ success: false, message: "Error creating standard", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const payload = req.body || {};

    const before = await QCStandardCriteria.findOne({ _id: id, company_id });
    if (!before) return res.status(404).json({ success: false, message: "Standard not found" });

    const after = await QCStandardCriteria.findOneAndUpdate(
      { _id: id, company_id },
      { ...payload, updatedBy: req.user?._id },
      { new: true }
    ).populate("test");

    await writeAudit({
      req,
      company_id,
      entityType: "QCStandardCriteria",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after: after.toObject(),
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating standard", error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;

    const before = await QCStandardCriteria.findOne({ _id: id, company_id });
    if (!before) return res.status(404).json({ success: false, message: "Standard not found" });

    const after = await QCStandardCriteria.findOneAndUpdate(
      { _id: id, company_id },
      { isActive: false, updatedBy: req.user?._id },
      { new: true }
    ).populate("test");

    await writeAudit({
      req,
      company_id,
      entityType: "QCStandardCriteria",
      entityId: after._id,
      action: "DELETE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { softDelete: true },
    });

    res.json({ success: true, message: "Standard deactivated", data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting standard", error: err.message });
  }
};


