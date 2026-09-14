const PackagingMaterialQC = require("../models/PackagingMaterialQC");
const { writeAudit } = require("../utils/qcAudit");
const { upsertPackagingToResults } = require("../utils/syncModuleToQCResult");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

async function syncPackagingToResults(company_id, doc, user) {
  try {
    await upsertPackagingToResults(company_id, doc, user);
  } catch (err) {
    console.error("Packaging → QCResult sync failed:", err.message);
  }
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { materialType, materialName, batchNo, supplier, status, from, to, page = 1, limit = 20 } = req.query;

    const filter = { company_id, isActive: true };
    if (materialType) filter.materialType = String(materialType);
    if (materialName) filter.materialName = String(materialName);
    if (batchNo) filter.batchNo = String(batchNo);
    if (supplier) filter.supplier = String(supplier);
    if (status) filter.status = String(status);

    if (from || to) {
      filter.testDate = {};
      if (from) filter.testDate.$gte = new Date(from);
      if (to) filter.testDate.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await PackagingMaterialQC.find(filter)
      .sort({ testDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("rejectedBy", "firstName lastName email")
      .lean();

    const total = await PackagingMaterialQC.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error listing Packaging Material QC records", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const doc = await PackagingMaterialQC.findOne({ _id: id, company_id, isActive: true })
      .populate("attachments")
      .populate("createdBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("rejectedBy", "firstName lastName email")
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: "Packaging Material QC record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching Packaging Material QC record", error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    const doc = await PackagingMaterialQC.create({
      company_id,
      materialType: body.materialType,
      materialName: body.materialName,
      batchNo: body.batchNo,
      testDate: body.testDate ? new Date(body.testDate) : new Date(),
      supplier: body.supplier,
      supplierContact: body.supplierContact || "",
      supplierAddress: body.supplierAddress || "",
      coaLink: body.coaLink || "",
      coaNumber: body.coaNumber || "",
      coaDate: body.coaDate ? new Date(body.coaDate) : undefined,
      inspectionResults: body.inspectionResults || {},
      testParameters: body.testParameters || {},
      status: "pending",
      acceptanceNotes: body.acceptanceNotes || "",
      rejectionNotes: body.rejectionNotes || "",
      remarks: body.remarks || "",
      attachments: body.attachments || [],
      createdBy: user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "PackagingMaterialQC",
      entityId: doc._id,
      action: "CREATE",
      before: null,
      after: doc.toObject(),
    });

    await syncPackagingToResults(company_id, doc, user);

    const populated = await PackagingMaterialQC.findById(doc._id).populate("attachments").lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating Packaging Material QC record", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const body = req.body || {};

    const before = await PackagingMaterialQC.findOne({ _id: id, company_id, isActive: true });
    if (!before) return res.status(404).json({ success: false, message: "Packaging Material QC record not found" });

    if (before.status === "approved" || before.status === "rejected") {
      return res.status(400).json({ success: false, message: `Cannot update ${before.status} record` });
    }

    const update = { updatedBy: user?._id };
    Object.keys(body).forEach((key) => {
      if (key !== "_id" && key !== "company_id" && body[key] !== undefined) {
        if (key === "testDate" || key === "coaDate") update[key] = new Date(body[key]);
        else update[key] = body[key];
      }
    });

    const after = await PackagingMaterialQC.findOneAndUpdate({ _id: id, company_id }, update, { new: true })
      .populate("attachments")
      .lean();

    await writeAudit({
      req,
      company_id,
      entityType: "PackagingMaterialQC",
      entityId: after._id,
      action: "UPDATE",
      before: before.toObject(),
      after,
    });

    await syncPackagingToResults(company_id, after, user);

    res.json({ success: true, data: after });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating Packaging Material QC record", error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { acceptanceNotes } = req.body || {};

    const doc = await PackagingMaterialQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Packaging Material QC record not found" });

    if (doc.status === "approved") {
      return res.status(400).json({ success: false, message: "Record is already approved" });
    }

    doc.status = "approved";
    doc.acceptanceNotes = acceptanceNotes || doc.acceptanceNotes || "";
    doc.approvedAt = new Date();
    doc.approvedBy = user?._id;
    doc.updatedBy = user?._id;
    await doc.save();

    await writeAudit({
      req,
      company_id,
      entityType: "PackagingMaterialQC",
      entityId: doc._id,
      action: "APPROVE",
      before: { status: doc.status },
      after: { status: "approved", acceptanceNotes },
    });

    await syncPackagingToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving Packaging Material QC record", error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { rejectionNotes } = req.body || {};

    const doc = await PackagingMaterialQC.findOne({ _id: id, company_id, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: "Packaging Material QC record not found" });

    if (doc.status === "rejected") {
      return res.status(400).json({ success: false, message: "Record is already rejected" });
    }

    doc.status = "rejected";
    doc.rejectionNotes = rejectionNotes || doc.rejectionNotes || "";
    doc.rejectedAt = new Date();
    doc.rejectedBy = user?._id;
    doc.updatedBy = user?._id;
    await doc.save();

    await writeAudit({
      req,
      company_id,
      entityType: "PackagingMaterialQC",
      entityId: doc._id,
      action: "REJECT",
      before: { status: doc.status },
      after: { status: "rejected", rejectionNotes },
    });

    await syncPackagingToResults(company_id, doc, user);

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting Packaging Material QC record", error: err.message });
  }
};

