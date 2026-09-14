const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  company_id: { type: String, ref: "Company", required: true },
  email: { type: String, required: true }, // Made unique per company_id via compound index below
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  bio: { type: String },
  avatarUrl: { type: String },
  role: { type: String },
  department: { type: String },
  // Optional module tags for faster filtering in dedicated portals (e.g. QC Site vs QC Hub)
  modules: [{ type: String, index: true }], // e.g. ["QC_SITE", "QC_HUB"]
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }], // Direct permissions
  isActive: { type: Boolean, default: true },
  isSuperAdmin: { type: Boolean, default: false },
  isCompanyAdmin: { type: Boolean, default: false },
  
  // Customer-specific fields
  isCustomer: { type: Boolean, default: false },
  customerProfile: {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    companyName: { type: String },
    customerType: { type: String, default: "regular" },
    assignedManager: {
      manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      assignedAt: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true }
    },
    preferences: {
      preferredCategories: [{ type: String }],
      notificationPreferences: {
        orderUpdates: { type: Boolean, default: true },
        statusChanges: { type: Boolean, default: true },
        newProducts: { type: Boolean, default: false }
      }
    }
  },
  
  // Manager-specific fields
  isManager: { type: Boolean, default: false },
  managerProfile: {
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
    assignedCategories: [{ type: String }], // Quick reference to assigned categories
    managerLevel: { 
      type: String, 
      enum: ['junior', 'senior', 'lead', 'head'], 
      default: 'junior' 
    },
    canAssignCategories: { type: Boolean, default: false }, // Can assign categories to other managers
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      stockAlerts: { type: Boolean, default: true },
      statusChanges: { type: Boolean, default: true },
      newOrders: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      categoryReports: { type: Boolean, default: true }
    }
  },

  // QC & R&D Layer Model (SRS Section 2.3)
  qcRndProfile: {
    layer: {
      type: String,
      enum: ["QC", "R&D", "MANAGEMENT"],
      index: true,
    },
    // Layer 1 - QC (Execution & Compliance)
    qcRole: {
      type: String,
      enum: ["QC_LAB_TECHNICIAN", "QC_SUPERVISOR"],
    },
    // Layer 2 - R&D (Innovation & Development)
    rndRole: {
      type: String,
      enum: ["R&D_CHEMIST", "SENIOR_R&D_SCIENTIST"],
    },
    // Layer 3 - Management (Governance & Approval)
    managementRole: {
      type: String,
      enum: ["TECHNICAL_MANAGER_RND", "PLANT_HEAD", "CEO", "DIRECTOR"],
    },
    // Access control flags
    canAccessRndData: { type: Boolean, default: false }, // Management only
    canReleaseToQC: { type: Boolean, default: false }, // Management only
    canFreezeFormulations: { type: Boolean, default: false }, // Management only
    canDefineAcceptanceLimits: { type: Boolean, default: false }, // Management only
    canCloseCAPA: { type: Boolean, default: false }, // Management only
    canConductMRM: { type: Boolean, default: false }, // Management only
  },

  // Formulation 2-step verification (SRS 4.2)
  formulation2fa: {
    codeHash: { type: String, default: "" },
    expiresAt: { type: Date },
    verifiedAt: { type: Date },
  },
});

UserSchema.index({ company_id: 1, user_id: 1 }, { unique: true });
// Make email unique per company_id for true multi-tenancy
UserSchema.index({ company_id: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);

