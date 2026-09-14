const QABottleFilling = require("../models/QABottleFilling");
const { writeAudit } = require("../utils/qcAudit");
const { upsertQABottleFillingToResults } = require("../utils/syncModuleToQCResult");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function syncQAToResults(company_id, doc, user) {
  try {
    await upsertQABottleFillingToResults(company_id, doc, user);
  } catch (err) {
    console.error("QA Bottle Filling → QCResult sync failed:", err.message);
  }
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { date, operator, shift, machineId, status, from, to, page = 1, limit = 20 } = req.query;

    const filter = { company_id, isActive: true };
    if (date) filter.date = new Date(date);
    if (operator) filter.operator = String(operator);
    if (shift) filter.shift = String(shift);
    if (machineId) filter.machineId = String(machineId);
    if (status) filter.status = String(status);

    if (from || to) {
      filter.date = filter.date || {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await QABottleFilling.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    const total = await QABottleFilling.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing QA Bottle Filling records", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const doc = await QABottleFilling.findOne({ _id: id, company_id, isActive: true })
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: "QA Bottle Filling record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching QA Bottle Filling record", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    const doc = await QABottleFilling.create({
      company_id,
      date: body.date ? new Date(body.date) : new Date(),
      operator: body.operator,
      shift: body.shift,
      machineId: body.machineId || "",
      machineName: body.machineName || "",
      hourlyRecords: body.hourlyRecords || [],
      remarks: body.remarks || "",
      dispatchingDetails: body.dispatchingDetails || "",
      qcOfficer: body.qcOfficer || "",
      qcManager: body.qcManager || "",
      attachments: body.attachments || [],
      createdBy: user?._id,
      status: "draft",
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QABottleFilling",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    await syncQAToResults(company_id, doc, user);

    const populated = await QABottleFilling.findById(doc._id).populate("attachments").lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating QA Bottle Filling record", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const body = req.body || {};

    const before = await QABottleFilling.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "QA Bottle Filling record not found" });

    if (before.status === "approved") {
      return res.status(400).json({ success: false, message: "Cannot update approved record" });
    }

    const update = { updatedBy: user?._id };
    Object.keys(body).forEach((key) => {
      if (key !== "_id" && key !== "company_id" && body[key] !== undefined) {
        if (key === "date") update[key] = new Date(body[key]);
        else update[key] = body[key];
      }
    });

    const after = await QABottleFilling.findOneAndUpdate({ _id: id, company_id }, update, { new: true })
      .populate("attachments")
      .lean();

    await writeAudit({
      req,
      company_id,
      entityType: "QABottleFilling",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after,
    });

    await syncQAToResults(company_id, after, user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating QA Bottle Filling record", error: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const doc = await QABottleFilling.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "QA Bottle Filling record not found" });

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
      entityType: "QABottleFilling",
      entityId: doc._id,
      action: "SUBMIT",
      before: { status: "draft" },
      after: { status: "submitted" },
    });

    await syncQAToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error submitting QA Bottle Filling record", error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    const doc = await QABottleFilling.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "QA Bottle Filling record not found" });

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
      entityType: "QABottleFilling",
      entityId: doc._id,
      action: "APPROVE",
      before: { status: "submitted" },
      after: { status: "approved" },
    });

    await syncQAToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving QA Bottle Filling record", error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { rejectionReason } = req.body || {};

    const doc = await QABottleFilling.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "QA Bottle Filling record not found" });

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
      entityType: "QABottleFilling",
      entityId: doc._id,
      action: "REJECT",
      before: { status: "submitted" },
      after: { status: "rejected", rejectionReason },
    });

    await syncQAToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting QA Bottle Filling record", error: err.message });
  }
};

// Generate Traceability Sheet (SRS 3.2 - Auto-generate traceability sheet)
exports.generateTraceabilitySheet = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;

    const doc = await QABottleFilling.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "QA Bottle Filling record not found" });

    // Generate traceability sheet data
    const traceabilityData = {
      date: doc.date,
      operator: doc.operator,
      shift: doc.shift,
      machineId: doc.machineId,
      machineName: doc.machineName,
      hourlyRecords: doc.hourlyRecords,
      totalBatches: doc.totalBatches,
      totalWeight: doc.totalWeight,
      totalWeightUnit: doc.totalWeightUnit,
    };

    // In a real implementation, this would generate a PDF/Excel file
    // For now, return the structured data
    doc.traceabilitySheetGenerated = true;
    doc.traceabilitySheetLink = `/api/qc/qa-bottle-filling/${id}/traceability-sheet`;
    await doc.save();

    res.json({ success: true, data: traceabilityData });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error generating traceability sheet", error: err.message });
  }
};

