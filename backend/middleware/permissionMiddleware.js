function mongooseReady() {
  try {
    const mongoose = require("mongoose");
    return mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

function permissionKeysFromUser(user) {
  const userPermissions = user?.permissions || [];
  return userPermissions
    .map((perm) => {
      if (typeof perm === "string") return perm;
      if (perm && perm.key) return perm.key;
      return null;
    })
    .filter((key) => key !== null);
}

function checkCompanyScope(req, res) {
  const headerCompany = req.headers["x-company-id"];
  if (headerCompany && headerCompany !== req.user.company_id) {
    res.status(403).json({
      message: "Forbidden: Company scope mismatch",
    });
    return false;
  }
  return true;
}

async function refreshPermissionKeys(req) {
  if (!req.user.user_id || !req.user.company_id || !mongooseReady()) return null;
  try {
    const { getUserPermissions } = require("../services/authService");
    const fresh = await getUserPermissions(req.user.user_id, req.user.company_id);
    const freshKeys = fresh.permissions || [];
    req.user.permissions = freshKeys;
    return freshKeys;
  } catch (refreshErr) {
    console.error("⚠️ Error refreshing permissions from DB:", refreshErr.message);
    return null;
  }
}

async function companyAdminAllowsAssignCategories(req, requiredPermissions) {
  if (!requiredPermissions.includes("assign_categories")) return false;

  let isCompanyAdmin = req.user.isCompanyAdmin === true;
  const userRole = req.user.role || "";
  const isCompanyAdminByRole =
    userRole.toLowerCase().includes("company") && userRole.toLowerCase().includes("admin");

  const mongoose = require("mongoose");
  if (!isCompanyAdmin && req.user.user_id && mongoose.connection.readyState === 1) {
    try {
      const User = require("../models/User");
      const fullUser = await User.findOne({
        user_id: req.user.user_id,
        company_id: req.user.company_id,
      })
        .select("isCompanyAdmin role")
        .lean()
        .maxTimeMS(5000);

      if (fullUser) {
        isCompanyAdmin =
          fullUser.isCompanyAdmin === true ||
          (fullUser.role &&
            fullUser.role.toLowerCase().includes("company") &&
            fullUser.role.toLowerCase().includes("admin"));
      }
    } catch (dbError) {
      console.error("⚠️ Error checking database for company admin:", dbError.message);
    }
  }

  return isCompanyAdmin || isCompanyAdminByRole;
}

/**
 * Require ALL listed permissions.
 */
function permissionMiddleware(requiredPermissions = []) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.isSuperAdmin) return next();
    if (!checkCompanyScope(req, res)) return;

    const userPermissionKeys = permissionKeysFromUser(req.user);
    if (requiredPermissions.every((p) => userPermissionKeys.includes(p))) {
      return next();
    }

    const freshKeys = await refreshPermissionKeys(req);
    if (freshKeys && requiredPermissions.every((p) => freshKeys.includes(p))) {
      return next();
    }

    if (await companyAdminAllowsAssignCategories(req, requiredPermissions)) {
      return next();
    }

    return res.status(403).json({
      message: `Permission Denied: You do not have permission to ${requiredPermissions.join(
        ", "
      )}. Please contact an administrator.`,
    });
  };
}

/**
 * Require ANY of the listed permissions (OR).
 * Used so PR creators (requisitions.create) can also add catalog items.
 */
function permissionMiddlewareAny(requiredPermissions = []) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.isSuperAdmin) return next();
    if (!checkCompanyScope(req, res)) return;

    const userPermissionKeys = permissionKeysFromUser(req.user);
    if (requiredPermissions.some((p) => userPermissionKeys.includes(p))) {
      return next();
    }

    const freshKeys = await refreshPermissionKeys(req);
    if (freshKeys && requiredPermissions.some((p) => freshKeys.includes(p))) {
      return next();
    }

    return res.status(403).json({
      message: `Permission Denied: You do not have permission to ${requiredPermissions.join(
        " or "
      )}. Please contact an administrator.`,
    });
  };
}

permissionMiddleware.any = permissionMiddlewareAny;
module.exports = permissionMiddleware;
