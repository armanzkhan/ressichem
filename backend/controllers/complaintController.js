const Complaint = require("../models/Complaint");
const CAPA = require("../models/CAPA");
const ElectronicSignature = require("../models/ElectronicSignature");
const { writeAudit } = require("../utils/qcAudit");
const { canSeeCustomerData, requireCustomerDataAccess } = require("../middleware/qcRndAccessMiddleware");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Get all complaints
exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { status, severity, productType, from, to, search } = req.query;

    // Access control: Only QC and Management can see complaints
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D users cannot access customer data." });
    }

    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (productType) query.productType = productType;
    if (search) {
      query.$or = [
        { complaintNo: { $regex: search, $options: "i" } },
        { "customer.customerName": { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { batchNo: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      query.receivedDate = {};
      if (from) query.receivedDate.$gte = new Date(from);
      if (to) query.receivedDate.$lte = new Date(to);
    }

    const complaints = await Complaint.find(query)
      .populate("formulation")
      .populate("capa")
      .populate("assignedTo", "firstName lastName email")
      .populate("initiatedBy", "firstName lastName email")
      .populate("investigation.investigatedBy", "firstName lastName email")
      .populate("managementReviewedBy", "firstName lastName email")
      .populate("resolvedBy", "firstName lastName email")
      .populate("closureSignature")
      .sort({ receivedDate: -1 });

    return res.json({ success: true, data: complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single complaint
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;

    // Access control
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D users cannot access customer data." });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, company_id })
      .populate("formulation")
      .populate("capa")
      .populate("assignedTo", "firstName lastName email")
      .populate("initiatedBy", "firstName lastName email")
      .populate("investigation.investigatedBy", "firstName lastName email")
      .populate("managementReviewedBy", "firstName lastName email")
      .populate("resolvedBy", "firstName lastName email")
      .populate("closureSignature")
      .populate("attachments");

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    return res.json({ success: true, data: complaint });
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create complaint (QC layer only)
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    // Access control: Only QC and Management can create complaints
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. Only QC users can initiate complaints." });
    }

    // Generate complaint number if not provided
    if (!body.complaintNo) {
      const year = new Date().getFullYear();
      const count = await Complaint.countDocuments({ company_id, complaintNo: { $regex: `^COMP-${year}-` } });
      body.complaintNo = `COMP-${year}-${String(count + 1).padStart(3, "0")}`;
    }

    // Check for duplicate
    const existing = await Complaint.findOne({ company_id, complaintNo: body.complaintNo });
    if (existing) {
      return res.status(409).json({ success: false, message: "Complaint number already exists" });
    }

    const complaint = await Complaint.create({
      ...body,
      company_id,
      receivedDate: body.receivedDate || new Date(),
      status: "RECEIVED",
      initiatedBy: user?._id,
      createdBy: user?._id,
      updatedBy: user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "CREATE",
      before: null,
      after: complaint.toObject(),
    });

    const populated = await Complaint.findById(complaint._id)
      .populate("formulation")
      .populate("initiatedBy", "firstName lastName email");

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating complaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update complaint
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;

    // Access control
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D users cannot access customer data." });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, company_id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const before = complaint.toObject();
    Object.assign(complaint, req.body);
    complaint.updatedBy = user?._id;
    await complaint.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "UPDATE",
      before,
      after: complaint.toObject(),
    });

    const populated = await Complaint.findById(complaint._id)
      .populate("formulation")
      .populate("assignedTo", "firstName lastName email");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error updating complaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Start investigation (QC Supervisor)
exports.startInvestigation = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { findings, rootCause, evidence } = req.body || {};

    // Access control: Only QC and Management
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const complaint = await Complaint.findOne({ _id: id, company_id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status !== "RECEIVED" && complaint.status !== "UNDER_INVESTIGATION") {
      return res.status(400).json({ success: false, message: `Cannot start investigation. Current status: ${complaint.status}` });
    }

    const before = complaint.toObject();
    complaint.status = "UNDER_INVESTIGATION";
    complaint.investigation = {
      investigatedBy: user._id,
      investigationDate: new Date(),
      findings: findings || "",
      rootCause: rootCause || "",
      evidence: evidence || [],
    };
    complaint.updatedBy = user._id;
    await complaint.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "START_INVESTIGATION",
      before,
      after: complaint.toObject(),
    });

    const populated = await Complaint.findById(complaint._id)
      .populate("investigation.investigatedBy", "firstName lastName email");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error starting investigation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Submit for management review
exports.submitForManagementReview = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;

    // Access control: Only QC and Management
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const complaint = await Complaint.findOne({ _id: id, company_id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status !== "UNDER_INVESTIGATION") {
      return res.status(400).json({ success: false, message: "Complaint must be under investigation first" });
    }

    const before = complaint.toObject();
    complaint.status = "MANAGEMENT_REVIEW";
    complaint.updatedBy = user._id;
    await complaint.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "SUBMIT_FOR_MANAGEMENT_REVIEW",
      before,
      after: complaint.toObject(),
    });

    return res.json({ success: true, data: complaint });
  } catch (error) {
    console.error("Error submitting for management review:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Management review
exports.managementReview = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { comments, initiateCAPA } = req.body || {};

    // Access control: Only Management
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer !== "MANAGEMENT") {
      return res.status(403).json({ success: false, message: "Only Management can review complaints" });
    }

    const complaint = await Complaint.findOne({ _id: id, company_id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status !== "MANAGEMENT_REVIEW") {
      return res.status(400).json({ success: false, message: "Complaint must be in management review status" });
    }

    const before = complaint.toObject();
    complaint.managementReviewed = true;
    complaint.managementReviewedAt = new Date();
    complaint.managementReviewedBy = user._id;
    complaint.managementComments = comments || "";

    // Initiate CAPA if requested
    if (initiateCAPA) {
      const capa = await CAPA.create({
        company_id,
        sourceType: "COMPLAINT",
        sourceReference: complaint.complaintNo,
        sourceEntityId: complaint._id,
        problemDescription: `Complaint ${complaint.complaintNo}: ${complaint.description}`,
        identifiedDate: new Date(),
        status: "INITIATED",
        initiatedBy: user._id,
        createdBy: user._id,
        updatedBy: user._id,
      });

      complaint.capa = capa._id;
      complaint.status = "CAPA_INITIATED";
    } else {
      complaint.status = "RESOLVED";
    }

    complaint.updatedBy = user._id;
    await complaint.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "MANAGEMENT_REVIEW",
      before,
      after: complaint.toObject(),
    });

    const populated = await Complaint.findById(complaint._id)
      .populate("capa")
      .populate("managementReviewedBy", "firstName lastName email");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error in management review:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve complaint
exports.resolve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { resolution, customerSatisfied, customerFeedback } = req.body || {};

    // Access control: Only QC and Management
    if (user && !user.isSuperAdmin && !canSeeCustomerData(user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const complaint = await Complaint.findOne({ _id: id, company_id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const before = complaint.toObject();
    complaint.resolution = resolution || "";
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = user._id;
    complaint.customerSatisfied = customerSatisfied;
    complaint.customerFeedback = customerFeedback || "";
    complaint.status = "RESOLVED";
    complaint.updatedBy = user._id;
    await complaint.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "RESOLVE",
      before,
      after: complaint.toObject(),
    });

    return res.json({ success: true, data: complaint });
  } catch (error) {
    console.error("Error resolving complaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Close complaint (with e-signature)
exports.close = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { comments } = req.body || {};

    // Access control: Only Management can close
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer !== "MANAGEMENT") {
      return res.status(403).json({ success: false, message: "Only Management can close complaints" });
    }

    const complaint = await Complaint.findOne({ _id: id, company_id });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ success: false, message: "Complaint must be resolved before closure" });
    }

    // Create electronic signature
    const signature = await ElectronicSignature.create({
      company_id,
      signatureType: "COMPLAINT_CLOSURE",
      relatedEntityType: "COMPLAINT",
      relatedEntityId: complaint._id,
      signer: {
        userId: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        role: user.qcRndProfile?.managementRole || user.role || "Management",
        department: user.department || "",
      },
      action: "Closed complaint",
      comments: comments || "",
      signedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const before = complaint.toObject();
    complaint.status = "CLOSED";
    complaint.closureSignature = signature._id;
    complaint.updatedBy = user._id;
    await complaint.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Complaint",
      entityId: complaint._id,
      action: "CLOSE",
      before,
      after: complaint.toObject(),
      meta: { signatureId: signature._id },
    });

    const populated = await Complaint.findById(complaint._id)
      .populate("closureSignature");

    return res.json({ success: true, data: populated, message: "Complaint closed" });
  } catch (error) {
    console.error("Error closing complaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

