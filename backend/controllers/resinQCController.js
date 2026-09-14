const ResinQC = require("../models/ResinQC");
const QCAttachment = require("../models/QCAttachment");
const { writeAudit } = require("../utils/qcAudit");
const {
  upsertQCResultFromModule,
  softDeleteLinkedQCResult,
} = require("../utils/syncModuleToQCResult");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function syncResinToResults(company_id, doc, user) {
  try {
    await upsertQCResultFromModule({
      company_id,
      module: "RESIN",
      sourceEntityType: "ResinQC",
      doc,
      user,
    });
  } catch (err) {
    console.error("Resin → QCResult sync failed:", err.message);
  }
}

// List all Resin QC records
exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { batchNo, productName, grade, status, from, to, page = 1, limit = 20 } = req.query;

    const filter = { company_id, isActive: true };
    if (batchNo) filter.batchNo = String(batchNo);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (status) filter.status = String(status);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await ResinQC.find(filter)
      .sort({ testDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    const total = await ResinQC.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing Resin QC records", error: err.message });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const doc = await ResinQC.findOne({ _id: id, company_id, isActive: true })
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: "Resin QC record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching Resin QC record", error: err.message });
  }
};

// Create
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    const doc = await ResinQC.create({
      company_id,
      batchNo: body.batchNo,
      productName: body.productName || "",
      grade: body.grade || "",
      testDate: body.testDate ? new Date(body.testDate) : new Date(),
      color: body.color || "",
      transparency: body.transparency || "",
      eew: body.eew,
      gelTime: body.gelTime,
      gelTimeUnit: body.gelTimeUnit || "min",
      viscosity: body.viscosity,
      viscosityUnit: body.viscosityUnit || "cP",
      mixViscosity: body.mixViscosity,
      mixViscosityUnit: body.mixViscosityUnit || "cP",
      exothermicTemperature: body.exothermicTemperature,
      exothermicTemperatureUnit: body.exothermicTemperatureUnit || "°C",
      hycl: body.hycl,
      hyclUnit: body.hyclUnit || "ppm",
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
      entityType: "ResinQC",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    await syncResinToResults(company_id, doc, user);

    const populated = await ResinQC.findById(doc._id).populate("attachments").lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating Resin QC record", error: err.message });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const body = req.body || {};

    const before = await ResinQC.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Resin QC record not found" });

    if (before.status === "approved") {
      return res.status(400).json({ success: false, message: "Cannot update approved record" });
    }

    const update = {
      updatedBy: user?._id,
    };

    if (body.batchNo !== undefined) update.batchNo = body.batchNo;
    if (body.productName !== undefined) update.productName = body.productName;
    if (body.grade !== undefined) update.grade = body.grade;
    if (body.testDate !== undefined) update.testDate = new Date(body.testDate);
    if (body.color !== undefined) update.color = body.color;
    if (body.transparency !== undefined) update.transparency = body.transparency;
    if (body.eew !== undefined) update.eew = body.eew;
    if (body.gelTime !== undefined) update.gelTime = body.gelTime;
    if (body.gelTimeUnit !== undefined) update.gelTimeUnit = body.gelTimeUnit;
    if (body.viscosity !== undefined) update.viscosity = body.viscosity;
    if (body.viscosityUnit !== undefined) update.viscosityUnit = body.viscosityUnit;
    if (body.mixViscosity !== undefined) update.mixViscosity = body.mixViscosity;
    if (body.mixViscosityUnit !== undefined) update.mixViscosityUnit = body.mixViscosityUnit;
    if (body.exothermicTemperature !== undefined) update.exothermicTemperature = body.exothermicTemperature;
    if (body.exothermicTemperatureUnit !== undefined) update.exothermicTemperatureUnit = body.exothermicTemperatureUnit;
    if (body.hycl !== undefined) update.hycl = body.hycl;
    if (body.hyclUnit !== undefined) update.hyclUnit = body.hyclUnit;
    if (body.solidContent !== undefined) update.solidContent = body.solidContent;
    if (body.solidContentUnit !== undefined) update.solidContentUnit = body.solidContentUnit;
    if (body.remarks !== undefined) update.remarks = body.remarks;
    if (body.attachments !== undefined) update.attachments = body.attachments;

    const after = await ResinQC.findOneAndUpdate({ _id: id, company_id }, update, { new: true })
      .populate("attachments")
      .lean();

    await writeAudit({
      req,
      company_id,
      entityType: "ResinQC",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after,
    });

    await syncResinToResults(company_id, after, user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating Resin QC record", error: err.message });
  }
};

// Soft delete
exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const before = await ResinQC.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Resin QC record not found" });

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
      entityType: "ResinQC",
      entityId: before._id,
      action: "DELETE",
      before: beforeData,
      after: { isActive: false },
    });

    try {
      await softDeleteLinkedQCResult({
        company_id,
        module: "RESIN",
        sourceEntityType: "ResinQC",
        sourceEntityId: before._id,
        user,
      });
    } catch (err) {
      console.error("Resin → QCResult delete sync failed:", err.message);
    }

    res.json({ success: true, data: { _id: before._id } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting Resin QC record", error: err.message });
  }
};

// Submit for approval
exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const doc = await ResinQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Resin QC record not found" });

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
      entityType: "ResinQC",
      entityId: doc._id,
      action: "SUBMIT",
      before: { status: "draft" },
      after: { status: "submitted" },
    });

    await syncResinToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error submitting Resin QC record", error: err.message });
  }
};

// Approve
exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const doc = await ResinQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Resin QC record not found" });

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
      entityType: "ResinQC",
      entityId: doc._id,
      action: "APPROVE",
      before: { status: "submitted" },
      after: { status: "approved" },
    });

    await syncResinToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving Resin QC record", error: err.message });
  }
};

// Reject
exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { rejectionReason } = req.body || {};

    const doc = await ResinQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Resin QC record not found" });

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
      entityType: "ResinQC",
      entityId: doc._id,
      action: "REJECT",
      before: { status: "submitted" },
      after: { status: "rejected", rejectionReason },
    });

    await syncResinToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting Resin QC record", error: err.message });
  }
};

// Get trends (SRS 3.1.1 - Auto-generate trend graphs)
exports.getTrends = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productName, grade, parameter, from, to } = req.query;

    const filter = { company_id, isActive: true, status: "approved" };
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await ResinQC.find(filter)
      .sort({ testDate: 1 })
      .select("testDate batchNo eew gelTime viscosity mixViscosity exothermicTemperature hycl solidContent")
      .lean();

    // Group by parameter for trend analysis
    const trends = {
      eew: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.eew })),
      gelTime: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.gelTime })),
      viscosity: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.viscosity })),
      mixViscosity: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.mixViscosity })),
      exothermicTemperature: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.exothermicTemperature })),
      hycl: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.hycl })),
      solidContent: records.map((r) => ({ date: r.testDate, batchNo: r.batchNo, value: r.solidContent })),
    };

    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching trends", error: err.message });
  }
};

