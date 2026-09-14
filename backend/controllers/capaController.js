const CAPA = require("../models/CAPA");
const ElectronicSignature = require("../models/ElectronicSignature");
const { writeAudit } = require("../utils/qcAudit");
const { canCloseCAPA, canAccessQcData } = require("../middleware/qcRndAccessMiddleware");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Get all CAPAs
exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, sourceType, priority, assignedTo, from, to, search } = req.query;

    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (sourceType) query.sourceType = sourceType;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { capaNo: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { problemDescription: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      query.identifiedDate = {};
      if (from) query.identifiedDate.$gte = new Date(from);
      if (to) query.identifiedDate.$lte = new Date(to);
    }

    const capas = await CAPA.find(query)
      .populate("initiatedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
      .populate("owner", "firstName lastName email")
      .populate("rootCauseAnalysis.conductedBy", "firstName lastName email")
      .populate("managementApproval.approvedBy", "firstName lastName email")
      .populate("managementApproval.approvalSignature")
      .populate("implementation.startedBy", "firstName lastName email")
      .populate("verification.verifiedBy", "firstName lastName email")
      .populate("closure.closedBy", "firstName lastName email")
      .populate("closure.closureSignature")
      .sort({ identifiedDate: -1 });

    return res.json({ success: true, data: capas });
  } catch (error) {
    console.error("Error fetching CAPAs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single CAPA
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const capa = await CAPA.findOne({ _id: req.params.id, company_id })
      .populate("initiatedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
      .populate("owner", "firstName lastName email")
      .populate("rootCauseAnalysis.conductedBy", "firstName lastName email")
      .populate("managementApproval.approvedBy", "firstName lastName email")
      .populate("managementApproval.approvalSignature")
      .populate("implementation.startedBy", "firstName lastName email")
      .populate("verification.verifiedBy", "firstName lastName email")
      .populate("closure.closedBy", "firstName lastName email")
      .populate("closure.closureSignature");

    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    return res.json({ success: true, data: capa });
  } catch (error) {
    console.error("Error fetching CAPA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create CAPA (QC can initiate)
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    // Access control: QC and Management can create
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. QC or Management access required." });
    }

    // Generate CAPA number if not provided
    if (!body.capaNo) {
      const year = new Date().getFullYear();
      const count = await CAPA.countDocuments({ company_id, capaNo: { $regex: `^CAPA-${year}-` } });
      body.capaNo = `CAPA-${year}-${String(count + 1).padStart(3, "0")}`;
    }

    // Check for duplicate
    const existing = await CAPA.findOne({ company_id, capaNo: body.capaNo });
    if (existing) {
      return res.status(409).json({ success: false, message: "CAPA number already exists" });
    }

    const capa = await CAPA.create({
      ...body,
      company_id,
      identifiedDate: body.identifiedDate || new Date(),
      status: "INITIATED",
      initiatedBy: user?._id,
      createdBy: user?._id,
      updatedBy: user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "CREATE",
      before: null,
      after: capa.toObject(),
    });

    const populated = await CAPA.findById(capa._id)
      .populate("initiatedBy", "firstName lastName email");

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating CAPA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update CAPA
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;

    // Access control
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const capa = await CAPA.findOne({ _id: req.params.id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    const before = capa.toObject();
    Object.assign(capa, req.body);
    capa.updatedBy = user?._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "UPDATE",
      before,
      after: capa.toObject(),
    });

    return res.json({ success: true, data: capa });
  } catch (error) {
    console.error("Error updating CAPA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Conduct root cause analysis
exports.conductRootCauseAnalysis = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { method, rootCauses, analysisDetails } = req.body || {};

    // Access control
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (capa.status !== "INITIATED" && capa.status !== "ROOT_CAUSE_ANALYSIS") {
      return res.status(400).json({ success: false, message: `Cannot conduct root cause analysis. Current status: ${capa.status}` });
    }

    const before = capa.toObject();
    capa.status = "ROOT_CAUSE_ANALYSIS";
    capa.rootCauseAnalysis = {
      conductedBy: user._id,
      conductedDate: new Date(),
      method: method || "",
      rootCauses: rootCauses || [],
      analysisDetails: analysisDetails || "",
    };
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "ROOT_CAUSE_ANALYSIS",
      before,
      after: capa.toObject(),
    });

    const populated = await CAPA.findById(capa._id)
      .populate("rootCauseAnalysis.conductedBy", "firstName lastName email");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error conducting root cause analysis:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Submit for management approval
exports.submitForApproval = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    // Access control
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (!capa.rootCauseAnalysis?.conductedBy) {
      return res.status(400).json({ success: false, message: "Root cause analysis must be conducted first" });
    }

    if (capa.correctiveActions.length === 0 && capa.preventiveActions.length === 0) {
      return res.status(400).json({ success: false, message: "At least one corrective or preventive action is required" });
    }

    const before = capa.toObject();
    capa.status = "PENDING_APPROVAL";
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "SUBMIT_FOR_APPROVAL",
      before,
      after: capa.toObject(),
    });

    return res.json({ success: true, data: capa });
  } catch (error) {
    console.error("Error submitting for approval:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Management approval
exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { comments } = req.body || {};

    // Access control: Only Management
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer !== "MANAGEMENT") {
      return res.status(403).json({ success: false, message: "Only Management can approve CAPAs" });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (capa.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ success: false, message: "CAPA must be pending approval" });
    }

    // Create electronic signature
    const signature = await ElectronicSignature.create({
      company_id,
      signatureType: "CAPA_APPROVAL",
      relatedEntityType: "CAPA",
      relatedEntityId: capa._id,
      signer: {
        userId: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        role: user.qcRndProfile?.managementRole || user.role || "Management",
        department: user.department || "",
      },
      action: "Approved CAPA",
      comments: comments || "",
      signedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const before = capa.toObject();
    capa.status = "APPROVED";
    capa.managementApproval = {
      approved: true,
      approvedAt: new Date(),
      approvedBy: user._id,
      approvalSignature: signature._id,
      comments: comments || "",
    };
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "APPROVE",
      before,
      after: capa.toObject(),
      meta: { signatureId: signature._id },
    });

    const populated = await CAPA.findById(capa._id)
      .populate("managementApproval.approvedBy", "firstName lastName email")
      .populate("managementApproval.approvalSignature");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error approving CAPA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Start implementation
exports.startImplementation = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { notes } = req.body || {};

    // Access control
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (capa.status !== "APPROVED") {
      return res.status(400).json({ success: false, message: "CAPA must be approved before implementation" });
    }

    const before = capa.toObject();
    capa.status = "IMPLEMENTATION";
    capa.implementation = {
      started: true,
      startedAt: new Date(),
      startedBy: user._id,
      progress: 0,
      notes: notes || "",
    };
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "START_IMPLEMENTATION",
      before,
      after: capa.toObject(),
    });

    return res.json({ success: true, data: capa });
  } catch (error) {
    console.error("Error starting implementation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update implementation progress
exports.updateImplementation = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { progress, notes } = req.body || {};

    // Access control
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (capa.status !== "IMPLEMENTATION") {
      return res.status(400).json({ success: false, message: "CAPA must be in implementation status" });
    }

    const before = capa.toObject();
    if (progress !== undefined) capa.implementation.progress = Math.min(100, Math.max(0, progress));
    if (notes !== undefined) capa.implementation.notes = notes;
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "UPDATE_IMPLEMENTATION",
      before,
      after: capa.toObject(),
    });

    return res.json({ success: true, data: capa });
  } catch (error) {
    console.error("Error updating implementation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify implementation
exports.verify = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { verificationMethod, verificationResults, evidence } = req.body || {};

    // Access control
    if (user && !user.isSuperAdmin && !canAccessQcData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (capa.status !== "IMPLEMENTATION") {
      return res.status(400).json({ success: false, message: "CAPA must be in implementation status" });
    }

    const before = capa.toObject();
    capa.status = "VERIFICATION";
    capa.verification = {
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: user._id,
      verificationMethod: verificationMethod || "",
      verificationResults: verificationResults || "",
      evidence: evidence || [],
    };
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "VERIFY",
      before,
      after: capa.toObject(),
    });

    const populated = await CAPA.findById(capa._id)
      .populate("verification.verifiedBy", "firstName lastName email");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error verifying CAPA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Close CAPA (Management only, with e-signature)
exports.close = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { closureComments } = req.body || {};

    // Access control: Only Management
    if (user && !user.isSuperAdmin && !canCloseCAPA(user)) {
      return res.status(403).json({ success: false, message: "Only Management can close CAPAs" });
    }

    const capa = await CAPA.findOne({ _id: id, company_id });
    if (!capa) {
      return res.status(404).json({ success: false, message: "CAPA not found" });
    }

    if (capa.status !== "VERIFICATION") {
      return res.status(400).json({ success: false, message: "CAPA must be verified before closure" });
    }

    // Create electronic signature
    const signature = await ElectronicSignature.create({
      company_id,
      signatureType: "CAPA_CLOSURE",
      relatedEntityType: "CAPA",
      relatedEntityId: capa._id,
      signer: {
        userId: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        role: user.qcRndProfile?.managementRole || user.role || "Management",
        department: user.department || "",
      },
      action: "Closed CAPA",
      comments: closureComments || "",
      signedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const before = capa.toObject();
    capa.status = "CLOSED";
    capa.closure = {
      closed: true,
      closedAt: new Date(),
      closedBy: user._id,
      closureSignature: signature._id,
      closureComments: closureComments || "",
    };
    capa.updatedBy = user._id;
    await capa.save();

    await writeAudit({
      req,
      company_id,
      entityType: "CAPA",
      entityId: capa._id,
      action: "CLOSE",
      before,
      after: capa.toObject(),
      meta: { signatureId: signature._id },
    });

    const populated = await CAPA.findById(capa._id)
      .populate("closure.closedBy", "firstName lastName email")
      .populate("closure.closureSignature");

    return res.json({ success: true, data: populated, message: "CAPA closed" });
  } catch (error) {
    console.error("Error closing CAPA:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

