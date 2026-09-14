function permissionMiddleware(requiredPermissions = []) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Super Admin bypasses all permission checks
    if (req.user.isSuperAdmin) {
      return next();
    }

    const headerCompany = req.headers["x-company-id"];
    if (headerCompany && headerCompany !== req.user.company_id) {
      return res.status(403).json({
        message: "Forbidden: Company scope mismatch",
      });
    }

    const userPermissions = req.user.permissions || [];
    const userPermissionKeys = userPermissions
      .map((perm) => {
        if (typeof perm === "string") return perm;
        if (perm && perm.key) return perm.key;
        return null;
      })
      .filter((key) => key !== null);

    // Fast path: JWT already grants access — do not hit MongoDB.
    // (Previously every request awaited User.findOne for company-admin, which
    // stacked up on Atlas and caused frontend 20s timeouts on pages that fire
    // several API calls in parallel.)
    const hasPermission = requiredPermissions.every((p) => userPermissionKeys.includes(p));
    if (hasPermission) {
      return next();
    }

    // Slow path: company-admin fallback (e.g. assign_categories) when JWT lacks the key
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

    if (
      (isCompanyAdmin || isCompanyAdminByRole) &&
      requiredPermissions.includes("assign_categories")
    ) {
      return next();
    }

    return res.status(403).json({
      message: `Permission Denied: You do not have permission to ${requiredPermissions.join(
        ", "
      )}. Please contact an administrator.`,
    });
  };
}

module.exports = permissionMiddleware;
