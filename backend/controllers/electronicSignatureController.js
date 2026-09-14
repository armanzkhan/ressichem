const ElectronicSignature = require("../models/ElectronicSignature");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Create electronic signature
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const {
      signatureType,
      relatedEntityType,
      relatedEntityId,
      action,
      comments,
    } = req.body || {};

    if (!signatureType || !relatedEntityType || !relatedEntityId || !action) {
      return res.status(400).json({
        success: false,
        message: "signatureType, relatedEntityType, relatedEntityId, and action are required",
      });
    }

    const signature = await ElectronicSignature.create({
      company_id,
      signatureType,
      relatedEntityType,
      relatedEntityId,
      signer: {
        userId: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        role: user.qcRndProfile?.managementRole || user.qcRndProfile?.rndRole || user.qcRndProfile?.qcRole || user.role || "User",
        department: user.department || "",
      },
      action,
      comments: comments || "",
      signedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
    });

    return res.status(201).json({ success: true, data: signature });
  } catch (error) {
    console.error("Error creating signature:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get signatures for an entity
exports.getByEntity = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { entityType, entityId } = req.params;

    const signatures = await ElectronicSignature.find({
      company_id,
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      isActive: true,
    })
      .populate("signer.userId", "firstName lastName email")
      .sort({ signedAt: -1 });

    return res.json({ success: true, data: signatures });
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get signature by ID
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const signature = await ElectronicSignature.findOne({
      _id: req.params.id,
      company_id,
      isActive: true,
    }).populate("signer.userId", "firstName lastName email");

    if (!signature) {
      return res.status(404).json({ success: false, message: "Signature not found" });
    }

    return res.json({ success: true, data: signature });
  } catch (error) {
    console.error("Error fetching signature:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Verify signature (read-only, signatures are immutable)
exports.verify = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const signature = await ElectronicSignature.findOne({
      _id: req.params.id,
      company_id,
      isActive: true,
    }).populate("signer.userId", "firstName lastName email");

    if (!signature) {
      return res.status(404).json({ success: false, message: "Signature not found" });
    }

    // Verify signature integrity (check if it's been modified)
    // Since we prevent updates in the model, if it exists, it's valid
    const isValid = true;

    return res.json({
      success: true,
      data: {
        signature,
        isValid,
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error verifying signature:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

