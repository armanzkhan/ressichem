// Create or update QC Hub admin user with full Dry Mortar module access.
//
// Usage:
//   node backend/scripts/migrations/create-qc-hub-user-arsalan.js
//   QC_HUB_USER_PASSWORD=YourPassword node backend/scripts/migrations/create-qc-hub-user-arsalan.js
//
// Optional args: [company_id] [email]

require("dotenv").config();

const bcrypt = require("bcryptjs");
const { connect, disconnect } = require("../../config/_db");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Permission = require("../../models/Permission");

const EMAIL = (process.argv[3] || process.env.QC_HUB_USER_EMAIL || "arsalan@ressichem.com").toLowerCase();
const COMPANY_ID = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
const PASSWORD = process.env.QC_HUB_USER_PASSWORD || "Arsalan@Hub2026";
const ROLE_NAME = "QC Manager";

function makeUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function run() {
  await connect();

  const role = await Role.findOne({ company_id: COMPANY_ID, name: ROLE_NAME }).populate("permissions");
  if (!role) {
    throw new Error(`Role "${ROLE_NAME}" not found for ${COMPANY_ID}. Run: npm run qc:perms`);
  }

  const qcAccess = await Permission.findOne({ company_id: COMPANY_ID, key: "qc.access" });
  if (!qcAccess) {
    throw new Error("qc.access permission missing. Run: npm run qc:perms");
  }

  const directPermIds = [qcAccess._id];
  const permKeys = (role.permissions || []).map((p) => p.key).filter(Boolean);

  const qcRndProfile = {
    layer: "MANAGEMENT",
    managementRole: "PLANT_HEAD",
    canAccessRndData: true,
    canReleaseToQC: true,
    canFreezeFormulations: true,
    canDefineAcceptanceLimits: true,
    canCloseCAPA: true,
    canConductMRM: true,
  };

  const hashed = await bcrypt.hash(PASSWORD, 10);
  let user = await User.findOne({ company_id: COMPANY_ID, email: EMAIL });

  if (user) {
    user.password = hashed;
    user.firstName = user.firstName || "Arsalan";
    user.lastName = user.lastName || "";
    user.department = "QC/R&D";
    user.role = ROLE_NAME;
    user.roles = [role._id];
    user.permissions = directPermIds;
    user.modules = ["QC_HUB"];
    user.qcRndProfile = qcRndProfile;
    user.isActive = true;
    user.isCustomer = false;
    user.isManager = false;
    user.isCompanyAdmin = false;
    await user.save();
    console.log(`ℹ️ Updated existing user: ${EMAIL}`);
  } else {
    user = await User.create({
      company_id: COMPANY_ID,
      user_id: makeUserId(),
      email: EMAIL,
      password: hashed,
      firstName: "Arsalan",
      lastName: "",
      phone: "",
      department: "QC/R&D",
      role: ROLE_NAME,
      roles: [role._id],
      permissions: directPermIds,
      modules: ["QC_HUB"],
      qcRndProfile,
      isActive: true,
      isCustomer: false,
      isManager: false,
      isCompanyAdmin: false,
    });
    console.log(`✅ Created QC Hub user: ${EMAIL}`);
  }

  console.log("\n--- QC Hub login ---");
  console.log(`  Portal:   /qc/hub-login`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Role:     ${ROLE_NAME} (full QC Hub + approvals + R&D + exports)`);
  console.log(`  Modules:  QC_HUB only`);
  console.log(`  Permissions via role: ${permKeys.length} keys`);
  console.log("\n  Hub access includes: all 8 product QC modules, raw/packaging QC,");
  console.log("  formulations, R&D, QA (NCR/CAPA/audits/calibration), reporting,");
  console.log("  predictive analytics, documents, and Power BI exports.");
}

run()
  .catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
