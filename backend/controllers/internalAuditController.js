const InternalAudit = require("../models/InternalAudit");
const { writeAudit } = require("../utils/qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function nextAuditNo(company_id) {
  const year = new Date().getFullYear();
  const count = await InternalAudit.countDocuments({ company_id, auditNo: { $regex: `^AUD-${year}-` } });
  return `AUD-${year}-${String(count + 1).padStart(4, "0")}`;
}

exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, auditType, search, from, to } = req.query;
    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (auditType) query.auditType = auditType;
    if (search) {
      query.$or = [
        { auditNo: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { auditor: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      query.auditDate = {};
      if (from) query.auditDate.$gte = new Date(from);
      if (to) query.auditDate.$lte = new Date(to);
    }

    const rows = await InternalAudit.find(query).sort({ auditDate: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const row = await InternalAudit.findOne({ _id: req.params.id, company_id });
    if (!row) return res.status(404).json({ success: false, message: "Audit not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const auditNo = body.auditNo || (await nextAuditNo(company_id));

    const doc = await InternalAudit.create({
      company_id,
      auditNo,
      title: body.title,
      auditType: body.auditType || "INTERNAL",
      auditDate: body.auditDate ? new Date(body.auditDate) : new Date(),
      auditor: body.auditor || "",
      auditee: body.auditee || "",
      scope: body.scope || "",
      findings: body.findings || [],
      summary: body.summary || "",
      conclusion: body.conclusion || "",
      status: body.status || "DRAFT",
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({ req, company_id, entityType: "InternalAudit", entityId: doc._id, action: "CREATE", before: null, after: doc.toObject() });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await InternalAudit.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Audit not found" });

    const body = req.body || {};
    const after = await InternalAudit.findOneAndUpdate(
      { _id: req.params.id, company_id },
      {
        ...body,
        auditDate: body.auditDate ? new Date(body.auditDate) : before.auditDate,
        updatedBy: req.user?._id,
      },
      { new: true }
    );

    await writeAudit({ req, company_id, entityType: "InternalAudit", entityId: after._id, action: "UPDATE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await InternalAudit.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Audit not found" });

    const after = await InternalAudit.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { status: "APPROVED", approvedAt: new Date(), approvedBy: req.user?._id, updatedBy: req.user?._id },
      { new: true }
    );

    await writeAudit({ req, company_id, entityType: "InternalAudit", entityId: after._id, action: "APPROVE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
