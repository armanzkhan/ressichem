// controllers/authController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken, verifyRefreshToken } = require("../services/authService");
const notificationService = require("../services/notificationService");
const Notification = require("../models/Notification");

// ================= REGISTER =================
async function register(req, res) {
  try {
    const { company_id, user_id, email, password, department } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      company_id,
      user_id,
      email,
      password: hashedPassword,
      department,
      roles: []
    });

    await newUser.save();

    // Send notification about new user
    try {
      await notificationService.createNotification({
        title: "New User Registered",
        message: `A new user ${email} has been registered in the system`,
        type: "system",
        priority: "medium",
        targetType: "company",
        targetIds: [company_id],
        company_id,
        sender_id: "system",
        sender_name: "System",
        channels: ["in_app", "web_push"]
      });
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ================= LOGIN =================
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions'
        }
      })
      .populate("permissions");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const roleDocs = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
    const permDocs = Array.isArray(user.permissions) ? user.permissions.filter(Boolean) : [];

    console.log("🔍 User found:", {
      email: user.email,
      roles: roleDocs,
      permissions: permDocs
    });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // ✅ Check if user is super admin
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.user_id === "super_admin_001" ||
      user.email === "superadmin@ressichem.com" ||
      roleDocs.some((r) => r?.name === "Super Admin");

    const token = await generateToken(user, "15m");
    const refreshToken = await generateToken(user, "7d", true);

    // Determine user type for frontend routing
    let userType = 'user';
    if (isSuperAdmin) {
      userType = 'admin';
    } else if (user.isCompanyAdmin) {
      userType = 'company_admin';
    } else if (user.isCustomer) {
      userType = 'customer';
    } else if (user.isManager) {
      userType = 'manager';
    }

    return res.json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
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
        userType,
        company_id: user.company_id,
        permissions: permDocs.map((p) => p.key || p),
        roles: roleDocs.map((r) => r.name || r)
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ================= REFRESH TOKEN =================
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ success: false, message: "No refresh token provided" });

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      console.error("Invalid refresh token:", err);
      return res.status(403).json({ success: false, message: "Invalid refresh token" });
    }

    const user = await User.findOne({ user_id: decoded.user_id, company_id: decoded.company_id })
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions'
        }
      })
      .populate("permissions");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Check if user is super admin
    const roleDocs = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.user_id === "super_admin_001" ||
      user.email === "superadmin@ressichem.com" ||
      roleDocs.some((r) => r?.name === "Super Admin");

    const newToken = await generateToken(user, "15m");
    return res.json({ success: true, token: newToken });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ================= CURRENT USER =================
async function getCurrentUser(req, res) {
  try {
    const { user_id, company_id } = req.user;

    const user = await User.findOne({ user_id, company_id })
      .select("-password")
      .populate({
        path: "roles",
        populate: {
          path: "permissions",
          model: "Permission"
        }
      })
      .populate("permissions")
      .lean();

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const roleDocs = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
    const permDocs = Array.isArray(user.permissions) ? user.permissions.filter(Boolean) : [];

    // Fallback: users may have legacy `role` string without populated `roles` array
    if (roleDocs.length === 0 && user.role) {
      const Role = require("../models/Role");
      const roleByName = await Role.findOne({ company_id, name: user.role })
        .populate({ path: "permissions", model: "Permission" })
        .lean();
      if (roleByName) roleDocs.push(roleByName);
    }

    // ✅ Check both database flag and role-based super admin
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.user_id === "super_admin_001" ||
      user.email === "superadmin@ressichem.com" ||
      roleDocs.some((r) => r?.name === "Super Admin");
    const roleNames = roleDocs.map((r) => r.name);
    
    // ✅ Get permissions from roles
    let rolePermissions = roleDocs.flatMap((r) => r.permissions || []);
    let permissionGroups = roleDocs.flatMap((r) => r.permissionGroups || []);
    
    // ✅ Get direct permissions assigned to user
    let directPermissions = permDocs;
    
    // ✅ Combine role permissions and direct permissions
    let permissions = [...rolePermissions, ...directPermissions];
    
    // ✅ Remove duplicates and filter out null/undefined values
    permissions = [...new Set(permissions)].filter(p => p && p !== null && p !== undefined);

    // ✅ For super admin, get all permissions from database
    if (isSuperAdmin) {
      const Permission = require("../models/Permission");
      const allPermissions = await Permission.find({});
      permissions = allPermissions.map(p => p.key);
      permissionGroups = ["All"];
      roleNames.push("Super Admin");
    }

    const notifications = await Notification.find({
      $or: [
        { targetIds: { $in: [user_id] } },
        { targetIds: { $in: [company_id] } }
      ],
      company_id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Check if user is a manager
    const isManager = user.isManager || false;
    let managerProfile = null;
    
    if (isManager && user.managerProfile) {
      managerProfile = user.managerProfile;
    }

    // Check if user is a customer
    const isCustomer = user.isCustomer || false;
    let customerProfile = null;
    
    if (isCustomer && user.customerProfile) {
      customerProfile = user.customerProfile;
    }

    // Check if user is a company admin
    const isCompanyAdmin = user.isCompanyAdmin || false;

    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        email: user.email,
        company_id: user.company_id,
        department: user.department,
        isSuperAdmin, // ✅ fixed line
        isManager,
        isCustomer,
        isCompanyAdmin,
        managerProfile,
        customerProfile,
        roles: roleNames,
        permissions: permissions.map(p => typeof p === 'string' ? p : p.key),
        permissionGroups: [...new Set(permissionGroups)],
        notifications
      }
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { register, login, refresh, getCurrentUser };
