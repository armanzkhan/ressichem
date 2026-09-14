/**
 * Setup QC & R&D Three-Layer Roles
 * Creates roles aligned with SRS Section 2.3
 * 
 * Usage: node backend/scripts/migrations/setup-qc-rnd-roles.js RESSICHEM
 */

require("dotenv").config();
const { connect, disconnect } = require("../../config/_db");
const Role = require("../../models/Role");
const Permission = require("../../models/Permission");

async function ensurePermission(companyId, key, description) {
  let p = await Permission.findOne({ key, company_id: companyId });
  if (!p) {
    p = await Permission.create({ key, description, company_id: companyId });
    console.log(`✅ Created permission: ${key}`);
  }
  return p;
}

async function ensureRole(companyId, name, description, permissionIds = []) {
  let r = await Role.findOne({ name, company_id: companyId });
  if (!r) {
    r = await Role.create({
      name,
      description,
      company_id: companyId,
      permissions: permissionIds,
      isActive: true,
    });
    console.log(`✅ Created role: ${name}`);
  } else {
    console.log(`ℹ️  Role exists: ${name}`);
  }
  return r;
}

async function run() {
  const companyId = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    console.log("🔧 Setting up QC & R&D Three-Layer Roles for company:", companyId);

    // Ensure base permissions exist
    const qcAccess = await ensurePermission(companyId, "qc.access", "Access Quality Control module");
    const rndAccess = await ensurePermission(companyId, "rnd.access", "Access R&D module");
    const managementAccess = await ensurePermission(companyId, "management.access", "Access Management functions");

    // Layer 1: QC Roles
    await ensureRole(companyId, "QC Lab Technician", "Layer 1 - QC: Execute QC testing, cannot see R&D data", [qcAccess._id]);
    await ensureRole(companyId, "QC Supervisor", "Layer 1 - QC: Supervise QC operations, can approve results", [qcAccess._id]);

    // Layer 2: R&D Roles
    await ensureRole(companyId, "R&D Chemist", "Layer 2 - R&D: Develop formulations, cannot release to QC", [rndAccess._id]);
    await ensureRole(companyId, "Senior R&D Scientist", "Layer 2 - R&D: Lead R&D projects, supervise experiments", [rndAccess._id]);

    // Layer 3: Management Roles
    await ensureRole(companyId, "Technical Manager (R&D)", "Layer 3 - Management: Approve R&D→QC, freeze formulations, close CAPA", [qcAccess._id, rndAccess._id, managementAccess._id]);
    await ensureRole(companyId, "Plant Head", "Layer 3 - Management: Plant-level oversight, conduct MRM", [qcAccess._id, rndAccess._id, managementAccess._id]);
    await ensureRole(companyId, "CEO", "Layer 3 - Management: Full system access, strategic decisions", [qcAccess._id, rndAccess._id, managementAccess._id]);
    await ensureRole(companyId, "Director", "Layer 3 - Management: Full system access, strategic oversight", [qcAccess._id, rndAccess._id, managementAccess._id]);

    console.log("🎯 QC & R&D Three-Layer Roles setup complete.");
    console.log("\n📋 Next steps:");
    console.log("1. Assign qcRndProfile to users with appropriate layer and role");
    console.log("2. Set access control flags (canReleaseToQC, canFreezeFormulations, etc.)");
    console.log("3. Test access control with different user types");
  } catch (err) {
    console.error("❌ Setup failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();

module.exports = { run };

