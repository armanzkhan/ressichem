const QCHubPlanItem = require("../models/QCHubPlanItem");
const { writeAudit } = require("../utils/qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { planGroup = "DRY_MORTAR", productType, active = "true" } = req.query;

    const filter = { company_id, planGroup: String(planGroup) };
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (productType) filter.productType = String(productType);

    const items = await QCHubPlanItem.find(filter).sort({ productType: 1, testName: 1 }).populate("test").lean();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing QC Hub plan", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const payload = req.body || {};
    if (!payload.testName) return res.status(400).json({ success: false, message: "testName is required" });

    const doc = await QCHubPlanItem.create({
      company_id,
      planGroup: payload.planGroup || "DRY_MORTAR",
      productType: payload.productType || "",
      testName: String(payload.testName).trim(),
      methodRef: payload.methodRef || "",
      frequency: payload.frequency || "",
      requirement: payload.requirement || "",
      test: payload.test,
      unit: payload.unit || "",
      isActive: payload.isActive !== undefined ? !!payload.isActive : true,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubPlanItem",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
      meta: { hub: true, entity: "QCHubPlanItem" },
    });

    const populated = await QCHubPlanItem.findById(doc._id).populate("test");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    const status = err?.code === 11000 ? 409 : 500;
    res.status(status).json({ success: false, message: "Error creating plan item", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const payload = req.body || {};

    const before = await QCHubPlanItem.findOne({ _id: id, company_id });
    if (!before) return res.status(404).json({ success: false, message: "Plan item not found" });

    const after = await QCHubPlanItem.findOneAndUpdate(
      { _id: id, company_id },
      { ...payload, updatedBy: req.user?._id },
      { new: true }
    ).populate("test");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubPlanItem",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true, entity: "QCHubPlanItem" },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating plan item", error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const before = await QCHubPlanItem.findOne({ _id: id, company_id });
    if (!before) return res.status(404).json({ success: false, message: "Plan item not found" });

    const after = await QCHubPlanItem.findOneAndUpdate(
      { _id: id, company_id },
      { isActive: false, updatedBy: req.user?._id },
      { new: true }
    ).populate("test");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubPlanItem",
      entityId: after._id,
      action: "DELETE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true, entity: "QCHubPlanItem", softDelete: true },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting plan item", error: err.message });
  }
};


