const HardenerQC = require("../models/HardenerQC");
const { writeAudit } = require("../utils/qcAudit");
const {
  upsertQCResultFromModule,
  softDeleteLinkedQCResult,
} = require("../utils/syncModuleToQCResult");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function syncHardenerToResults(company_id, doc, user) {
  try {
    await upsertQCResultFromModule({
      company_id,
      module: "HARDENER",
      sourceEntityType: "HardenerQC",
      doc,
      user,
    });
  } catch (err) {
    console.error("Hardener → QCResult sync failed:", err.message);
  }
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { batchNo, productName, grade, category, status, from, to, page = 1, limit = 20 } = req.query;

    const filter = { company_id, isActive: true };
    if (batchNo) filter.batchNo = String(batchNo);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (category) filter.category = String(category);
    if (status) filter.status = String(status);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await HardenerQC.find(filter)
      .sort({ testDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    const total = await HardenerQC.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing Hardener QC records", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const doc = await HardenerQC.findOne({ _id: id, company_id, isActive: true })
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: "Hardener QC record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching Hardener QC record", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    const doc = await HardenerQC.create({
      company_id,
      batchNo: body.batchNo,
      productName: body.productName || "",
      grade: body.grade || "",
      category: body.category || "Hardeners",
      testDate: body.testDate ? new Date(body.testDate) : new Date(),
      color: body.color || "",
      transparency: body.transparency || "",
      amineValue: body.amineValue,
      amineValueUnit: body.amineValueUnit || "mg KOH/g",
      gelTime: body.gelTime,
      gelTimeUnit: body.gelTimeUnit || "min",
      viscosity: body.viscosity,
      viscosityUnit: body.viscosityUnit || "cP",
      mixViscosity: body.mixViscosity,
      mixViscosityUnit: body.mixViscosityUnit || "cP",
      exothermicTemperature: body.exothermicTemperature,
      exothermicTemperatureUnit: body.exothermicTemperatureUnit || "°C",
      solidContent: body.solidContent,
      solidContentUnit: body.solidContentUnit || "%",
      remarks: body.remarks || "",
      attachments: body.attachments || [],
      createdBy: user?._id,
      status: "draft",
    });

    await writeAudit({
      req,
      company_id,
      entityType: "HardenerQC",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    await syncHardenerToResults(company_id, doc, user);

    const populated = await HardenerQC.findById(doc._id).populate("attachments").lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating Hardener QC record", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const body = req.body || {};

    const before = await HardenerQC.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Hardener QC record not found" });

    if (before.status === "approved") {
      return res.status(400).json({ success: false, message: "Cannot update approved record" });
    }

    const update = { updatedBy: user?._id };
    Object.keys(body).forEach((key) => {
      if (key !== "_id" && key !== "company_id" && body[key] !== undefined) {
        if (key === "testDate") update[key] = new Date(body[key]);
        else update[key] = body[key];
      }
    });

    const after = await HardenerQC.findOneAndUpdate({ _id: id, company_id }, update, { new: true })
      .populate("attachments")
      .lean();

    await writeAudit({
      req,
      company_id,
      entityType: "HardenerQC",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after,
    });

    await syncHardenerToResults(company_id, after, user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating Hardener QC record", error: err.message });
  }
};

// Soft delete
exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const before = await HardenerQC.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Hardener QC record not found" });

    if (before.status === "approved") {
      return res.status(400).json({ success: false, message: "Cannot delete approved record" });
    }

    const beforeData = before.toObject();
    before.isActive = false;
    before.updatedBy = user?._id;
    await before.save();

    await writeAudit({
      req,
      company_id,
      entityType: "HardenerQC",
      entityId: before._id,
      action: "DELETE",
      before: beforeData,
      after: { isActive: false },
    });

    try {
      await softDeleteLinkedQCResult({
        company_id,
        module: "HARDENER",
        sourceEntityType: "HardenerQC",
        sourceEntityId: before._id,
        user,
      });
    } catch (err) {
      console.error("Hardener → QCResult delete sync failed:", err.message);
    }

    res.json({ success: true, data: { _id: before._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting Hardener QC record", error: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const doc = await HardenerQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Hardener QC record not found" });

    if (doc.status !== "draft") {
      return res.status(400).json({ success: false, message: `Record is already ${doc.status}` });
    }

    doc.status = "submitted";
    doc.submittedAt = new Date();
    doc.updatedBy = user?._id;
    await doc.save();

    await writeAudit({
      req,
      company_id,
      entityType: "HardenerQC",
      entityId: doc._id,
      action: "SUBMIT",
      before: { status: "draft" },
      after: { status: "submitted" },
    });

    await syncHardenerToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error submitting Hardener QC record", error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const doc = await HardenerQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Hardener QC record not found" });

    if (doc.status !== "submitted") {
      return res.status(400).json({ success: false, message: `Record must be submitted to approve. Current status: ${doc.status}` });
    }

    doc.status = "approved";
    doc.approvedAt = new Date();
    doc.approvedBy = user?._id;
    doc.updatedBy = user?._id;
    await doc.save();

    await writeAudit({
      req,
      company_id,
      entityType: "HardenerQC",
      entityId: doc._id,
      action: "APPROVE",
      before: { status: "submitted" },
      after: { status: "approved" },
    });

    await syncHardenerToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving Hardener QC record", error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { rejectionReason } = req.body || {};

    const doc = await HardenerQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Hardener QC record not found" });

    if (doc.status !== "submitted") {
      return res.status(400).json({ success: false, message: `Record must be submitted to reject. Current status: ${doc.status}` });
    }

    doc.status = "rejected";
    doc.rejectedAt = new Date();
    doc.rejectionReason = rejectionReason || "";
    doc.updatedBy = user?._id;
    await doc.save();

    await writeAudit({
      req,
      company_id,
      entityType: "HardenerQC",
      entityId: doc._id,
      action: "REJECT",
      before: { status: "submitted" },
      after: { status: "rejected", rejectionReason },
    });

    await syncHardenerToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting Hardener QC record", error: err.message });
  }
};

// Get trends (SRS 3.1.2 - Auto-generate trend graphs)
exports.getTrends = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productName, grade, category, from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (category) filter.category = String(category);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await HardenerQC.find(filter)
      .sort({ testDate: 1 })
      .select("testDate batchNo amineValue gelTime viscosity mixViscosity exothermicTemperature solidContent")
      .lean();

    const trends = {
      amineValue: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.amineValue })),
      gelTime: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.gelTime })),
      viscosity: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.viscosity })),
      mixViscosity: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.mixViscosity })),
      exothermicTemperature: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.exothermicTemperature })),
      solidContent: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.solidContent })),
    };

    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching trends", error: err.message });
  }
};

