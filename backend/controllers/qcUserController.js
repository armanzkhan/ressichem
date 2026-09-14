const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");

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

async function createQcUser({ req, res, portal }) {
  const company_id = getCompanyId(req);
  const body = req.body || {};

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "email and password are required" });
  }

  const existing = await User.findOne({ company_id, email }).select("_id").lean();
  if (existing) return res.status(409).json({ success: false, message: "User email already exists in this company" });

  // Portal-specific role assignment
  const roleName = portal === "site" ? "QC Site User" : "QC Hub User";
  const roleId = await ensureRoleId(company_id, roleName);

  // Ensure qc.access is present as direct permission (so the portal check is predictable)
  const qcAccessPermIds = await ensurePermissionIds(company_id, ["qc.access"]);

  const hashed = await bcrypt.hash(password, 10);
  const doc = await User.create({
    company_id,
    user_id: makeUserId(),
    email,
    password: hashed,
    firstName: body.firstName || "",
    lastName: body.lastName || "",
    phone: body.phone || "",
    department: body.department || "QC",
    role: roleName,
    roles: [roleId],
    permissions: qcAccessPermIds,
    isActive: body.isActive !== undefined ? !!body.isActive : true,
    isCustomer: false,
    isManager: false,
    isCompanyAdmin: false,
    modules: portal === "site" ? ["QC_SITE"] : ["QC_HUB"],
  });

  return res.status(201).json({
    success: true,
    message: `QC ${portal === "site" ? "Site" : "Hub"} user created`,
    user: {
      _id: doc._id,
      user_id: doc.user_id,
      company_id: doc.company_id,
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      department: doc.department,
      role: doc.role,
      roles: doc.roles,
      permissions: doc.permissions,
      modules: doc.modules || [],
      isActive: doc.isActive,
    },
  });
}

exports.createQcSiteUser = async (req, res) => {
  try {
    return await createQcUser({ req, res, portal: "site" });
  } catch (err) {
    console.error("createQcSiteUser error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

exports.createQcHubUser = async (req, res) => {
  try {
    return await createQcUser({ req, res, portal: "hub" });
  } catch (err) {
    console.error("createQcHubUser error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

exports.listQcUsers = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { portal } = req.query; // site | hub | all

    const filter = { company_id, isActive: true };
    if (portal === "site") filter.modules = { $in: ["QC_SITE"] };
    if (portal === "hub") filter.modules = { $in: ["QC_HUB"] };
    if (portal === "all") filter.modules = { $in: ["QC_SITE", "QC_HUB"] };

    const users = await User.find(filter)
      .select("-password")
      .populate("roles", "name")
      .populate("permissions", "key")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: users });
  } catch (err) {
    console.error("listQcUsers error:", err);
    res.status(500).json({ success: false, message: "Error listing QC users", error: err.message });
  }
};


