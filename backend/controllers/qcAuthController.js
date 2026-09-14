const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const { generateToken, getUserPermissions } = require("../services/authService");

function computeIsSuperAdmin(user) {
  return (
    user.isSuperAdmin === true ||
    user.user_id === "super_admin_001" ||
    user.email === "superadmin@ressichem.com" ||
    (Array.isArray(user.roles) && user.roles.some((r) => r?.name === "Super Admin" || r?.name === "SuperAdmin"))
  );
}

function getCompanyId(req, fallback = "RESSICHEM") {
  return req.headers["x-company-id"] || req.body?.company_id || fallback;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

async function authenticateBase({ company_id, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { ok: false, status: 400, message: "Email is required" };
  }

  const populateOpts = {
    path: "roles",
    populate: { path: "permissions" },
  };

  // Prefer company-scoped lookup (RESSICHEM default), then fall back to email-only
  let user = await User.findOne({ company_id, email: normalizedEmail })
    .populate(populateOpts)
    .populate("permissions");

  if (!user) {
    user = await User.findOne({ email: normalizedEmail })
      .populate(populateOpts)
      .populate("permissions");
  }

  if (!user) {
    return {
      ok: false,
      status: 404,
      message:
        "No account found for this email. Use “Create QC Site Account” below, or ask a QC Admin to add you under QC Users.",
    };
  }

  if (!user.isActive) {
    return { ok: false, status: 403, message: "This account is inactive. Contact your administrator." };
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return { ok: false, status: 401, message: "Invalid credentials" };

  return { ok: true, user };
}

async function ensureQcPermissionsOrDeny({ user, requiredAny = [] }) {
  const isSuperAdmin = computeIsSuperAdmin(user);
  if (isSuperAdmin) return { ok: true, isSuperAdmin, permissions: ["*"] };

  const { permissions } = await getUserPermissions(user.user_id, user.company_id);
  const set = new Set(permissions);

  if (!set.has("qc.access")) {
    return {
      ok: false,
      status: 403,
      message: "QC access denied. Please contact administrator to enable QC permissions.",
    };
  }

  if (Array.isArray(requiredAny) && requiredAny.length > 0) {
    const hasAny = requiredAny.some((p) => set.has(p));
    if (!hasAny) {
      return {
        ok: false,
        status: 403,
        message: `QC access denied. Missing required QC permission(s): one of [${requiredAny.join(", ")}].`,
      };
    }
  }

  return { ok: true, isSuperAdmin, permissions };
}

async function issueTokensAndRespond({ res, user, isSuperAdmin, message, portal }) {
  const token = await generateToken(user, "30m");
  const refreshToken = await generateToken(user, "7d", true);

  return res.json({
    success: true,
    message,
    token,
    refreshToken,
    portal, // "site" | "hub" (frontend convenience)
    user: {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      isSuperAdmin,
      isCompanyAdmin: user.isCompanyAdmin,
      isCustomer: user.isCustomer,
      isManager: user.isManager,
      userType: "qc",
      company_id: user.company_id,
    },
  });
}

/**
 * POST /api/qc/auth/login
 * Same credentials as main login, but only allows users with qc.access (or super admin).
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

    const perm = await ensureQcPermissionsOrDeny({ user: auth.user });
    if (!perm.ok) return res.status(perm.status).json({ success: false, message: perm.message });

    return issueTokensAndRespond({
      res,
      user: auth.user,
      isSuperAdmin: perm.isSuperAdmin,
      message: "QC login successful",
      portal: "qc",
    });
  } catch (err) {
    console.error("QC login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/qc/auth/site-login
 * QC Site login: requires qc.access + at least one QC Site permission.
 */
exports.siteLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const company_id = getCompanyId(req);
    const auth = await authenticateBase({ company_id, email, password });
    if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });

    const perm = await ensureQcPermissionsOrDeny({
      user: auth.user,
      requiredAny: ["qc.results.read", "qc.tests.read", "qc.standards.read"],
    });
    if (!perm.ok) return res.status(perm.status).json({ success: false, message: perm.message });

    return issueTokensAndRespond({
      res,
      user: auth.user,
      isSuperAdmin: perm.isSuperAdmin,
      message: "QC Site login successful",
      portal: "site",
    });
  } catch (err) {
    console.error("QC site login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/qc/auth/hub-login
 * QC Hub login: requires qc.access + at least one QC Hub permission.
 */
exports.hubLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const company_id = getCompanyId(req);
    const auth = await authenticateBase({ company_id, email, password });
    if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });

    const perm = await ensureQcPermissionsOrDeny({
      user: auth.user,
      requiredAny: ["qc.hub.plan.read", "qc.hub.forms.read"],
    });
    if (!perm.ok) return res.status(perm.status).json({ success: false, message: perm.message });

    return issueTokensAndRespond({
      res,
      user: auth.user,
      isSuperAdmin: perm.isSuperAdmin,
      message: "QC Hub login successful",
      portal: "hub",
    });
  } catch (err) {
    console.error("QC hub login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

async function createQcPortalUser({ req, res, portal }) {
  const company_id = getCompanyId(req, "RESSICHEM");
  const body = req.body || {};

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "email and password are required" });
  }

  // Optional gating: if env key is set, require it. If not set, signup is allowed (dev-friendly).
  const keyEnv =
    portal === "site"
      ? process.env.QC_SITE_SIGNUP_KEY || process.env.QC_SIGNUP_KEY
      : process.env.QC_HUB_SIGNUP_KEY || process.env.QC_SIGNUP_KEY;
  const providedKey = String(body.signupKey || "").trim();
  if (keyEnv && providedKey !== keyEnv) {
    return res.status(403).json({ success: false, message: "Invalid registration key" });
  }

  const existing = await User.findOne({ company_id, email }).select("_id").lean();
  if (existing) return res.status(409).json({ success: false, message: "User email already exists in this company" });

  // Allow role selection from frontend, with validation
  let roleName = body.role || (portal === "site" ? "QC Site User" : "QC Hub User");
  
  // Validate role for the portal
  const validHubRoles = ["QC Hub User", "QC Analyst", "QC Manager", "QC Admin", "QC Viewer"];
  // SRS Section 2.2: QC Site Area roles - QC Analyst, R&D Chemist, Directors/Managers (QC Manager), Viewer
  const validSiteRoles = ["QC Site User", "QC Analyst", "R&D Chemist", "QC Manager", "QC Admin", "QC Viewer"];
  const validRoles = portal === "site" ? validSiteRoles : validHubRoles;
  
  // Map SRS roles to system roles
  let mappedRoleName = roleName;
  if (portal === "site") {
    if (roleName === "R&D Chemist") {
      // R&D Chemist should use QC Analyst permissions but with R&D layer
      mappedRoleName = "QC Analyst";
    }
    // Directors/Managers can be QC Manager or QC Admin
    if (roleName === "Directors/Managers") {
      mappedRoleName = "QC Manager";
    }
  }
  
  if (!validRoles.includes(roleName)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid role for ${portal === "site" ? "QC Site" : "QC Hub"}. Valid roles: ${validRoles.join(", ")}` 
    });
  }
  
  const roleId = await ensureRoleId(company_id, mappedRoleName);
  const qcAccessPermIds = await ensurePermissionIds(company_id, ["qc.access"]);

  // SRS 2.3: Three-Layer Model Role Assignment
  // For QC Site Area, auto-set layer based on role if not provided
  let layer = body.layer || "";
  let layerRole = body.layerRole || "";
  
  // Auto-set layer for SRS-defined roles if not provided
  if (portal === "site" && !layer) {
    if (roleName === "R&D Chemist") {
      layer = "R&D";
      layerRole = "R&D_CHEMIST";
    } else if (roleName === "QC Manager" || roleName === "QC Admin") {
      layer = "MANAGEMENT";
      layerRole = "PLANT_HEAD";
    } else if (roleName === "QC Analyst") {
      layer = "QC";
      layerRole = "QC_LAB_TECHNICIAN";
    }
    // QC Viewer doesn't need a layer (read-only)
  }
  
  // Validate three-layer model inputs
  const validLayers = ["QC", "R&D", "MANAGEMENT"];
  const validQCRoles = ["QC_LAB_TECHNICIAN", "QC_SUPERVISOR"];
  const validRDRoles = ["R&D_CHEMIST", "SENIOR_R&D_SCIENTIST"];
  const validManagementRoles = ["TECHNICAL_MANAGER_RND", "PLANT_HEAD", "CEO", "DIRECTOR"];
  
  let qcRndProfile = {};
  if (layer && layerRole) {
    if (!validLayers.includes(layer)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid layer. Valid layers: ${validLayers.join(", ")}` 
      });
    }
    
    // Validate layer-role combination
    if (layer === "QC" && !validQCRoles.includes(layerRole)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid QC role. Valid roles: ${validQCRoles.join(", ")}` 
      });
    }
    if (layer === "R&D" && !validRDRoles.includes(layerRole)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid R&D role. Valid roles: ${validRDRoles.join(", ")}` 
      });
    }
    if (layer === "MANAGEMENT" && !validManagementRoles.includes(layerRole)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid Management role. Valid roles: ${validManagementRoles.join(", ")}` 
      });
    }
    
    // Build qcRndProfile according to SRS 2.3
    qcRndProfile = {
      layer: layer,
      // Set role based on layer
      ...(layer === "QC" && { qcRole: layerRole }),
      ...(layer === "R&D" && { rndRole: layerRole }),
      ...(layer === "MANAGEMENT" && { managementRole: layerRole }),
      // Set access control flags based on role (SRS 2.3)
      canAccessRndData: layer === "R&D" || layer === "MANAGEMENT",
      canReleaseToQC: layer === "MANAGEMENT",
      canFreezeFormulations: layer === "MANAGEMENT",
      canDefineAcceptanceLimits: layer === "MANAGEMENT",
      canCloseCAPA: layer === "MANAGEMENT",
      canConductMRM: layer === "MANAGEMENT",
    };
  }

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
    role: mappedRoleName,
    roles: [roleId],
    permissions: qcAccessPermIds,
    isActive: body.isActive !== undefined ? !!body.isActive : true,
    isCustomer: false,
    isManager: false,
    isCompanyAdmin: false,
    modules: portal === "site" ? ["QC_SITE"] : ["QC_HUB"],
    qcRndProfile: Object.keys(qcRndProfile).length > 0 ? qcRndProfile : undefined,
  });

  return res.status(201).json({
    success: true,
    message: `QC ${portal === "site" ? "Site" : "Hub"} user registered`,
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
}

/**
 * POST /api/qc/auth/site-signup
 * Public signup for QC Site portal (optional key-gated).
 */
exports.siteSignup = async (req, res) => {
  try {
    return await createQcPortalUser({ req, res, portal: "site" });
  } catch (err) {
    console.error("QC site signup error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

/**
 * POST /api/qc/auth/hub-signup
 * Public signup for QC Hub portal (optional key-gated).
 */
exports.hubSignup = async (req, res) => {
  try {
    return await createQcPortalUser({ req, res, portal: "hub" });
  } catch (err) {
    console.error("QC hub signup error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};


