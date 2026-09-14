const NCR = require("../models/NCR");
const { writeAudit } = require("../utils/qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function nextNcrNo(company_id) {
  const year = new Date().getFullYear();
  const count = await NCR.countDocuments({ company_id, ncrNo: { $regex: `^NCR-${year}-` } });
  return `NCR-${year}-${String(count + 1).padStart(4, "0")}`;
}

exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, severity, sourceType, search, from, to } = req.query;
    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (sourceType) query.sourceType = sourceType;
    if (search) {
      query.$or = [
        { ncrNo: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { relatedBatchNo: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      query.detectedDate = {};
      if (from) query.detectedDate.$gte = new Date(from);
      if (to) query.detectedDate.$lte = new Date(to);
    }

    const rows = await NCR.find(query).sort({ detectedDate: -1 }).populate("linkedCapa", "capaNo title status");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const row = await NCR.findOne({ _id: req.params.id, company_id }).populate("linkedCapa");
    if (!row) return res.status(404).json({ success: false, message: "NCR not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const ncrNo = body.ncrNo || (await nextNcrNo(company_id));

    const doc = await NCR.create({
      company_id,
      ncrNo,
      title: body.title,
      description: body.description || "",
      detectedDate: body.detectedDate ? new Date(body.detectedDate) : new Date(),
      detectedBy: req.user?._id,
      department: body.department || "QC/R&D",
      severity: body.severity || "MINOR",
      sourceType: body.sourceType || "QC_BATCH",
      relatedBatchNo: body.relatedBatchNo || "",
      relatedProductName: body.relatedProductName || "",
      relatedModule: body.relatedModule || "",
      rootCause: body.rootCause || "",
      immediateAction: body.immediateAction || "",
      disposition: body.disposition || "PENDING",
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({ req, company_id, entityType: "NCR", entityId: doc._id, action: "CREATE", before: null, after: doc.toObject() });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await NCR.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "NCR not found" });

    const body = req.body || {};
    const after = await NCR.findOneAndUpdate(
      { _id: req.params.id, company_id },
      {
        ...body,
        detectedDate: body.detectedDate ? new Date(body.detectedDate) : before.detectedDate,
        updatedBy: req.user?._id,
      },
      { new: true }
    );

    await writeAudit({ req, company_id, entityType: "NCR", entityId: after._id, action: "UPDATE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.close = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await NCR.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "NCR not found" });

    const after = await NCR.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { status: "CLOSED", closedAt: new Date(), closedBy: req.user?._id, updatedBy: req.user?._id },
      { new: true }
    );

    await writeAudit({ req, company_id, entityType: "NCR", entityId: after._id, action: "CLOSE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
