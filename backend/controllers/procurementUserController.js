const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const {
  resolveProcurementUserAssignment,
  roleNameFromAccessLevel,
  departmentFromArea,
  VALID_AREAS,
} = require("../utils/procurementRoleHelpers");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function makeUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureRoleId(company_id, roleName) {
  const role = await Role.findOne({ company_id, name: roleName }).select("_id name").lean();
  if (!role) throw new Error(`Role not found: ${roleName} (company ${company_id})`);
  return role._id;
}

async function ensurePermissionIds(company_id, keys) {
  const perms = await Permission.find({ company_id, key: { $in: keys } }).select("_id key").lean();
  const found = new Set(perms.map((p) => p.key));
  const missing = keys.filter((k) => !found.has(k));
  if (missing.length) throw new Error(`Missing permissions: ${missing.join(", ")}`);
  return perms.map((p) => p._id);
}

function procurementUserQuery(company_id, userId) {
  return {
    _id: userId,
    company_id,
    modules: { $in: ["PROCUREMENT"] },
  };
}

async function loadProcurementUser(company_id, userId) {
  return User.findOne(procurementUserQuery(company_id, userId))
    .select("-password")
    .populate("roles", "name")
    .populate("permissions", "key")
    .lean();
}

exports.listProcurementUsers = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const users = await User.find({ company_id, modules: { $in: ["PROCUREMENT"] }, isActive: true })
      .select("-password")
      .populate("roles", "name")
      .populate("permissions", "key")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, users });
  } catch (err) {
    console.error("listProcurementUsers error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

exports.getProcurementUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = await loadProcurementUser(company_id, req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    console.error("getProcurementUser error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

exports.updateProcurementUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const existing = await User.findOne(procurementUserQuery(company_id, req.params.id));
    if (!existing) return res.status(404).json({ success: false, message: "User not found" });

    const updates = {};
    if (body.firstName !== undefined) updates.firstName = String(body.firstName || "").trim();
    if (body.lastName !== undefined) updates.lastName = String(body.lastName || "").trim();
    if (body.phone !== undefined) updates.phone = String(body.phone || "").trim();
    if (body.isActive !== undefined) updates.isActive = !!body.isActive;

    if (body.accessLevel) {
      const accessLevel = String(body.accessLevel).toLowerCase();
      const roleName = roleNameFromAccessLevel(accessLevel);
      updates.role = roleName;
      updates.roles = [await ensureRoleId(company_id, roleName)];
      if (accessLevel === "admin") {
        updates.department = "Procurement";
      } else if (body.area && VALID_AREAS.has(String(body.area).toLowerCase())) {
        updates.department = departmentFromArea(body.area);
      }
    } else if (body.department !== undefined) {
      updates.department = String(body.department || "").trim();
    }

    if (body.role && !body.accessLevel) {
      const roleName = String(body.role).trim();
      updates.role = roleName;
      updates.roles = [await ensureRoleId(company_id, roleName)];
    }

    if (body.area && VALID_AREAS.has(String(body.area).toLowerCase()) && !body.accessLevel) {
      updates.department = departmentFromArea(body.area);
    }

    if (body.password) {
      const password = String(body.password);
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }
      updates.password = await bcrypt.hash(password, 10);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No updates provided" });
    }

    await User.findByIdAndUpdate(existing._id, updates, { runValidators: true });
    const user = await loadProcurementUser(company_id, existing._id);
    return res.json({ success: true, user });
  } catch (err) {
    console.error("updateProcurementUser error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

exports.createProcurementUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const existing = await User.findOne({ company_id, email }).select("_id").lean();
    if (existing) {
      return res.status(409).json({ success: false, message: "User email already exists in this company" });
    }

    let roleName;
    let department;
    try {
      ({ roleName, department } = resolveProcurementUserAssignment(body));
    } catch (assignErr) {
      return res.status(400).json({ success: false, message: assignErr.message });
    }

    const roleId = await ensureRoleId(company_id, roleName);
    const accessPermIds = await ensurePermissionIds(company_id, ["procurement.access"]);

    const hashed = await bcrypt.hash(password, 10);
    const doc = await User.create({
      company_id,
      user_id: makeUserId(),
      email,
      password: hashed,
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      phone: body.phone || "",
      department,
      role: roleName,
      roles: [roleId],
      permissions: accessPermIds,
      isActive: body.isActive !== undefined ? !!body.isActive : true,
      isCustomer: false,
      isManager: false,
      isCompanyAdmin: false,
      modules: ["PROCUREMENT"],
    });

    return res.status(201).json({
      success: true,
      message: "Procurement user created",
      user: {
        _id: doc._id,
        user_id: doc.user_id,
        company_id: doc.company_id,
        email: doc.email,
        firstName: doc.firstName,
        lastName: doc.lastName,
        department: doc.department,
        role: doc.role,
        modules: doc.modules || [],
        isActive: doc.isActive,
      },
    });
  } catch (err) {
    console.error("createProcurementUser error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
