const Formulation = require("../models/Formulation");
const RawMaterial = require("../models/RawMaterial");
const RawMaterialBatch = require("../models/RawMaterialBatch");
const ElectronicSignature = require("../models/ElectronicSignature");
const { writeAudit } = require("../utils/qcAudit");
const { canReleaseToQC, canFreezeFormulations, canAccessRndData, canAccessQcData } = require("../middleware/qcRndAccessMiddleware");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Calculate cost for formulation
async function calculateCost(ingredients, totalQuantity = 1000) {
  let totalCost = 0;
  for (const ing of ingredients) {
    if (ing.rawMaterial && ing.quantity) {
      const material = await RawMaterial.findById(ing.rawMaterial).lean();
      if (material && ing.costPerUnit) {
        totalCost += ing.quantity * ing.costPerUnit;
      }
    }
  }
  return {
    estimatedCostPerUnit: totalCost / totalQuantity,
    estimatedCostPerTon: (totalCost / totalQuantity) * 1000,
  };
}

// Get all formulations
exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { mode, status, productType, search, isActive } = req.query;
    const user = req.user;

    const query = { company_id };
    if (mode) query.mode = mode;
    if (status) query.status = status;
    if (productType) query.productType = productType;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { formulationCode: { $regex: search, $options: "i" } },
        { formulationName: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
      ];
    }

    // Access control: QC users can only see QC-approved formulations
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer === "QC") {
      query.mode = "QC";
      query.status = { $in: ["QC_APPROVED", "FROZEN"] };
    }

    // R&D users can only see R&D formulations
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer === "R&D") {
      query.mode = "R&D";
    }

    const formulations = await Formulation.find(query)
      .populate("ingredients.rawMaterial")
      .populate("ingredients.rawMaterialBatch")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: formulations });
  } catch (error) {
    console.error("Error fetching formulations:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single formulation
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const formulation = await Formulation.findOne({ _id: req.params.id, company_id })
      .populate("ingredients.rawMaterial")
      .populate("ingredients.rawMaterialBatch")
      .populate("qcApprovalSignature")
      .lean();

    if (!formulation) {
      return res.status(404).json({ success: false, message: "Formulation not found" });
    }

    // Access control
    if (user && !user.isSuperAdmin) {
      if (user.qcRndProfile?.layer === "QC" && formulation.mode !== "QC") {
        return res.status(403).json({ success: false, message: "QC users cannot access R&D formulations" });
      }
      if (user.qcRndProfile?.layer === "R&D" && formulation.mode === "QC" && formulation.status !== "QC_APPROVED") {
        return res.status(403).json({ success: false, message: "R&D users cannot access QC formulations" });
      }
    }

    return res.json({ success: true, data: formulation });
  } catch (error) {
    console.error("Error fetching formulation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create formulation
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    // Determine mode based on user layer
    let mode = body.mode || "R&D";
    if (user && !user.isSuperAdmin) {
      if (user.qcRndProfile?.layer === "QC") {
        return res.status(403).json({ success: false, message: "QC users cannot create formulations" });
      }
      if (user.qcRndProfile?.layer === "R&D") {
        mode = "R&D";
      }
    }

    // Check for duplicate formulation code
    const existing = await Formulation.findOne({ company_id, formulationCode: body.formulationCode, version: body.version || "1.0" });
    if (existing) {
      return res.status(409).json({ success: false, message: "Formulation code and version already exists" });
    }

    // Calculate cost
    const costData = await calculateCost(body.ingredients || [], body.totalQuantity || 1000);

    const formulation = await Formulation.create({
      ...body,
      company_id,
      mode,
      status: mode === "R&D" ? "R&D_ACTIVE" : "DRAFT",
      ...costData,
      lastCostUpdate: new Date(),
      createdBy: user?._id,
      updatedBy: user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "Formulation",
      entityId: formulation._id,
      action: "CREATE",
      before: null,
      after: formulation.toObject(),
    });

    const populated = await Formulation.findById(formulation._id)
      .populate("ingredients.rawMaterial")
      .populate("ingredients.rawMaterialBatch");

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating formulation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update formulation
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const formulation = await Formulation.findOne({ _id: req.params.id, company_id });

    if (!formulation) {
      return res.status(404).json({ success: false, message: "Formulation not found" });
    }

    // Access control
    if (user && !user.isSuperAdmin) {
      if (user.qcRndProfile?.layer === "QC") {
        return res.status(403).json({ success: false, message: "QC users cannot edit formulations" });
      }
      if (formulation.frozen) {
        return res.status(403).json({ success: false, message: "Frozen formulations cannot be edited" });
      }
      if (formulation.mode === "QC" && formulation.status === "QC_APPROVED") {
        return res.status(403).json({ success: false, message: "QC-approved formulations cannot be edited" });
      }
    }

    // Recalculate cost if ingredients changed
    if (req.body.ingredients) {
      const costData = await calculateCost(req.body.ingredients, req.body.totalQuantity || formulation.totalQuantity);
      req.body = { ...req.body, ...costData, lastCostUpdate: new Date() };
    }

    const before = formulation.toObject();
    Object.assign(formulation, req.body);
    formulation.updatedBy = user?._id;
    await formulation.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Formulation",
      entityId: formulation._id,
      action: "UPDATE",
      before,
      after: formulation.toObject(),
    });

    const populated = await Formulation.findById(formulation._id)
      .populate("ingredients.rawMaterial")
      .populate("ingredients.rawMaterialBatch");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error updating formulation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create new version
exports.createVersion = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { parentId } = req.params;
    const { changeReason, version } = req.body || {};

    const parent = await Formulation.findOne({ _id: parentId, company_id });
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent formulation not found" });
    }

    // Access control
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer === "QC") {
      return res.status(403).json({ success: false, message: "QC users cannot create versions" });
    }

    const newVersion = version || (parseFloat(parent.version) + 0.1).toFixed(1);

    // Check for duplicate version
    const existing = await Formulation.findOne({ company_id, formulationCode: parent.formulationCode, version: newVersion });
    if (existing) {
      return res.status(409).json({ success: false, message: "Version already exists" });
    }

    const costData = await calculateCost(parent.ingredients, parent.totalQuantity);

    const newFormulation = await Formulation.create({
      ...parent.toObject(),
      _id: undefined,
      parentVersion: parent._id,
      version: newVersion,
      status: parent.mode === "R&D" ? "R&D_ACTIVE" : "DRAFT",
      ...costData,
      lastCostUpdate: new Date(),
      createdBy: user?._id,
      updatedBy: user?._id,
    });

    // Update parent version history
    parent.versionHistory.push({
      version: newVersion,
      changedAt: new Date(),
      changedBy: user?._id,
      changeReason: changeReason || "",
    });
    await parent.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Formulation",
      entityId: newFormulation._id,
      action: "CREATE_VERSION",
      before: parent.toObject(),
      after: newFormulation.toObject(),
    });

    const populated = await Formulation.findById(newFormulation._id)
      .populate("ingredients.rawMaterial")
      .populate("ingredients.rawMaterialBatch");

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating version:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Submit R&D formulation to QC (R&D → QC transition)
exports.submitToQC = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { comments } = req.body || {};

    const formulation = await Formulation.findOne({ _id: id, company_id });
    if (!formulation) {
      return res.status(404).json({ success: false, message: "Formulation not found" });
    }

    // Only R&D can submit
    if (user && !user.isSuperAdmin && user.qcRndProfile?.layer !== "R&D") {
      return res.status(403).json({ success: false, message: "Only R&D users can submit formulations to QC" });
    }

    if (formulation.mode !== "R&D") {
      return res.status(400).json({ success: false, message: "Only R&D formulations can be submitted to QC" });
    }

    if (formulation.status !== "R&D_COMPLETED") {
      return res.status(400).json({ success: false, message: "Formulation must be completed in R&D before submission" });
    }

    const before = formulation.toObject();
    formulation.submittedToQC = true;
    formulation.submittedToQCAt = new Date();
    formulation.submittedToQCBy = user?._id;
    formulation.status = "PENDING_QC_APPROVAL";
    formulation.updatedBy = user?._id;
    await formulation.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Formulation",
      entityId: formulation._id,
      action: "SUBMIT_TO_QC",
      before,
      after: formulation.toObject(),
      meta: { comments },
    });

    return res.json({ success: true, data: formulation, message: "Formulation submitted to QC for approval" });
  } catch (error) {
    console.error("Error submitting to QC:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Approve R&D formulation for QC (Management only)
exports.approveForQC = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { comments } = req.body || {};

    if (!canReleaseToQC(user)) {
      return res.status(403).json({ success: false, message: "Only Management can approve formulations for QC release" });
    }

    const formulation = await Formulation.findOne({ _id: id, company_id });
    if (!formulation) {
      return res.status(404).json({ success: false, message: "Formulation not found" });
    }

    if (formulation.status !== "PENDING_QC_APPROVAL") {
      return res.status(400).json({ success: false, message: "Formulation is not pending QC approval" });
    }

    // Create electronic signature
    const signature = await ElectronicSignature.create({
      company_id,
      signatureType: "R&D_TO_QC_APPROVAL",
      relatedEntityType: "FORMULATION",
      relatedEntityId: formulation._id,
      signer: {
        userId: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        role: user.qcRndProfile?.managementRole || user.role || "Management",
        department: user.department || "",
      },
      action: "Approved R&D formulation for QC release",
      comments: comments || "",
      signedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    const before = formulation.toObject();
    formulation.approvedForQC = true;
    formulation.approvedForQCAt = new Date();
    formulation.approvedForQCBy = user._id;
    formulation.qcApprovalSignature = signature._id;
    formulation.mode = "QC";
    formulation.status = "QC_APPROVED";
    formulation.updatedBy = user._id;
    await formulation.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Formulation",
      entityId: formulation._id,
      action: "APPROVE_FOR_QC",
      before,
      after: formulation.toObject(),
      meta: { signatureId: signature._id, comments },
    });

    const populated = await Formulation.findById(formulation._id)
      .populate("ingredients.rawMaterial")
      .populate("qcApprovalSignature");

    return res.json({ success: true, data: populated, message: "Formulation approved for QC" });
  } catch (error) {
    console.error("Error approving for QC:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Freeze formulation (Management only)
exports.freeze = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { freezeReason } = req.body || {};

    if (!canFreezeFormulations(user)) {
      return res.status(403).json({ success: false, message: "Only Management can freeze formulations" });
    }

    const formulation = await Formulation.findOne({ _id: id, company_id });
    if (!formulation) {
      return res.status(404).json({ success: false, message: "Formulation not found" });
    }

    const before = formulation.toObject();
    formulation.frozen = true;
    formulation.frozenAt = new Date();
    formulation.frozenBy = user._id;
    formulation.freezeReason = freezeReason || "";
    formulation.status = "FROZEN";
    formulation.updatedBy = user._id;
    await formulation.save();

    await writeAudit({
      req,
      company_id,
      entityType: "Formulation",
      entityId: formulation._id,
      action: "FREEZE",
      before,
      after: formulation.toObject(),
      meta: { freezeReason },
    });

    return res.json({ success: true, data: formulation, message: "Formulation frozen" });
  } catch (error) {
    console.error("Error freezing formulation:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Generate BOM
exports.generateBOM = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { id } = req.params;
    const { quantity } = req.query || {}; // optional quantity override

    const formulation = await Formulation.findOne({ _id: id, company_id })
      .populate("ingredients.rawMaterial")
      .populate("ingredients.rawMaterialBatch");

    if (!formulation) {
      return res.status(404).json({ success: false, message: "Formulation not found" });
    }

    const targetQuantity = quantity ? parseFloat(quantity) : formulation.totalQuantity;
    const scaleFactor = targetQuantity / formulation.totalQuantity;

    const bom = formulation.ingredients.map((ing) => {
      const scaledQty = ing.quantity * scaleFactor;
      return {
        materialCode: ing.rawMaterial?.materialCode || "",
        materialName: ing.rawMaterial?.materialName || "",
        batchNo: ing.rawMaterialBatch?.batchNo || "Any",
        quantity: scaledQty,
        unit: ing.unit || "kg",
        percentage: ing.percentage || (scaledQty / targetQuantity) * 100,
        cost: ing.costPerUnit ? scaledQty * ing.costPerUnit : null,
      };
    });

    return res.json({
      success: true,
      data: {
        formulationCode: formulation.formulationCode,
        formulationName: formulation.formulationName,
        targetQuantity,
        unit: formulation.quantityUnit,
        bom,
        totalCost: bom.reduce((sum, item) => sum + (item.cost || 0), 0),
      },
    });
  } catch (error) {
    console.error("Error generating BOM:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

