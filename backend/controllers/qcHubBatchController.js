const QCHubBatchRecord = require("../models/QCHubBatchRecord");
const QCAttachment = require("../models/QCAttachment");
const { writeAudit } = require("../utils/qcAudit");
const { autoIndexHubDocument } = require("../utils/qcHubAutoIndex");
const { getModuleByKey, getAllModules } = require("../utils/qcHubDryMortarSrs");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

exports.getModules = async (_req, res) => {
  res.json({ success: true, data: getAllModules() });
};

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, category, productName, batchNo, status, from, to, page = 1, limit = 50 } = req.query;
    const filter = { company_id, isActive: true };
    if (module) filter.module = String(module);
    if (category) filter.category = String(category);
    if (productName) filter.productName = { $regex: productName, $options: "i" };
    if (batchNo) filter.batchNo = { $regex: batchNo, $options: "i" };
    if (status) filter.status = String(status);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      QCHubBatchRecord.find(filter)
        .sort({ testDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("attachments")
        .lean(),
      QCHubBatchRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const row = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true }).populate("attachments");
    if (!row) return res.status(404).json({ success: false, message: "Batch record not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    if (!body.module || !getModuleByKey(body.module)) {
      return res.status(400).json({ success: false, message: "Valid module is required" });
    }
    if (!body.productName || !body.batchNo) {
      return res.status(400).json({ success: false, message: "productName and batchNo are required" });
    }

    const doc = await QCHubBatchRecord.create({
      company_id,
      module: body.module,
      category: body.category || "",
      productName: body.productName,
      grade: body.grade || "",
      batchNo: body.batchNo,
      testDate: body.testDate ? new Date(body.testDate) : new Date(),
      parameters: body.parameters || {},
      remarks: body.remarks || "",
      status: "draft",
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubBatchRecord",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
      meta: { hub: true, module: doc.module },
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Batch record not found" });
    if (before.status === "approved") {
      return res.status(409).json({ success: false, message: "Approved records cannot be edited" });
    }

    const body = req.body || {};
    const after = await QCHubBatchRecord.findOneAndUpdate(
      { _id: req.params.id, company_id },
      {
        category: body.category ?? before.category,
        productName: body.productName ?? before.productName,
        grade: body.grade ?? before.grade,
        batchNo: body.batchNo ?? before.batchNo,
        testDate: body.testDate ? new Date(body.testDate) : before.testDate,
        parameters: body.parameters ?? before.parameters,
        remarks: body.remarks ?? before.remarks,
        updatedBy: req.user?._id,
      },
      { new: true }
    ).populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubBatchRecord",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Batch record not found" });
    if (!["draft", "rejected"].includes(before.status)) {
      return res.status(409).json({ success: false, message: `Cannot submit in status '${before.status}'` });
    }

    const after = await QCHubBatchRecord.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { status: "submitted", submittedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    ).populate("attachments");

    await writeAudit({ req, company_id, entityType: "QCHubBatchRecord", entityId: after._id, action: "SUBMIT", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Batch record not found" });
    if (before.status !== "submitted") {
      return res.status(409).json({ success: false, message: "Only submitted records can be approved" });
    }

    const after = await QCHubBatchRecord.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { status: "approved", approvedAt: new Date(), approvedBy: req.user?._id, updatedBy: req.user?._id },
      { new: true }
    ).populate("attachments");

    await writeAudit({ req, company_id, entityType: "QCHubBatchRecord", entityId: after._id, action: "APPROVE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { reason } = req.body || {};
    const before = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Batch record not found" });
    if (before.status !== "submitted") {
      return res.status(409).json({ success: false, message: "Only submitted records can be rejected" });
    }

    const after = await QCHubBatchRecord.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { status: "rejected", rejectedAt: new Date(), rejectionReason: String(reason || "").trim(), updatedBy: req.user?._id },
      { new: true }
    ).populate("attachments");

    await writeAudit({ req, company_id, entityType: "QCHubBatchRecord", entityId: after._id, action: "REJECT", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const record = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!record) return res.status(404).json({ success: false, message: "Batch record not found" });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const attachment = await QCAttachment.create({
      company_id,
      ownerType: "QC_HUB_BATCH",
      ownerId: record._id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.qcRelPath || "",
      uploadedBy: req.user?._id,
    });

    record.attachments.push(attachment._id);
    record.updatedBy = req.user?._id;
    await record.save();

    await autoIndexHubDocument({
      company_id,
      documentId: attachment._id,
      documentType: "QC_HUB_BATCH",
      batchNumber: record.batchNo,
      date: record.testDate,
      productName: record.productName,
      grade: record.grade,
      module: record.module,
      productType: record.category,
      fileName: attachment.originalName,
      fileType: attachment.mimeType,
      fileSize: attachment.size,
      fileUrl: attachment.path,
      uploadedBy: req.user?._id,
      description: `Batch QC attachment for ${record.productName} ${record.batchNo}`,
    });

    const populated = await QCHubBatchRecord.findById(record._id).populate("attachments");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, productName, grade, parameter, from, to } = req.query;
    const modDef = module ? getModuleByKey(String(module)) : null;

    const filter = { company_id, isActive: true, status: "approved" };
    if (module) filter.module = String(module);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const records = await QCHubBatchRecord.find(filter).sort({ testDate: 1 }).lean();
    const trendKeys =
      parameter
        ? [String(parameter)]
        : modDef
          ? modDef.parameters.filter((p) => p.trend).map((p) => p.key)
          : ["bulkDensity", "waterDemand", "compressiveStrength", "waterRetention", "tensileAdhesionInitial"];

    const trends = {};
    for (const key of trendKeys) {
      trends[key] = records
        .map((r) => {
          const val = r.parameters?.[key];
          const num = val !== undefined && val !== null && val !== "" ? Number(val) : NaN;
          if (Number.isNaN(num)) return null;
          return { date: r.testDate, batchNo: r.batchNo, value: num, productName: r.productName, grade: r.grade, module: r.module };
        })
        .filter(Boolean);
    }

    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await QCHubBatchRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Batch record not found" });

    const after = await QCHubBatchRecord.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { isActive: false, updatedBy: req.user?._id },
      { new: true }
    );

    await writeAudit({ req, company_id, entityType: "QCHubBatchRecord", entityId: after._id, action: "DELETE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
