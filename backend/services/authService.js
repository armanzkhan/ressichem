// services/authService.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const PermissionGroup = require("../models/PermissionGroup");
const Permission = require("../models/Permission");
const { encryptObject } = require("../utils/crypto");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "superrefreshkey"; // 👈 add in .env

async function getUserPermissions(userId, companyId) {
  const user = await User.findOne({ user_id: userId, company_id: companyId })
    .populate({
      path: "roles",
      populate: {
        path: "permissions"
      }
    })
    .populate("permissions");

  if (!user) throw new Error("User not found");

  const roles = [];
  const permissionGroups = [];
  const permissions = [];

  const roleDocs = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
  const directPerms = Array.isArray(user.permissions) ? user.permissions.filter(Boolean) : [];

  // Get permissions from roles
  roleDocs.forEach((role) => {
    if (role?.name) roles.push(role.name);
    const rolePerms = Array.isArray(role?.permissions) ? role.permissions : [];
    rolePerms.forEach((p) => {
      if (p?.key && !permissions.includes(p.key)) permissions.push(p.key);
    });
  });

  // Get direct permissions
  directPerms.forEach((p) => {
    if (p?.key && !permissions.includes(p.key)) permissions.push(p.key);
  });

  return { roles, permissionGroups, permissions };
}

async function generateToken(user, expiresIn = "1h", isRefresh = false) {
  let roles = [];
  let permissionGroups = [];
  let permissions = [];

  // 👇 Automatically detect Super Admin by ID or email
  const isSuperAdmin =
    user.isSuperAdmin === true ||
    user.user_id === "super_admin_001" ||
    user.email === "superadmin@ressichem.com"; // ✅ update to your actual Super Admin email if you like

  if (isSuperAdmin) {
    const allPermissions = await Permission.find({});
    permissions = allPermissions.map(p => p.key);
    roles = ["SuperAdmin"];
    permissionGroups = ["All"];
  } else {
    ({ roles, permissionGroups, permissions } = await getUserPermissions(
      user.user_id,
      user.company_id
    ));
  }

  const encrypted = encryptObject({ roles, permissionGroups, permissions });
  const payload = {
    user_id: user.user_id,
    _id: user._id, // Include MongoDB ObjectId for database references
    company_id: user.company_id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    perms: encrypted,
    isSuperAdmin,
    // Include user type flags for role-based filtering
    isManager: user.isManager === true,
    isCustomer: user.isCustomer === true,
    isCompanyAdmin: user.isCompanyAdmin === true,
  };

  return jwt.sign(payload, isRefresh ? REFRESH_SECRET : JWT_SECRET, { expiresIn });
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { getUserPermissions, generateToken, verifyRefreshToken };
