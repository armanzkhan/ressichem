const QCHubFormSubmission = require("../models/QCHubFormSubmission");
const QCAttachment = require("../models/QCAttachment");
const { writeAudit } = require("../utils/qcAudit");
const { autoIndexHubDocument } = require("../utils/qcHubAutoIndex");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { planGroup = "DRY_MORTAR", formType, productType, batchNo, sampleTrackingNo, status, page = 1, limit = 20 } =
      req.query;

    const filter = { company_id, isActive: true, planGroup: String(planGroup) };
    if (formType) filter.formType = String(formType);
    if (productType) filter.productType = String(productType);
    if (batchNo) filter.batchNo = String(batchNo);
    if (sampleTrackingNo) filter.sampleTrackingNo = String(sampleTrackingNo);
    if (status) filter.status = String(status);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await QCHubFormSubmission.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("attachments")
      .lean();

    const total = await QCHubFormSubmission.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing QC Hub forms", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const row = await QCHubFormSubmission.findOne({ _id: req.params.id, company_id, isActive: true })
      .populate("attachments")
      .lean();
    if (!row) return res.status(404).json({ success: false, message: "Form submission not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching form submission", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const payload = req.body || {};
    if (!payload.formType) return res.status(400).json({ success: false, message: "formType is required" });

    const doc = await QCHubFormSubmission.create({
      company_id,
      planGroup: payload.planGroup || "DRY_MORTAR",
      productType: payload.productType || "",
      productName: payload.productName || "",
      batchNo: payload.batchNo || "",
      formType: payload.formType,
      sampleTrackingNo: payload.sampleTrackingNo || "",
      productionDate: payload.productionDate ? new Date(payload.productionDate) : undefined,
      castingDate: payload.castingDate ? new Date(payload.castingDate) : undefined,
      testDate: payload.testDate ? new Date(payload.testDate) : undefined,
      days: payload.days,
      payload: payload.payload || {},
      remarks: payload.remarks || "",
      status: "draft",
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubFormSubmission",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
      meta: { hub: true },
    });

    const populated = await QCHubFormSubmission.findById(doc._id).populate("attachments");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating QC Hub form", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const payload = req.body || {};

    const before = await QCHubFormSubmission.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Form submission not found" });
    if (before.status === "approved") {
      return res.status(409).json({ success: false, message: "Approved submissions cannot be edited" });
    }

    const after = await QCHubFormSubmission.findOneAndUpdate(
      { _id: id, company_id },
      {
        ...payload,
        productionDate: payload.productionDate ? new Date(payload.productionDate) : before.productionDate,
        castingDate: payload.castingDate ? new Date(payload.castingDate) : before.castingDate,
        testDate: payload.testDate ? new Date(payload.testDate) : before.testDate,
        updatedBy: req.user?._id,
      },
      { new: true }
    ).populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubFormSubmission",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating QC Hub form", error: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const before = await QCHubFormSubmission.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Form submission not found" });
    if (before.status !== "draft" && before.status !== "rejected") {
      return res.status(409).json({ success: false, message: `Cannot submit in status '${before.status}'` });
    }

    const after = await QCHubFormSubmission.findOneAndUpdate(
      { _id: id, company_id },
      { status: "submitted", submittedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    ).populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubFormSubmission",
      entityId: after._id,
      action: "SUBMIT",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error submitting QC Hub form", error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const before = await QCHubFormSubmission.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Form submission not found" });
    if (before.status !== "submitted") {
      return res.status(409).json({ success: false, message: `Only submitted forms can be approved (current: ${before.status})` });
    }

    const after = await QCHubFormSubmission.findOneAndUpdate(
      { _id: id, company_id },
      { status: "approved", approvedAt: new Date(), approvedBy: req.user?._id, updatedBy: req.user?._id },
      { new: true }
    ).populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubFormSubmission",
      entityId: after._id,
      action: "APPROVE",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving QC Hub form", error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;
    const { reason } = req.body || {};
    const before = await QCHubFormSubmission.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Form submission not found" });
    if (before.status !== "submitted") {
      return res.status(409).json({ success: false, message: `Only submitted forms can be rejected (current: ${before.status})` });
    }

    const after = await QCHubFormSubmission.findOneAndUpdate(
      { _id: id, company_id },
      { status: "rejected", rejectedAt: new Date(), rejectionReason: String(reason || "").trim(), updatedBy: req.user?._id },
      { new: true }
    ).populate("attachments");

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubFormSubmission",
      entityId: after._id,
      action: "REJECT",
      before: before.toObject(),
      after: after.toObject(),
      meta: { hub: true },
    });

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting QC Hub form", error: err.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const id = req.params.id;

    const form = await QCHubFormSubmission.findOne({ _id: id, company_id, isActive: true });
    if (!form) return res.status(404).json({ success: false, message: "Form submission not found" });
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const attachment = await QCAttachment.create({
      company_id,
      ownerType: "QC_HUB_FORM",
      ownerId: form._id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.qcRelPath || "",
      uploadedBy: req.user?._id,
    });

    const before = form.toObject();
    form.attachments.push(attachment._id);
    form.updatedBy = req.user?._id;
    await form.save();

    await writeAudit({
      req,
      company_id,
      entityType: "QCAttachment",
      entityId: attachment._id,
      action: "UPLOAD",
      before: null,
      after: attachment.toObject(),
      meta: { ownerType: "QC_HUB_FORM", ownerId: form._id },
    });

    await autoIndexHubDocument({
      company_id,
      documentId: attachment._id,
      documentType: "QC_HUB_FORM",
      batchNumber: form.batchNo,
      date: form.testDate || form.productionDate,
      productName: form.productName,
      grade: "",
      module: form.productType,
      productType: form.formType,
      fileName: attachment.originalName,
      fileType: attachment.mimeType,
      fileSize: attachment.size,
      fileUrl: attachment.path,
      uploadedBy: req.user?._id,
      description: `QC Hub form attachment (${form.formType}) batch ${form.batchNo}`,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "QCHubFormSubmission",
      entityId: form._id,
      action: "UPDATE",
      before,
      after: form.toObject(),
      meta: { attachmentAdded: attachment._id },
    });

    const populated = await QCHubFormSubmission.findById(form._id).populate("attachments");
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error uploading QC Hub form attachment", error: err.message });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { planGroup = "DRY_MORTAR", formType, status, limit = 50000 } = req.query;
    const filter = { company_id, isActive: true, planGroup: String(planGroup) };
    if (formType) filter.formType = String(formType);
    if (status) filter.status = String(status);

    const rows = await QCHubFormSubmission.find(filter).sort({ updatedAt: -1 }).limit(parseInt(limit)).lean();

    const header = [
      "company_id",
      "planGroup",
      "productType",
      "productName",
      "batchNo",
      "formType",
      "sampleTrackingNo",
      "productionDate",
      "castingDate",
      "testDate",
      "days",
      "status",
      "remarks",
      "payload_json",
    ];

    const csvEscape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qc_hub_forms_${Date.now()}.csv"`);
    res.write(header.join(",") + "\n");

    for (const r of rows) {
      const line = [
        r.company_id,
        r.planGroup,
        r.productType,
        r.productName,
        r.batchNo,
        r.formType,
        r.sampleTrackingNo,
        r.productionDate ? new Date(r.productionDate).toISOString() : "",
        r.castingDate ? new Date(r.castingDate).toISOString() : "",
        r.testDate ? new Date(r.testDate).toISOString() : "",
        r.days ?? "",
        r.status,
        r.remarks || "",
        JSON.stringify(r.payload || {}),
      ].map(csvEscape);
      res.write(line.join(",") + "\n");
    }

    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting QC Hub forms", error: err.message });
  }
};


