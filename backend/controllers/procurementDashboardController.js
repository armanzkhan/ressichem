const { getUserPermissions } = require("../services/authService");
const User = require("../models/User");
const { countLocalImportStats } = require("../utils/procurementDashboardStats");
const {
  procurementSectionsForUser,
  accessLevelFromRole,
  effectiveProcurementDepartment,
  userProcurementArea,
} = require("../utils/procurementRoleHelpers");

/**
 * GET /api/procurement/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const company_id = req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
    const { permissions, roles } = await getUserPermissions(req.user.user_id, req.user.company_id);
    const dbUser = await User.findOne({ user_id: req.user.user_id, company_id: req.user.company_id })
      .select("role department")
      .lean();
    const roleName = roles?.[0] || dbUser?.role || req.user.role || null;
    const department = effectiveProcurementDepartment(roleName, dbUser?.department || req.user.department);
    const allowedSections = procurementSectionsForUser(roleName, department);
    const accessLevel = accessLevelFromRole(roleName);
    const area = userProcurementArea(roleName, department);

    const statsBySection = await countLocalImportStats(company_id);

    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");

    return res.json({
      success: true,
      module: "PROCUREMENT SYSTEM",
      user: {
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: roleName,
        roles: roles || [],
        department,
        accessLevel,
        area: area === "all" ? null : area,
        allowedSections,
        company_id,
      },
      permissions,
      statsBySection,
    });
  } catch (err) {
    console.error("procurement dashboard error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
