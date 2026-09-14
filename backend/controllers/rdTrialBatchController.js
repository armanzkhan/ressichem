const RDTrialBatch = require("../models/RDTrialBatch");
const QCAttachment = require("../models/QCAttachment");
const { writeAudit } = require("../utils/qcAudit");
const { upsertRDTrialToResults } = require("../utils/syncModuleToQCResult");
const path = require("path");
const fs = require("fs");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function syncTrialToResults(company_id, doc, user) {
  try {
    await upsertRDTrialToResults(company_id, doc, user);
  } catch (err) {
    console.error("R&D Trial → QCResult sync failed:", err.message);
  }
}

function unlinkAttachmentFile(relPath) {
  if (!relPath) return;
  const full = path.join(__dirname, "..", relPath.replace(/^\//, ""));
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (err) {
    console.warn("unlinkAttachmentFile:", full, err.message);
  }
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productFolder, productName, trialBatchNo, status, from, to, page = 1, limit = 20 } = req.query;

    const filter = { company_id, isActive: true };
    if (productFolder) filter.productFolder = String(productFolder);
    if (productName) filter.productName = String(productName);
    if (trialBatchNo) filter.trialBatchNo = String(trialBatchNo);
    if (status) filter.status = String(status);

    if (from || to) {
      filter.trialDate = {};
      if (from) filter.trialDate.$gte = new Date(from);
      if (to) filter.trialDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await RDTrialBatch.find(filter)
      .sort({ trialDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("formulation")
      .populate("attachments")
      .populate("logSheet")
      .populate("createdBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
      .lean();

    const total = await RDTrialBatch.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing R&D Trial Batches", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const doc = await RDTrialBatch.findOne({ _id: id, company_id, isActive: true })
      .populate("formulation")
      .populate("attachments")
      .populate("logSheet")
      .populate("createdBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: "R&D Trial Batch not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching R&D Trial Batch", error: err.message });
  }
};

// Get by product folder (SRS 3.3.1 - separate folder of each product)
exports.getByProductFolder = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productFolder } = req.params;

    const docs = await RDTrialBatch.find({ company_id, productFolder, isActive: true })
      .sort({ trialBatchNo: 1 })
      .populate("formulation")
      .populate("attachments")
      .populate("logSheet")
      .lean();

    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching R&D Trial Batches by folder", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    const productFolder = String(body.productFolder || "").trim();
    const trialBatchNo = String(body.trialBatchNo || "").trim();
    const fullTrialCode =
      body.fullTrialCode?.trim() ||
      (productFolder && trialBatchNo ? `${productFolder}-${trialBatchNo}` : undefined);

    const doc = await RDTrialBatch.create({
      company_id,
      productFolder, // e.g., "grout", "protective_paint", "wall_putty"
      trialBatchNo, // e.g., "T0", "T1", "T2"
      fullTrialCode,
      productName: body.productName,
      productType: body.productType || "",
      targetGrade: body.targetGrade || "",
      formulation: body.formulation,
      formulationVersion: body.formulationVersion || 1,
      parameters: body.parameters || {},
      testResults: body.testResults || {},
      trendData: body.trendData || {},
      chartData: body.chartData || {},
      comparisonWithPrevious: body.comparisonWithPrevious || {},
      costPerUnit: body.costPerUnit,
      costUnit: body.costUnit || "per ton",
      costBreakdown: body.costBreakdown || {},
      performanceCostRatio: body.performanceCostRatio,
      alternativeRMs: body.alternativeRMs || [],
      trialDate: body.trialDate ? new Date(body.trialDate) : new Date(),
      status: body.status || "planned",
      observations: body.observations || "",
      conclusions: body.conclusions || "",
      nextSteps: body.nextSteps || "",
      attachments: body.attachments || [],
      createdBy: user?._id,
      assignedTo: body.assignedTo,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "RDTrialBatch",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    await syncTrialToResults(company_id, doc, user);

    const populated = await RDTrialBatch.findById(doc._id)
      .populate("formulation")
      .populate("attachments")
      .populate("logSheet")
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A trial batch with this product folder and trial batch number already exists",
        error: err.message,
      });
    }
    res.status(500).json({ success: false, message: "Error creating R&D Trial Batch", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const body = req.body || {};

    const before = await RDTrialBatch.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "R&D Trial Batch not found" });

    const update = { updatedBy: user?._id };
    Object.keys(body).forEach((key) => {
      if (key !== "_id" && key !== "company_id" && body[key] !== undefined) {
        if (key === "trialDate") update[key] = new Date(body[key]);
        else update[key] = body[key];
      }
    });

    const after = await RDTrialBatch.findOneAndUpdate({ _id: id, company_id }, update, { new: true })
      .populate("formulation")
      .populate("attachments")
      .populate("logSheet")
      .lean();

    await writeAudit({
      req,
      company_id,
      entityType: "RDTrialBatch",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after,
    });

    await syncTrialToResults(company_id, after, user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating R&D Trial Batch", error: err.message });
  }
};

// Compare trials (SRS 3.3.2 - Compare current batches vs past batches)
exports.compareTrials = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productFolder } = req.params;
    const { currentTrialId, compareWith } = req.body || {}; // compareWith: ["T0", "T1", "T2"]

    const currentTrial = await RDTrialBatch.findOne({ _id: currentTrialId, company_id, isActive: true }).lean();
    if (!currentTrial) return res.status(404).json({ success: false, message: "Current trial not found" });

    const compareTrials = await RDTrialBatch.find({
      company_id,
      productFolder,
      trialBatchNo: { $in: compareWith || [] },
      isActive: true,
    }).lean();

    // Generate comparison data
    const comparison = {
      currentTrial: currentTrial,
      comparedTrials: compareTrials,
      deviations: [], // Highlight deviations
      improvements: [], // Highlight improvements
      summary: {},
    };

    // Compare test results
    if (currentTrial.testResults && compareTrials.length > 0) {
      compareTrials.forEach((trial) => {
        if (trial.testResults) {
          Object.keys(currentTrial.testResults).forEach((key) => {
            const currentValue = currentTrial.testResults[key];
            const pastValue = trial.testResults[key];
            if (currentValue !== undefined && pastValue !== undefined) {
              const deviation = currentValue - pastValue;
              if (Math.abs(deviation) > 0) {
                comparison.deviations.push({
                  parameter: key,
                  current: currentValue,
                  past: pastValue,
                  deviation: deviation,
                  trial: trial.trialBatchNo,
                });
              }
            }
          });
        }
      });
    }

    res.json({ success: true, data: comparison });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error comparing trials", error: err.message });
  }
};

// Get cost comparison (SRS 3.3.4 - Cost comparison sheet)
exports.getCostComparison = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productFolder } = req.params;

    const trials = await RDTrialBatch.find({ company_id, productFolder, isActive: true })
      .sort({ trialBatchNo: 1 })
      .select("trialBatchNo productName costPerUnit costUnit costBreakdown performanceCostRatio testResults")
      .lean();

    const costComparison = trials.map((trial) => ({
      trialBatchNo: trial.trialBatchNo,
      productName: trial.productName,
      costPerUnit: trial.costPerUnit,
      costUnit: trial.costUnit,
      costBreakdown: trial.costBreakdown,
      performanceCostRatio: trial.performanceCostRatio,
      testResults: trial.testResults,
    }));

    res.json({ success: true, data: costComparison });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching cost comparison", error: err.message });
  }
};

exports.uploadLogSheet = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;

    const trial = await RDTrialBatch.findOne({ _id: id, company_id, isActive: true });
    if (!trial) return res.status(404).json({ success: false, message: "R&D Trial Batch not found" });

    if (!req.file) return res.status(400).json({ success: false, message: "Log sheet file is required" });

    if (trial.logSheet) {
      const existing = await QCAttachment.findOne({
        _id: trial.logSheet,
        company_id,
        ownerType: "RD_TRIAL_BATCH",
        ownerId: trial._id,
      });
      if (existing) {
        unlinkAttachmentFile(existing.path);
        trial.attachments = (trial.attachments || []).filter((aid) => String(aid) !== String(existing._id));
        await QCAttachment.deleteOne({ _id: existing._id });
      }
    }

    const attachment = await QCAttachment.create({
      company_id,
      ownerType: "RD_TRIAL_BATCH",
      ownerId: trial._id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.qcRelPath || "",
      uploadedBy: req.user?._id,
    });

    const before = trial.toObject();
    trial.logSheet = attachment._id;
    if (!(trial.attachments || []).some((aid) => String(aid) === String(attachment._id))) {
      trial.attachments.push(attachment._id);
    }
    trial.updatedBy = req.user?._id;
    await trial.save();

    await writeAudit({
      req,
      company_id,
      entityType: "QCAttachment",
      entityId: attachment._id,
      action: "UPLOAD",
      before: null,
      after: attachment.toObject(),
      meta: { ownerType: "RD_TRIAL_BATCH", ownerId: trial._id, documentType: "LOG_SHEET" },
    });

    await writeAudit({
      req,
      company_id,
      entityType: "RDTrialBatch",
      entityId: trial._id,
      action: "UPDATE",
      before,
      after: trial.toObject(),
      meta: { logSheetAdded: attachment._id },
    });

    const populated = await RDTrialBatch.findById(trial._id)
      .populate("formulation")
      .populate("attachments")
      .populate("logSheet")
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error uploading log sheet", error: err.message });
  }
};

