const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken } = require("../services/authService");
const { canUseProduction, productionDepartmentsForUser, productionSignupRole } = require("../utils/productionAccess");

exports.login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const company_id = req.headers["x-company-id"] || req.body?.company_id || "RESSICHEM";
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    let user = await User.findOne({ company_id, email }).populate("roles");
    if (!user) user = await User.findOne({ email }).populate("roles");
    if (!user || user.isActive === false) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const roleName = user.role || user.roles?.[0]?.name || "";
    const actor = {
      email: user.email,
      role: roleName,
      modules: user.modules || [],
      isSuperAdmin: user.isSuperAdmin,
      isCompanyAdmin: user.isCompanyAdmin,
    };
    if (!canUseProduction(actor)) {
      return res.status(403).json({
        success: false,
        message: "This account is not a Reactor, LMS, or BFS production user.",
      });
    }

    const token = await generateToken(user, "8h");
    const refreshToken = await generateToken(user, "7d", true);
    return res.json({
      success: true,
      message: "Production login successful",
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleName,
        company_id: user.company_id,
        departments: productionDepartmentsForUser(actor),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Production login failed" });
  }
};

function makeUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

exports.signup = async (req, res) => {
  try {
    const company_id = req.headers["x-company-id"] || req.body?.company_id || "RESSICHEM";
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    if (!firstName || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const keyEnv = process.env.PRODUCTION_SIGNUP_KEY;
    const providedKey = String(body.signupKey || "").trim();
    if (keyEnv && providedKey !== keyEnv) {
      return res.status(403).json({ success: false, message: "Invalid registration key" });
    }

    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const selectedRole = productionSignupRole(body.role || "operator");
    if (!selectedRole) {
      return res.status(400).json({ success: false, message: "Select Overall Admin, Manager, or Operator" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const doc = await User.create({
      company_id,
      user_id: makeUserId(),
      email,
      password: hashed,
      firstName,
      lastName,
      phone: String(body.phone || "").trim(),
      department: selectedRole.department,
      role: selectedRole.role,
      roles: [],
      permissions: [],
      modules: ["PRODUCTION"],
      isActive: true,
      isCustomer: false,
      isManager: false,
      isCompanyAdmin: false,
    });

    return res.status(201).json({
      success: true,
      message: "Production account created. Sign in with this email and password.",
      user: {
        _id: doc._id,
        email: doc.email,
        firstName: doc.firstName,
        lastName: doc.lastName,
        role: doc.role,
        company_id: doc.company_id,
        departments: selectedRole.departments,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Production signup failed" });
  }
};

exports.me = (req, res) => {
  const departments = productionDepartmentsForUser(req.user);
  if (!departments.length) {
    return res.status(403).json({ success: false, message: "Production access denied" });
  }
  return res.json({
    success: true,
    data: {
      email: req.user?.email || "",
      departments,
    },
  });
};
