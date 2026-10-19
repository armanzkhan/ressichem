const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const { resolveProcurementUserAssignment, effectiveProcurementDepartment } = require("../utils/procurementRoleHelpers");
const { generateToken, getUserPermissions } = require("../services/authService");

function computeIsSuperAdmin(user) {
  return (
    user.isSuperAdmin === true ||
    user.user_id === "super_admin_001" ||
    user.email === "superadmin@ressichem.com" ||
    (Array.isArray(user.roles) &&
      user.roles.some((r) => r?.name === "Super Admin" || r?.name === "SuperAdmin"))
  );
}

function getCompanyId(req, fallback) {
  return req.headers["x-company-id"] || req.body?.company_id || fallback;
}

function makeUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function permissionIdsForRole(company_id, roleName) {
  const role = await Role.findOne({ company_id, name: roleName })
    .populate("permissions", "key")
    .lean();
  if (!role) throw new Error(`Role not found: ${roleName} (company ${company_id})`);

  const ids = (role.permissions || []).map((p) => p._id || p).filter(Boolean);
  const keys = new Set((role.permissions || []).map((p) => p.key).filter(Boolean));
  if (keys.has("procurement.requisitions.create")) {
    const extra = await Permission.find({
      company_id,
      key: { $in: ["procurement.items.create", "procurement.items.read"] },
    })
      .select("_id")
      .lean();
    for (const p of extra) {
      if (!ids.some((id) => String(id) === String(p._id))) ids.push(p._id);
    }
  }
  return { roleId: role._id, permissionIds: ids };
}

async function authenticateBase({ company_id, email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return { ok: false, status: 400, message: "Email is required" };
  }

  const populateOpts = {
    path: "roles",
    populate: { path: "permissions" },
  };

  let user = company_id
    ? await User.findOne({ company_id, email: normalizedEmail })
        .populate(populateOpts)
        .populate("permissions")
    : null;

  if (!user) {
    user = await User.findOne({ email: normalizedEmail })
      .populate(populateOpts)
      .populate("permissions");
  }

  if (!user) return { ok: false, status: 404, message: "User not found" };

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return { ok: false, status: 401, message: "Invalid credentials" };

  return { ok: true, user };
}

async function ensureProcurementPermissionsOrDeny({ user, requiredAny = [] }) {
  const isSuperAdmin = computeIsSuperAdmin(user);
  if (isSuperAdmin) return { ok: true, isSuperAdmin, permissions: ["*"] };

  const { permissions } = await getUserPermissions(user.user_id, user.company_id);
  const set = new Set(permissions);

  if (!set.has("procurement.access")) {
    return {
      ok: false,
      status: 403,
      message:
        "Procurement access denied. Please contact administrator to enable Procurement permissions.",
    };
  }

  if (Array.isArray(requiredAny) && requiredAny.length > 0) {
    const hasAny = requiredAny.some((p) => set.has(p));
    if (!hasAny) {
      return {
        ok: false,
        status: 403,
        message: `Procurement access denied. Missing required permission(s): one of [${requiredAny.join(", ")}].`,
      };
    }
  }

  return { ok: true, isSuperAdmin, permissions };
}

async function issueTokensAndRespond({ res, user, isSuperAdmin, message }) {
  const token = await generateToken(user, "8h");
  const refreshToken = await generateToken(user, "7d", true);
  const department = effectiveProcurementDepartment(user.role, user.department);

  return res.json({
    success: true,
    message,
    token,
    refreshToken,
    portal: "procurement",
    user: {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department,
      isSuperAdmin,
      isCompanyAdmin: user.isCompanyAdmin,
      isCustomer: user.isCustomer,
      isManager: user.isManager,
      userType: "procurement",
      company_id: user.company_id,
    },
  });
}

/**
 * POST /api/procurement/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const company_id = getCompanyId(req);
    const auth = await authenticateBase({ company_id, email, password });
    if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });

    const perm = await ensureProcurementPermissionsOrDeny({ user: auth.user });
    if (!perm.ok) return res.status(perm.status).json({ success: false, message: perm.message });

    return issueTokensAndRespond({
      res,
      user: auth.user,
      isSuperAdmin: perm.isSuperAdmin,
      message: "Procurement login successful",
    });
  } catch (err) {
    console.error("Procurement login error:", err);
    const name = err?.name || "";
    const code = err?.cause?.code || err?.code || "";
    if (name.includes("MongoNetwork") || code === "ETIMEDOUT" || code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message:
          "Cannot reach the database (MongoDB Atlas). Check your internet connection and MongoDB Atlas IP whitelist, then restart the backend.",
      });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/procurement/auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const company_id = getCompanyId(req, "RESSICHEM");
    const body = req.body || {};

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const keyEnv = process.env.PROCUREMENT_SIGNUP_KEY;
    const providedKey = String(body.signupKey || "").trim();
    if (keyEnv && providedKey !== keyEnv) {
      return res.status(403).json({ success: false, message: "Invalid registration key" });
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

    const { roleId, permissionIds } = await permissionIdsForRole(company_id, roleName);

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
      permissions: permissionIds,
      isActive: body.isActive !== undefined ? !!body.isActive : true,
      isCustomer: false,
      isManager: false,
      isCompanyAdmin: false,
      modules: ["PROCUREMENT"],
    });

    return res.status(201).json({
      success: true,
      message: "Procurement user registered",
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
    console.error("Procurement signup error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
