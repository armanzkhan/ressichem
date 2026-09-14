const path = require("path");
const fs = require("fs");
const QCResult = require("../models/QCResult");
const QCTest = require("../models/QCTest");
const QCAttachment = require("../models/QCAttachment");
const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const LMSQC = require("../models/LMSQC");
const PackagingMaterialQC = require("../models/PackagingMaterialQC");
const QABottleFilling = require("../models/QABottleFilling");
const RDTrialBatch = require("../models/RDTrialBatch");
const RawMaterialBatch = require("../models/RawMaterialBatch");
const { writeAudit } = require("../utils/qcAudit");
const { compareToSpecs, getProductSpecificTests, checkENCompliance } = require("../utils/qcSpecComparison");
const {
  upsertQCResultFromModule,
  upsertPackagingToResults,
  upsertRawMaterialBatchToResults,
  upsertQABottleFillingToResults,
  upsertRDTrialToResults,
} = require("../utils/syncModuleToQCResult");
const { upsertModuleFromQCResult, MODULE_UPSERTERS } = require("../utils/syncQCResultToModule");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function toNumericMaybe(val) {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "" && !Number.isNaN(Number(val))) return Number(val);
  return undefined;
}

async function syncResultToLinkedModule(company_id, resultDoc, user) {
  try {
    await upsertModuleFromQCResult({ company_id, result: resultDoc, user });
  } catch (err) {
    console.error("QCResult → module sync failed:", err.message);
  }
}

async function normalizeValues(company_id, values = []) {
  const testIds = values.map((v) => v?.test).filter(Boolean);
  const tests = await QCTest.find({ company_id, _id: { $in: testIds } }).lean();
  const byId = new Map(tests.map((t) => [String(t._id), t]));

  return values
    .map((v) => {
      if (!v?.test) return null;
      const t = byId.get(String(v.test));
      if (!t) return null;

      let value = v.value;
      if (t.dataType === "number") {
        const num = toNumericMaybe(value);
        value = num !== undefined ? num : value;
      }

      const numericValue = toNumericMaybe(value);
      return {
        test: v.test,
        value,
        numericValue,
        unit: v.unit || t.unit || "",
        notes: v.notes || "",
      };
    })
    .filter(Boolean);
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const {
      system,
      module,
      productCategory,
      productName,
      grade,
      batchNo,
      status,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { company_id, isActive: true };
    if (system) filter.system = String(system);
    if (module) filter.module = String(module);
    if (productCategory) filter.productCategory = String(productCategory);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (batchNo) filter.batchNo = String(batchNo);
    if (status) filter.status = String(status);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await QCResult.find(filter)
      .sort({ testDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("values.test")
      .populate("attachments")
      .lean();

    const total = await QCResult.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing results", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const row = await QCResult.findOne({ _id: req.params.id, company_id, isActive: true })
      .populate("values.test")
      .populate("attachments")
      .lean();
    if (!row) return res.status(404).json({ success: false, message: "Result not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching result", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const payload = req.body || {};
    const batchNo = String(payload.batchNo || "").trim();
    if (!batchNo) return res.status(400).json({ success: false, message: "batchNo is required" });

    const values = await normalizeValues(company_id, Array.isArray(payload.values) ? payload.values : []);
    const doc = await QCResult.create({
      company_id,
      system: payload.system || "QC_SITE_AREA",
      module: payload.module || "",
      productCategory: payload.productCategory || "",
      productName: payload.productName || "",
      grade: payload.grade || "",
      batchNo,
      testDate: payload.testDate ? new Date(payload.testDate) : new Date(),
      operator: payload.operator || "",
      shift: payload.shift || "",
      values,
      remarks: payload.remarks || "",
      status: "draft",
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCResult",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    // Auto-comparison to specs
    const comparison = await compareToSpecs(company_id, doc.toObject());

    const populated = await QCResult.findById(doc._id).populate("values.test").populate("attachments");
    await syncResultToLinkedModule(company_id, populated, req.user);
    const synced = await QCResult.findById(doc._id).populate("values.test").populate("attachments");

    res.status(201).json({
      success: true,
      data: synced,
      specComparison: comparison,
      alerts: comparison.outOfSpecCount > 0 ? [`${comparison.outOfSpecCount} test(s) out of specification`] : [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating result", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const payload = req.body || {};

    const before = await QCResult.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Result not found" });

    if (before.status === "approved") {
      return res.status(409).json({ success: false, message: "Approved results cannot be edited" });
    }
    if (before.status === "submitted") {
      return res.status(409).json({
        success: false,
        message: "Submitted results cannot be edited. Reject first or wait for approval.",
      });
    }

    const update = { ...payload, updatedBy: req.user?._id };
    if (payload.batchNo) update.batchNo = String(payload.batchNo).trim();
    if (payload.testDate) update.testDate = new Date(payload.testDate);
    if (payload.values) update.values = await normalizeValues(company_id, Array.isArray(payload.values) ? payload.values : []);

    const after = await QCResult.findOneAndUpdate({ _id: id, company_id }, update, { new: true })
      .populate("values.test")
      .populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCResult",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after: after.toObject(),
    });

    await syncResultToLinkedModule(company_id, after, req.user);
    const synced = await QCResult.findById(after._id).populate("values.test").populate("attachments");

    res.json({ success: true, data: synced });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating result", error: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const before = await QCResult.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Result not found" });
    if (before.status !== "draft" && before.status !== "rejected") {
      return res.status(409).json({ success: false, message: `Cannot submit result in status '${before.status}'` });
    }

    const after = await QCResult.findOneAndUpdate(
      { _id: id, company_id },
      { status: "submitted", submittedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    )
      .populate("values.test")
      .populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCResult",
      entityId: after._id,
      action: "SUBMIT",
      before: before.toObject(),
      after: after.toObject(),
    });

    await syncResultToLinkedModule(company_id, after, req.user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error submitting result", error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const before = await QCResult.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Result not found" });
    if (before.status !== "submitted") {
      return res.status(409).json({ success: false, message: `Only submitted results can be approved (current: ${before.status})` });
    }

    const after = await QCResult.findOneAndUpdate(
      { _id: id, company_id },
      { status: "approved", approvedAt: new Date(), approvedBy: req.user?._id, updatedBy: req.user?._id },
      { new: true }
    )
      .populate("values.test")
      .populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCResult",
      entityId: after._id,
      action: "APPROVE",
      before: before.toObject(),
      after: after.toObject(),
    });

    await syncResultToLinkedModule(company_id, after, req.user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving result", error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const { reason } = req.body || {};

    const before = await QCResult.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Result not found" });
    if (before.status !== "submitted") {
      return res.status(409).json({ success: false, message: `Only submitted results can be rejected (current: ${before.status})` });
    }

    const after = await QCResult.findOneAndUpdate(
      { _id: id, company_id },
      {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason: String(reason || "").trim(),
        updatedBy: req.user?._id,
      },
      { new: true }
    )
      .populate("values.test")
      .populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCResult",
      entityId: after._id,
      action: "REJECT",
      before: before.toObject(),
      after: after.toObject(),
    });

    await syncResultToLinkedModule(company_id, after, req.user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting result", error: err.message });
  }
};

function unlinkAttachmentFile(relativePath) {
  if (!relativePath) return;
  const full = path.join(__dirname, "..", String(relativePath).replace(/^\//, ""));
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (err) {
    console.warn("unlinkAttachmentFile:", full, err.message);
  }
}

async function loadEditableResult(company_id, resultId) {
  const result = await QCResult.findOne({ _id: resultId, company_id, isActive: true });
  if (!result) return { error: { status: 404, message: "Result not found" } };
  if (result.status === "approved") {
    return { error: { status: 409, message: "Approved results cannot be modified" } };
  }
  if (result.status === "submitted") {
    return {
      error: { status: 409, message: "Submitted results cannot be modified. Reject first to replace files." },
    };
  }
  return { result };
}

function resultOwnsAttachment(result, attachmentId) {
  return (result.attachments || []).some((aid) => String(aid) === String(attachmentId));
}

exports.uploadAttachment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;

    const editable = await loadEditableResult(company_id, id);
    if (editable.error) {
      return res.status(editable.error.status).json({ success: false, message: editable.error.message });
    }
    const result = editable.result;

    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const attachment = await QCAttachment.create({
      company_id,
      ownerType: "QC_RESULT",
      ownerId: result._id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.qcRelPath || "", // set by multer storage handler
      uploadedBy: req.user?._id,
    });

    const before = result.toObject();
    result.attachments.push(attachment._id);
    result.updatedBy = req.user?._id;
    await result.save();

    await writeAudit({
      req,
      company_id,
      entityType: "QCAttachment",
      entityId: attachment._id,
      action: "UPLOAD",
      before: null,
      after: attachment.toObject(),
      meta: { ownerType: "QC_RESULT", ownerId: result._id },
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCResult",
      entityId: result._id,
      action: "UPDATE",
      before,
      after: result.toObject(),
      meta: { attachmentAdded: attachment._id },
    });

    const populated = await QCResult.findById(result._id).populate("values.test").populate("attachments");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error uploading attachment", error: err.message });
  }
};

exports.replaceAttachment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id, attachmentId } = req.params;

    const editable = await loadEditableResult(company_id, id);
    if (editable.error) {
      return res.status(editable.error.status).json({ success: false, message: editable.error.message });
    }
    const result = editable.result;

    if (!resultOwnsAttachment(result, attachmentId)) {
      return res.status(404).json({ success: false, message: "Attachment not found on this result" });
    }

    const existing = await QCAttachment.findOne({
      _id: attachmentId,
      company_id,
      ownerType: "QC_RESULT",
      ownerId: result._id,
    });
    if (!existing) return res.status(404).json({ success: false, message: "Attachment not found" });

    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const before = existing.toObject();
    unlinkAttachmentFile(existing.path);

    existing.originalName = req.file.originalname;
    existing.fileName = req.file.filename;
    existing.mimeType = req.file.mimetype;
    existing.size = req.file.size;
    existing.path = req.file.qcRelPath || existing.path;
    existing.uploadedBy = req.user?._id;
    await existing.save();

    result.updatedBy = req.user?._id;
    await result.save();

    await writeAudit({
      req,
      company_id,
      entityType: "QCAttachment",
      entityId: existing._id,
      action: "REPLACE",
      before,
      after: existing.toObject(),
      meta: { ownerType: "QC_RESULT", ownerId: result._id },
    });

    const populated = await QCResult.findById(result._id).populate("values.test").populate("attachments");
    res.json({ success: true, data: populated, message: "Attachment replaced" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error replacing attachment", error: err.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id, attachmentId } = req.params;

    const editable = await loadEditableResult(company_id, id);
    if (editable.error) {
      return res.status(editable.error.status).json({ success: false, message: editable.error.message });
    }
    const result = editable.result;

    if (!resultOwnsAttachment(result, attachmentId)) {
      return res.status(404).json({ success: false, message: "Attachment not found on this result" });
    }

    const existing = await QCAttachment.findOne({
      _id: attachmentId,
      company_id,
      ownerType: "QC_RESULT",
      ownerId: result._id,
    });
    if (!existing) return res.status(404).json({ success: false, message: "Attachment not found" });

    const before = existing.toObject();
    unlinkAttachmentFile(existing.path);

    result.attachments = result.attachments.filter((aid) => String(aid) !== String(attachmentId));
    result.updatedBy = req.user?._id;
    await result.save();
    await QCAttachment.deleteOne({ _id: attachmentId });

    await writeAudit({
      req,
      company_id,
      entityType: "QCAttachment",
      entityId: attachmentId,
      action: "DELETE",
      before,
      after: null,
      meta: { ownerType: "QC_RESULT", ownerId: result._id },
    });

    const populated = await QCResult.findById(result._id).populate("values.test").populate("attachments");
    res.json({ success: true, data: populated, message: "Attachment removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting attachment", error: err.message });
  }
};

// Get product-specific test templates
exports.getProductTests = async (req, res) => {
  try {
    const { productType } = req.query;
    if (!productType) {
      return res.status(400).json({ success: false, message: "productType is required" });
    }

    const tests = getProductSpecificTests(productType);
    return res.json({ success: true, data: tests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Compare result to specs
exports.compareSpecs = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;

    const result = await QCResult.findOne({ _id: id, company_id, isActive: true })
      .populate("values.test")
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    const comparison = await compareToSpecs(company_id, result);
    return res.json({ success: true, data: comparison });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Check EN compliance
exports.checkENCompliance = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const { standardCode } = req.query || { standardCode: "EN 12004-1" };

    const result = await QCResult.findOne({ _id: id, company_id, isActive: true })
      .populate("values.test")
      .lean();

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    const compliance = await checkENCompliance(company_id, result, standardCode);
    return res.json({ success: true, data: compliance });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.trends = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { testId, module, productCategory, productName, grade, from, to, system } = req.query;
    if (!testId) return res.status(400).json({ success: false, message: "testId is required" });

    const filter = { company_id, isActive: true };
    if (system) filter.system = String(system);
    if (module) filter.module = String(module);
    if (productCategory) filter.productCategory = String(productCategory);
    if (productName) filter.productName = String(productName);
    if (grade) filter.grade = String(grade);
    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    // Aggregation to extract series for the requested test
    const mongoose = require("mongoose");
    const testObjectId = new mongoose.Types.ObjectId(String(testId));
    const rows = await QCResult.aggregate([
      { $match: filter },
      { $unwind: "$values" },
      { $match: { "values.test": testObjectId, "values.numericValue": { $ne: null } } },
      { $project: { testDate: 1, batchNo: 1, y: "$values.numericValue" } },
      { $sort: { testDate: 1 } },
      { $limit: 2000 },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error generating trends", error: err.message });
  }
};

// Fast list for large datasets (SRS 4.1 performance target)
exports.fastList = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const {
      system,
      module,
      productCategory,
      productName,
      grade,
      status,
      from,
      to,
      limit = 100000,
    } = req.query;

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

    const started = Date.now();
    const rows = await QCResult.find(filter)
      .sort({ testDate: -1 })
      .limit(Math.min(parseInt(limit), 100000))
      .select("batchNo testDate module productCategory productName grade status")
      .lean();
    const elapsedMs = Date.now() - started;

    return res.json({
      success: true,
      data: rows,
      meta: { elapsedMs, count: rows.length },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error listing results (fast)", error: err.message });
  }
};

/** Re-sync all Site module records into QCResult (backfill / repair). */
exports.syncFromModules = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    let synced = 0;
    let failed = 0;

    const resinRows = await ResinQC.find({ company_id, isActive: true }).lean();
    for (const row of resinRows) {
      try {
        await upsertQCResultFromModule({
          company_id,
          module: "RESIN",
          sourceEntityType: "ResinQC",
          doc: row,
          user,
        });
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const hardenerRows = await HardenerQC.find({ company_id, isActive: true }).lean();
    for (const row of hardenerRows) {
      try {
        await upsertQCResultFromModule({
          company_id,
          module: "HARDENER",
          sourceEntityType: "HardenerQC",
          doc: row,
          user,
        });
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const lmsRows = await LMSQC.find({ company_id, isActive: true }).lean();
    for (const row of lmsRows) {
      try {
        await upsertQCResultFromModule({
          company_id,
          module: "LMS",
          sourceEntityType: "LMSQC",
          doc: row,
          user,
        });
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const packagingRows = await PackagingMaterialQC.find({ company_id, isActive: true }).lean();
    for (const row of packagingRows) {
      try {
        await upsertPackagingToResults(company_id, row, user);
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const rawBatchRows = await RawMaterialBatch.find({ company_id, isActive: true }).populate("rawMaterial").lean();
    for (const row of rawBatchRows) {
      try {
        await upsertRawMaterialBatchToResults(company_id, row, user);
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const qaRows = await QABottleFilling.find({ company_id, isActive: true }).lean();
    for (const row of qaRows) {
      try {
        await upsertQABottleFillingToResults(company_id, row, user);
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const trialRows = await RDTrialBatch.find({ company_id, isActive: true }).lean();
    for (const row of trialRows) {
      try {
        await upsertRDTrialToResults(company_id, row, user);
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    let linked = 0;
    const syncableModules = Object.keys(MODULE_UPSERTERS);
    const orphanResults = await QCResult.find({
      company_id,
      system: "QC_SITE_AREA",
      isActive: true,
      module: { $in: syncableModules },
      $or: [{ sourceEntityId: { $exists: false } }, { sourceEntityId: null }],
    })
      .populate("values.test")
      .lean();

    for (const row of orphanResults) {
      try {
        await upsertModuleFromQCResult({ company_id, result: row, user });
        linked += 1;
      } catch {
        failed += 1;
      }
    }

    return res.json({
      success: true,
      message: `Synced ${synced} module record(s) to Results dashboard and linked ${linked} dashboard batch(es) to modules${failed ? ` (${failed} failed)` : ""}.`,
      synced,
      linked,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


