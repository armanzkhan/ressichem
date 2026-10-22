const QCHubBatchRecord = require("../models/QCHubBatchRecord");
const QCAttachment = require("../models/QCAttachment");
const { writeAudit } = require("../utils/qcAudit");
const { autoIndexHubDocument } = require("../utils/qcHubAutoIndex");
const {
  getModuleByKey,
  getAllModules,
  get28DayParamKeys,
  isParamEmpty,
} = require("../utils/qcHubDryMortarSrs");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function toLocalDateOnly(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDaysLocal(dateOnly, days) {
  const d = new Date(dateOnly.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

exports.getModules = async (_req, res) => {
  res.json({ success: true, data: getAllModules() });
};

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { module, category, productName, batchNo, trackingNo, status, from, to, page = 1, limit = 50 } = req.query;
    const filter = { company_id, isActive: true };
    if (module) filter.module = String(module);
    if (category) filter.category = String(category);
    if (productName) filter.productName = { $regex: productName, $options: "i" };
    if (batchNo) filter.batchNo = { $regex: batchNo, $options: "i" };
    if (trackingNo) filter.trackingNo = { $regex: trackingNo, $options: "i" };
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

    const testDate = body.testDate ? new Date(body.testDate) : new Date();
    const castDate = body.castDate ? new Date(body.castDate) : testDate;

    const doc = await QCHubBatchRecord.create({
      company_id,
      module: body.module,
      category: body.category || "",
      productName: body.productName,
      grade: body.grade || "",
      batchNo: body.batchNo,
      trackingNo: String(body.trackingNo || "").trim(),
      castDate,
      testDate,
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
        trackingNo:
          body.trackingNo !== undefined ? String(body.trackingNo || "").trim() : before.trackingNo,
        castDate: body.castDate
          ? new Date(body.castDate)
          : body.castDate === null
            ? before.castDate
            : before.castDate || before.testDate,
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

/**
 * Samples whose 28-day flexural / compressive / adhesion tests are due today or overdue
 * and still missing results. Due date = (castDate || testDate) + 28 days.
 */
exports.get28DayDue = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const moduleFilter = req.query.module ? String(req.query.module) : "";
    const today = toLocalDateOnly(new Date());
    // Look back far enough that overdue items still appear; cast+28 within ~2 years
    const earliestCast = addDaysLocal(today, -400);

    const filter = {
      company_id,
      isActive: true,
      status: { $ne: "rejected" },
      $or: [
        { castDate: { $gte: earliestCast, $lte: today } },
        { castDate: null, testDate: { $gte: earliestCast, $lte: today } },
        { castDate: { $exists: false }, testDate: { $gte: earliestCast, $lte: today } },
      ],
    };
    if (moduleFilter) filter.module = moduleFilter;

    const rows = await QCHubBatchRecord.find(filter)
      .sort({ castDate: 1, testDate: 1 })
      .select(
        "module category productName grade batchNo trackingNo castDate testDate parameters status"
      )
      .lean();

    const dueToday = [];
    const overdue = [];

    for (const row of rows) {
      const keys = get28DayParamKeys(row.module);
      if (!keys.length) continue;

      const pendingKeys = keys.filter((k) => isParamEmpty(row.parameters?.[k]));
      if (!pendingKeys.length) continue;

      const cast = toLocalDateOnly(row.castDate || row.testDate);
      if (!cast) continue;
      const dueDate = addDaysLocal(cast, 28);
      if (dueDate > today) continue;

      const mod = getModuleByKey(row.module);
      const pendingLabels = pendingKeys.map((k) => {
        const p = mod?.parameters?.find((x) => x.key === k);
        return p?.label || k;
      });

      const item = {
        _id: row._id,
        module: row.module,
        moduleLabel: mod?.label || row.module,
        moduleSlug: mod?.slug || "",
        category: row.category || "",
        productName: row.productName,
        grade: row.grade || "",
        batchNo: row.batchNo,
        trackingNo: row.trackingNo || "",
        castDate: cast,
        dueDate,
        status: row.status,
        pendingKeys,
        pendingLabels,
        daysOverdue: Math.round((today - dueDate) / (1000 * 60 * 60 * 24)),
      };

      if (sameLocalDay(dueDate, today)) dueToday.push(item);
      else overdue.push(item);
    }

    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return res.json({
      success: true,
      data: {
        asOf: today,
        dueToday,
        overdue,
        total: dueToday.length + overdue.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

/** Soft-delete many batch records at once (Hub bulk delete) */
exports.bulkSoftDelete = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "ids array is required" });
    }

    const beforeDocs = await QCHubBatchRecord.find({
      _id: { $in: ids },
      company_id,
      isActive: true,
    });

    if (!beforeDocs.length) {
      return res.status(404).json({ success: false, message: "No matching batch records found" });
    }

    const matchedIds = beforeDocs.map((d) => d._id);
    await QCHubBatchRecord.updateMany(
      { _id: { $in: matchedIds }, company_id },
      { isActive: false, updatedBy: req.user?._id }
    );

    await Promise.all(
      beforeDocs.map((doc) =>
        writeAudit({
          req,
          company_id,
          entityType: "QCHubBatchRecord",
          entityId: doc._id,
          action: "DELETE",
          before: doc.toObject(),
          after: { ...doc.toObject(), isActive: false },
          meta: { bulk: true },
        })
      )
    );

    res.json({
      success: true,
      deletedCount: matchedIds.length,
      message: `${matchedIds.length} batch record(s) deleted`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
