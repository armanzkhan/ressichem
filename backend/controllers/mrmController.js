const MRM = require("../models/MRM");
const QCResult = require("../models/QCResult");
const Complaint = require("../models/Complaint");
const CAPA = require("../models/CAPA");
const ElectronicSignature = require("../models/ElectronicSignature");
const { writeAudit } = require("../utils/qcAudit");
const { canConductMRM } = require("../middleware/qcRndAccessMiddleware");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Pull QC performance data
async function pullQCPerformance(company_id, periodStart, periodEnd) {
  const filter = {
    company_id,
    isActive: true,
    testDate: { $gte: periodStart, $lte: periodEnd },
    status: { $in: ["approved", "submitted"] },
  };

  const results = await QCResult.find(filter).lean();
  const totalBatches = results.length;
  const passedBatches = results.filter((r) => r.status === "approved").length;
  const failedBatches = totalBatches - passedBatches;
  const passRate = totalBatches > 0 ? (passedBatches / totalBatches) * 100 : 0;

  // Count out-of-spec (this would need to be calculated based on standards)
  const outOfSpecCount = 0; // TODO: Implement actual out-of-spec calculation

  return {
    totalBatches,
    passedBatches,
    failedBatches,
    passRate: Math.round(passRate * 100) / 100,
    outOfSpecCount,
    summary: `Total batches: ${totalBatches}, Pass rate: ${passRate.toFixed(2)}%`,
  };
}

// Pull complaints data
async function pullComplaints(company_id, periodStart, periodEnd) {
  const filter = {
    company_id,
    isActive: true,
    receivedDate: { $gte: periodStart, $lte: periodEnd },
  };

  const complaints = await Complaint.find(filter).lean();
  const total = complaints.length;
  const unresolved = complaints.filter((c) => !["RESOLVED", "CLOSED"].includes(c.status)).length;

  const byType = {};
  const bySeverity = {};
  complaints.forEach((c) => {
    byType[c.complaintType] = (byType[c.complaintType] || 0) + 1;
    bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
  });

  return {
    total,
    byType,
    bySeverity,
    unresolved,
    summary: `Total complaints: ${total}, Unresolved: ${unresolved}`,
  };
}

// Pull CAPA data
async function pullCAPA(company_id, periodStart, periodEnd) {
  const filter = {
    company_id,
    isActive: true,
    identifiedDate: { $gte: periodStart, $lte: periodEnd },
  };

  const capas = await CAPA.find(filter).lean();
  const total = capas.length;
  const open = capas.filter((c) => !["CLOSED", "REJECTED"].includes(c.status)).length;
  const closed = capas.filter((c) => c.status === "CLOSED").length;
  const overdue = capas.filter((c) => {
    if (!c.targetClosureDate) return false;
    return new Date(c.targetClosureDate) < new Date() && c.status !== "CLOSED";
  }).length;

  return {
    total,
    open,
    closed,
    overdue,
    summary: `Total CAPAs: ${total}, Open: ${open}, Closed: ${closed}, Overdue: ${overdue}`,
  };
}

// Pull EN compliance data
async function pullENCompliance(company_id, periodStart, periodEnd) {
  // This is a simplified version - would need actual EN standard checking logic
  const filter = {
    company_id,
    isActive: true,
    testDate: { $gte: periodStart, $lte: periodEnd },
    status: "approved",
  };

  const results = await QCResult.find(filter).lean();
  const totalProducts = new Set(results.map((r) => `${r.productName}-${r.grade}`)).size;
  const compliant = 0; // TODO: Implement actual EN compliance checking
  const nonCompliant = 0;

  return {
    totalProducts,
    compliant,
    nonCompliant,
    complianceRate: totalProducts > 0 ? (compliant / totalProducts) * 100 : 0,
    details: [],
    summary: `Total products tested: ${totalProducts}, Compliance rate: ${totalProducts > 0 ? ((compliant / totalProducts) * 100).toFixed(2) : 0}%`,
  };
}

// Get all MRMs
exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { reviewPeriod, status, from, to } = req.query;

    const query = { company_id, isActive: true };
    if (reviewPeriod) query.reviewPeriod = reviewPeriod;
    if (status) query.status = status;
    if (from || to) {
      query.meetingDate = {};
      if (from) query.meetingDate.$gte = new Date(from);
      if (to) query.meetingDate.$lte = new Date(to);
    }

    const mrms = await MRM.find(query)
      .populate("chairperson", "firstName lastName email")
      .populate("attendees.user", "firstName lastName email")
      .populate("actionItems.assignedTo", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("approvalSignature")
      .sort({ meetingDate: -1 });

    return res.json({ success: true, data: mrms });
  } catch (error) {
    console.error("Error fetching MRMs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single MRM
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const mrm = await MRM.findOne({ _id: req.params.id, company_id })
      .populate("chairperson", "firstName lastName email")
      .populate("attendees.user", "firstName lastName email")
      .populate("attendees.signature")
      .populate("actionItems.assignedTo", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("approvalSignature")
      .populate("attachments");

    if (!mrm) {
      return res.status(404).json({ success: false, message: "MRM not found" });
    }

    return res.json({ success: true, data: mrm });
  } catch (error) {
    console.error("Error fetching MRM:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create MRM
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    // Access control: Only Management
    if (user && !user.isSuperAdmin && !canConductMRM(user)) {
      return res.status(403).json({ success: false, message: "Only Management can create MRMs" });
    }

    // Generate MRM number if not provided
    if (!body.mrmNo) {
      const year = new Date().getFullYear();
      const period = body.reviewPeriod === "QUARTERLY" ? `Q${Math.floor(new Date().getMonth() / 3) + 1}` : body.reviewPeriod?.substring(0, 3) || "ADH";
      const count = await MRM.countDocuments({ company_id, mrmNo: { $regex: `^MRM-${year}-${period}-` } });
      body.mrmNo = `MRM-${year}-${period}-${String(count + 1).padStart(2, "0")}`;
    }

    // Check for duplicate
    const existing = await MRM.findOne({ company_id, mrmNo: body.mrmNo });
    if (existing) {
      return res.status(409).json({ success: false, message: "MRM number already exists" });
    }

    const mrm = await MRM.create({
      ...body,
      company_id,
      status: "SCHEDULED",
      createdBy: user?._id,
      updatedBy: user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "MRM",
      entityId: mrm._id,
      action: "CREATE",
      before: null,
      after: mrm.toObject(),
    });

    const populated = await MRM.findById(mrm._id)
      .populate("chairperson", "firstName lastName email");

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating MRM:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update MRM
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;

    // Access control: Only Management
    if (user && !user.isSuperAdmin && !canConductMRM(user)) {
      return res.status(403).json({ success: false, message: "Only Management can update MRMs" });
    }

    const mrm = await MRM.findOne({ _id: req.params.id, company_id });
    if (!mrm) {
      return res.status(404).json({ success: false, message: "MRM not found" });
    }

    const before = mrm.toObject();
    Object.assign(mrm, req.body);
    mrm.updatedBy = user?._id;
    await mrm.save();

    await writeAudit({
      req,
      company_id,
      entityType: "MRM",
      entityId: mrm._id,
      action: "UPDATE",
      before,
      after: mrm.toObject(),
    });

    return res.json({ success: true, data: mrm });
  } catch (error) {
    console.error("Error updating MRM:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Pull data for MRM
exports.pullData = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    // Access control: Only Management
    if (user && !user.isSuperAdmin && !canConductMRM(user)) {
      return res.status(403).json({ success: false, message: "Only Management can pull MRM data" });
    }

    const mrm = await MRM.findOne({ _id: id, company_id });
    if (!mrm) {
      return res.status(404).json({ success: false, message: "MRM not found" });
    }

    const [qcPerformance, complaints, capa, enCompliance] = await Promise.all([
      pullQCPerformance(company_id, mrm.periodStart, mrm.periodEnd),
      pullComplaints(company_id, mrm.periodStart, mrm.periodEnd),
      pullCAPA(company_id, mrm.periodStart, mrm.periodEnd),
      pullENCompliance(company_id, mrm.periodStart, mrm.periodEnd),
    ]);

    const before = mrm.toObject();
    mrm.qcPerformance = qcPerformance;
    mrm.complaints = complaints;
    mrm.capa = capa;
    mrm.enCompliance = enCompliance;
    mrm.updatedBy = user._id;
    await mrm.save();

    await writeAudit({
      req,
      company_id,
      entityType: "MRM",
      entityId: mrm._id,
      action: "PULL_DATA",
      before,
      after: mrm.toObject(),
    });

    return res.json({ success: true, data: mrm });
  } catch (error) {
    console.error("Error pulling MRM data:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete MRM
exports.complete = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { minutes, decisions, actionItems } = req.body || {};

    // Access control: Only Management
    if (user && !user.isSuperAdmin && !canConductMRM(user)) {
      return res.status(403).json({ success: false, message: "Only Management can complete MRMs" });
    }

    const mrm = await MRM.findOne({ _id: id, company_id });
    if (!mrm) {
      return res.status(404).json({ success: false, message: "MRM not found" });
    }

    const before = mrm.toObject();
    mrm.status = "COMPLETED";
    mrm.actualEndDate = new Date();
    if (minutes) mrm.minutes = minutes;
    if (decisions) mrm.decisions = decisions;
    if (actionItems) mrm.actionItems = actionItems;
    mrm.updatedBy = user._id;
    await mrm.save();

    await writeAudit({
      req,
      company_id,
      entityType: "MRM",
      entityId: mrm._id,
      action: "COMPLETE",
      before,
      after: mrm.toObject(),
    });

    return res.json({ success: true, data: mrm });
  } catch (error) {
    console.error("Error completing MRM:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Approve MRM (with e-signature)
exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { comments } = req.body || {};

    // Access control: Only Management
    if (user && !user.isSuperAdmin && !canConductMRM(user)) {
      return res.status(403).json({ success: false, message: "Only Management can approve MRMs" });
    }

    const mrm = await MRM.findOne({ _id: id, company_id });
    if (!mrm) {
      return res.status(404).json({ success: false, message: "MRM not found" });
    }

    if (mrm.status !== "COMPLETED") {
      return res.status(400).json({ success: false, message: "MRM must be completed before approval" });
    }

    // Create electronic signature
    const signature = await ElectronicSignature.create({
      company_id,
      signatureType: "MRM_APPROVAL",
      relatedEntityType: "MRM",
      relatedEntityId: mrm._id,
      signer: {
        userId: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        role: user.qcRndProfile?.managementRole || user.role || "Management",
        department: user.department || "",
      },
      action: "Approved Management Review Meeting",
      comments: comments || "",
      signedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const before = mrm.toObject();
    mrm.status = "APPROVED";
    mrm.approved = true;
    mrm.approvedAt = new Date();
    mrm.approvedBy = user._id;
    mrm.approvalSignature = signature._id;
    mrm.updatedBy = user._id;
    await mrm.save();

    await writeAudit({
      req,
      company_id,
      entityType: "MRM",
      entityId: mrm._id,
      action: "APPROVE",
      before,
      after: mrm.toObject(),
      meta: { signatureId: signature._id },
    });

    const populated = await MRM.findById(mrm._id)
      .populate("approvedBy", "firstName lastName email")
      .populate("approvalSignature");

    return res.json({ success: true, data: populated, message: "MRM approved" });
  } catch (error) {
    console.error("Error approving MRM:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

