const CalibrationRecord = require("../models/CalibrationRecord");
const { writeAudit } = require("../utils/qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function deriveStatus(nextDueDate) {
  if (!nextDueDate) return "VALID";
  const now = new Date();
  const due = new Date(nextDueDate);
  const days = (due - now) / (1000 * 60 * 60 * 24);
  if (days < 0) return "OVERDUE";
  if (days <= 30) return "DUE_SOON";
  return "VALID";
}

async function nextRecordNo(company_id) {
  const year = new Date().getFullYear();
  const count = await CalibrationRecord.countDocuments({ company_id, recordNo: { $regex: `^CAL-${year}-` } });
  return `CAL-${year}-${String(count + 1).padStart(4, "0")}`;
}

exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, search, from, to } = req.query;
    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { recordNo: { $regex: search, $options: "i" } },
        { equipmentName: { $regex: search, $options: "i" } },
        { equipmentId: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      query.calibrationDate = {};
      if (from) query.calibrationDate.$gte = new Date(from);
      if (to) query.calibrationDate.$lte = new Date(to);
    }

    const rows = await CalibrationRecord.find(query).sort({ calibrationDate: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const row = await CalibrationRecord.findOne({ _id: req.params.id, company_id });
    if (!row) return res.status(404).json({ success: false, message: "Calibration record not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const recordNo = body.recordNo || (await nextRecordNo(company_id));
    const nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : undefined;

    const doc = await CalibrationRecord.create({
      company_id,
      recordNo,
      equipmentName: body.equipmentName,
      equipmentId: body.equipmentId || "",
      location: body.location || "",
      calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : new Date(),
      nextDueDate,
      calibratedBy: body.calibratedBy || "",
      calibrationAgency: body.calibrationAgency || "",
      certificateNo: body.certificateNo || "",
      standardUsed: body.standardUsed || "",
      results: body.results || {},
      status: deriveStatus(nextDueDate),
      remarks: body.remarks || "",
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await writeAudit({ req, company_id, entityType: "CalibrationRecord", entityId: doc._id, action: "CREATE", before: null, after: doc.toObject() });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const before = await CalibrationRecord.findOne({ _id: req.params.id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Calibration record not found" });

    const body = req.body || {};
    const nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : before.nextDueDate;

    const after = await CalibrationRecord.findOneAndUpdate(
      { _id: req.params.id, company_id },
      {
        ...body,
        calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : before.calibrationDate,
        nextDueDate,
        status: body.status || deriveStatus(nextDueDate),
        updatedBy: req.user?._id,
      },
      { new: true }
    );

    await writeAudit({ req, company_id, entityType: "CalibrationRecord", entityId: after._id, action: "UPDATE", before: before.toObject(), after: after.toObject() });
    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDueSoon = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const rows = await CalibrationRecord.find({
      company_id,
      isActive: true,
      status: { $in: ["DUE_SOON", "OVERDUE"] },
    }).sort({ nextDueDate: 1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
