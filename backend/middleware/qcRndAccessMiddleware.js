/**
 * QC & R&D Access Control Middleware
 * Implements three-layer role model from SRS Section 2.3
 * 
 * Layer 1 - QC: Only approved QC formulations, cannot see R&D data
 * Layer 2 - R&D: Full R&D data, cannot release to QC
 * Layer 3 - Management: Full QC + R&D data, can approve R&D→QC, freeze formulations, etc.
 */

const User = require("../models/User");

function userPermissionKeys(user) {
  if (!user) return [];
  const perms = user.permissions;
  if (!Array.isArray(perms)) return [];
  return perms.map((p) => (typeof p === "string" ? p : p?.key)).filter(Boolean);
}

/**
 * Load qcRndProfile from DB when JWT does not include it (common after QC Hub login).
 */
async function enrichUserQcProfile(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (req.user.qcRndProfile?.layer) return next();

    const query = req.user._id
      ? { _id: req.user._id }
      : { user_id: req.user.user_id, company_id: req.user.company_id };

    const full = await User.findOne(query).select("qcRndProfile isSuperAdmin").lean();
    if (full?.qcRndProfile) {
      req.user.qcRndProfile = full.qcRndProfile;
    }
    if (full?.isSuperAdmin) {
      req.user.isSuperAdmin = true;
    }
    next();
  } catch (err) {
    console.error("enrichUserQcProfile error:", err.message);
    return res.status(500).json({ success: false, message: "Error loading user profile" });
  }
}

/**
 * Check if user belongs to a specific layer
 */
function getUserLayer(user) {
  if (!user.qcRndProfile || !user.qcRndProfile.layer) {
    return null;
  }
  return user.qcRndProfile.layer;
}

/**
 * Check if user has a specific role
 */
function hasRole(user, role) {
  if (!user.qcRndProfile) return false;
  const profile = user.qcRndProfile;
  
  switch (role) {
    case "QC_LAB_TECHNICIAN":
      return profile.qcRole === "QC_LAB_TECHNICIAN";
    case "QC_SUPERVISOR":
      return profile.qcRole === "QC_SUPERVISOR";
    case "R&D_CHEMIST":
      return profile.rndRole === "R&D_CHEMIST";
    case "SENIOR_R&D_SCIENTIST":
      return profile.rndRole === "SENIOR_R&D_SCIENTIST";
    case "TECHNICAL_MANAGER_RND":
      return profile.managementRole === "TECHNICAL_MANAGER_RND";
    case "PLANT_HEAD":
      return profile.managementRole === "PLANT_HEAD";
    case "CEO":
      return profile.managementRole === "CEO";
    case "DIRECTOR":
      return profile.managementRole === "DIRECTOR";
    default:
      return false;
  }
}

/**
 * Check if user can access R&D data
 */
function canAccessRndData(user) {
  if (user.isSuperAdmin) return true;
  const perms = userPermissionKeys(user);
  if (perms.includes("rnd.access") || perms.includes("rnd.experiments.read")) return true;
  if (!user.qcRndProfile) return false;
  return user.qcRndProfile.layer === "MANAGEMENT" || user.qcRndProfile.layer === "R&D" || user.qcRndProfile.canAccessRndData;
}

/**
 * Check if user can access QC data
 */
function canAccessQcData(user) {
  if (user.isSuperAdmin) return true;
  const layer = user.qcRndProfile?.layer;
  if (layer === "QC" || layer === "MANAGEMENT") return true;
  const perms = userPermissionKeys(user);
  if (perms.includes("qc.access")) return true;
  return false;
}

/**
 * Check if user can release R&D formulations to QC
 */
function canReleaseToQC(user) {
  if (user.isSuperAdmin) return true;
  if (!user.qcRndProfile) return false;
  return user.qcRndProfile.layer === "MANAGEMENT" && user.qcRndProfile.canReleaseToQC;
}

/**
 * Check if user can freeze formulations
 */
function canFreezeFormulations(user) {
  if (user.isSuperAdmin) return true;
  if (!user.qcRndProfile) return false;
  return user.qcRndProfile.layer === "MANAGEMENT" && user.qcRndProfile.canFreezeFormulations;
}

/**
 * Check if user can define acceptance limits
 */
function canDefineAcceptanceLimits(user) {
  if (user.isSuperAdmin) return true;
  if (!user.qcRndProfile) return false;
  return user.qcRndProfile.layer === "MANAGEMENT" && user.qcRndProfile.canDefineAcceptanceLimits;
}

/**
 * Check if user can close CAPA
 */
function canCloseCAPA(user) {
  if (user.isSuperAdmin) return true;
  if (!user.qcRndProfile) return false;
  return user.qcRndProfile.layer === "MANAGEMENT" && user.qcRndProfile.canCloseCAPA;
}

/**
 * Check if user can conduct MRM
 */
function canConductMRM(user) {
  if (user.isSuperAdmin) return true;
  if (!user.qcRndProfile) return false;
  return user.qcRndProfile.layer === "MANAGEMENT" && user.qcRndProfile.canConductMRM;
}

/**
 * Check if user can see customer data (complaints)
 */
function canSeeCustomerData(user) {
  if (user.isSuperAdmin) return true;
  const layer = user.qcRndProfile?.layer;
  if (layer === "R&D") return false;
  if (layer === "QC" || layer === "MANAGEMENT") return true;
  const perms = userPermissionKeys(user);
  if (perms.includes("qc.access")) return true;
  return false;
}

/**
 * Middleware: Require QC layer access
 */
function requireQCLayer(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (user.isSuperAdmin) return next();

  const perms = userPermissionKeys(user);
  if (perms.includes("qc.access")) return next();

  const layer = getUserLayer(user);
  if (layer !== "QC" && layer !== "MANAGEMENT") {
    return res.status(403).json({
      success: false,
      message: "QC layer access required. Only QC and Management users can access this resource.",
    });
  }

  next();
}

/**
 * Middleware: Require R&D layer access
 */
function requireRDLayer(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (user.isSuperAdmin) return next();

  const perms = userPermissionKeys(user);
  if (perms.includes("rnd.experiments.create") || perms.includes("rnd.experiments.update")) {
    return next();
  }

  const layer = getUserLayer(user);
  if (layer !== "R&D" && layer !== "MANAGEMENT") {
    return res.status(403).json({
      success: false,
      message: "R&D layer access required. Only R&D and Management users can access this resource.",
    });
  }

  next();
}

/**
 * Middleware: Require Management layer access
 */
function requireManagementLayer(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (user.isSuperAdmin) return next();

  const perms = userPermissionKeys(user);
  if (perms.includes("qc.results.approve") || perms.includes("qc.hub.forms.approve")) return next();

  const layer = getUserLayer(user);
  if (layer !== "MANAGEMENT") {
    return res.status(403).json({
      success: false,
      message: "Management layer access required. Only Management users can access this resource.",
    });
  }

  next();
}

/**
 * Middleware: Require ability to release R&D to QC
 */
function requireReleaseToQC(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!canReleaseToQC(user)) {
    return res.status(403).json({
      success: false,
      message: "Permission denied. Only Management users can approve R&D formulations for QC release.",
    });
  }

  next();
}

/**
 * Middleware: Require ability to see customer data
 */
function requireCustomerDataAccess(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!canSeeCustomerData(user)) {
    return res.status(403).json({
      success: false,
      message: "Permission denied. R&D users cannot access customer data.",
    });
  }

  next();
}

module.exports = {
  getUserLayer,
  hasRole,
  canAccessRndData,
  canAccessQcData,
  canReleaseToQC,
  canFreezeFormulations,
  canDefineAcceptanceLimits,
  canCloseCAPA,
  canConductMRM,
  canSeeCustomerData,
  requireQCLayer,
  requireRDLayer,
  requireManagementLayer,
  requireReleaseToQC,
  requireCustomerDataAccess,
  enrichUserQcProfile,
  userPermissionKeys,
};

