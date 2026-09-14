const ProcurementDepartmentApprover = require("../models/ProcurementDepartmentApprover");
const User = require("../models/User");
const { getCompanyId } = require("../utils/procurementHelpers");
const {
  DEPARTMENT_APPROVER_EMAILS,
  normalizeDepartment,
} = require("../utils/procurementPrRouting");

async function ensureDefaultMappings(company_id) {
  const count = await ProcurementDepartmentApprover.countDocuments({ company_id });
  if (count > 0) return;

  const docs = Object.entries(DEPARTMENT_APPROVER_EMAILS).map(([department, email]) => ({
    company_id,
    department,
    departmentKey: normalizeDepartment(department),
    approverEmail: String(email).trim().toLowerCase(),
    isActive: true,
  }));
  if (!docs.length) return;
  try {
    await ProcurementDepartmentApprover.insertMany(docs, { ordered: false });
  } catch (err) {
    // Ignore duplicate key races on concurrent first access
    if (err?.code !== 11000) throw err;
  }
}

function serialize(doc) {
  return {
    _id: doc._id,
    department: doc.department,
    approverEmail: doc.approverEmail,
    approverName: doc.approverName || "",
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    await ensureDefaultMappings(company_id);
    const data = await ProcurementDepartmentApprover.find({ company_id })
      .sort({ department: 1 })
      .lean();
    return res.json({ success: true, data: data.map(serialize) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** Lightweight list of active department names for PR dropdowns */
exports.listDepartments = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    await ensureDefaultMappings(company_id);
    const data = await ProcurementDepartmentApprover.find({ company_id, isActive: true })
      .select("department")
      .sort({ department: 1 })
      .lean();
    const departments = data.map((d) => d.department).filter(Boolean);
    return res.json({ success: true, data: departments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const department = String(req.body?.department || "").trim();
    const approverEmail = String(req.body?.approverEmail || "").trim().toLowerCase();
    const approverName = String(req.body?.approverName || "").trim();

    if (!department) {
      return res.status(400).json({ success: false, message: "Department is required" });
    }
    if (!approverEmail || !approverEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid approver email is required" });
    }

    const departmentKey = normalizeDepartment(department);
    const existing = await ProcurementDepartmentApprover.findOne({ company_id, departmentKey }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Department "${existing.department}" already has an approver mapping`,
      });
    }

    const user = await User.findOne({
      company_id,
      email: new RegExp(`^${approverEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isActive: true,
    })
      .select("firstName lastName email")
      .lean();

    const doc = await ProcurementDepartmentApprover.create({
      company_id,
      department,
      departmentKey,
      approverEmail,
      approverName:
        approverName ||
        (user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : ""),
      isActive: true,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      data: serialize(doc),
      warning: user
        ? undefined
        : `No active user found with email ${approverEmail}. Create/activate that account before PRs for this department can be submitted.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await ProcurementDepartmentApprover.findOne({
      _id: req.params.id,
      company_id,
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }

    const updates = { updatedBy: req.user?._id };
    if (req.body?.department !== undefined) {
      const department = String(req.body.department || "").trim();
      if (!department) {
        return res.status(400).json({ success: false, message: "Department is required" });
      }
      updates.department = department;
      updates.departmentKey = normalizeDepartment(department);
    }
    if (req.body?.approverEmail !== undefined) {
      const approverEmail = String(req.body.approverEmail || "").trim().toLowerCase();
      if (!approverEmail || !approverEmail.includes("@")) {
        return res.status(400).json({ success: false, message: "Valid approver email is required" });
      }
      updates.approverEmail = approverEmail;
    }
    if (req.body?.approverName !== undefined) {
      updates.approverName = String(req.body.approverName || "").trim();
    }
    if (req.body?.isActive !== undefined) {
      updates.isActive = !!req.body.isActive;
    }

    if (updates.departmentKey && updates.departmentKey !== existing.departmentKey) {
      const clash = await ProcurementDepartmentApprover.findOne({
        company_id,
        departmentKey: updates.departmentKey,
        _id: { $ne: existing._id },
      }).lean();
      if (clash) {
        return res.status(409).json({
          success: false,
          message: `Department "${clash.department}" already has an approver mapping`,
        });
      }
    }

    Object.assign(existing, updates);
    await existing.save();
    return res.json({ success: true, data: serialize(existing) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementDepartmentApprover.findOneAndDelete({
      _id: req.params.id,
      company_id,
    });
    if (!data) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }
    return res.json({ success: true, message: "Mapping deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.ensureDefaultMappings = ensureDefaultMappings;
