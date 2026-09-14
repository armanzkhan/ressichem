/**
 * Setup QC Hub SRS-Compliant Permissions
 * Adds permissions for all new SRS modules
 * 
 * Usage: node backend/scripts/migrations/setup-qc-srs-permissions.js RESSICHEM
 */

require("dotenv").config();
const { connect, disconnect } = require("../../config/_db");
const Permission = require("../../models/Permission");
const PermissionGroup = require("../../models/PermissionGroup");

async function ensurePermission({ companyId, key, description }) {
  let p = await Permission.findOne({ key, company_id: companyId });
  if (!p) {
    p = await Permission.create({ key, description, company_id: companyId });
    console.log("✅ Created permission:", key);
  } else {
    if (description && p.description !== description) {
      p.description = description;
      await p.save();
    }
    console.log("ℹ️ Permission exists:", key);
  }
  return p;
}

async function run() {
  const companyId = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    console.log("🔧 Setting up QC Hub SRS-Compliant permissions for company:", companyId);

    const permissionDefs = [
      // Base Access
      { key: "rnd.access", description: "Access R&D module" },
      { key: "management.access", description: "Access Management functions" },

      // Raw Materials Module
      { key: "qc.raw-materials.read", description: "Read raw materials" },
      { key: "qc.raw-materials.create", description: "Create raw materials" },
      { key: "qc.raw-materials.update", description: "Update raw materials" },
      { key: "qc.raw-materials.delete", description: "Delete/deactivate raw materials" },
      { key: "qc.raw-materials.batches.read", description: "Read raw material batches" },
      { key: "qc.raw-materials.batches.create", description: "Create raw material batches" },
      { key: "qc.raw-materials.batches.update", description: "Update raw material batches" },

      // Formulations Module
      { key: "qc.formulations.read", description: "Read formulations" },
      { key: "qc.formulations.create", description: "Create formulations" },
      { key: "qc.formulations.update", description: "Update formulations" },
      { key: "qc.formulations.version", description: "Create formulation versions" },
      { key: "qc.formulations.submit-to-qc", description: "Submit R&D formulation to QC" },
      { key: "qc.formulations.approve-for-qc", description: "Approve R&D formulation for QC (Management only)" },
      { key: "qc.formulations.freeze", description: "Freeze formulations (Management only)" },
      { key: "qc.formulations.bom", description: "Generate BOM" },

      // R&D Experiments Module
      { key: "rnd.experiments.read", description: "Read R&D experiments" },
      { key: "rnd.experiments.create", description: "Create R&D experiments" },
      { key: "rnd.experiments.update", description: "Update R&D experiments" },
      { key: "rnd.experiments.trials.create", description: "Add trials to experiments" },
      { key: "rnd.experiments.trials.update", description: "Update experiment trials" },
      { key: "rnd.experiments.compare", description: "Compare experiment trials" },
      { key: "rnd.experiments.complete", description: "Complete experiments" },

      // Electronic Signatures Module
      { key: "qc.signatures.create", description: "Create electronic signatures" },
      { key: "qc.signatures.read", description: "Read electronic signatures" },
      { key: "qc.signatures.verify", description: "Verify electronic signatures" },

      // Complaints Module
      { key: "qc.complaints.read", description: "Read complaints (QC & Management only)" },
      { key: "qc.complaints.create", description: "Create complaints (QC only)" },
      { key: "qc.complaints.update", description: "Update complaints" },
      { key: "qc.complaints.investigate", description: "Start complaint investigation" },
      { key: "qc.complaints.submit-review", description: "Submit complaint for management review" },
      { key: "qc.complaints.management-review", description: "Management review of complaints" },
      { key: "qc.complaints.resolve", description: "Resolve complaints" },
      { key: "qc.complaints.close", description: "Close complaints (Management only)" },

      // CAPA Module
      { key: "qc.capa.read", description: "Read CAPAs" },
      { key: "qc.capa.create", description: "Create CAPAs (QC can initiate)" },
      { key: "qc.capa.update", description: "Update CAPAs" },
      { key: "qc.capa.root-cause", description: "Conduct root cause analysis" },
      { key: "qc.capa.submit-approval", description: "Submit CAPA for approval" },
      { key: "qc.capa.approve", description: "Approve CAPAs (Management only)" },
      { key: "qc.capa.implement", description: "Start/update CAPA implementation" },
      { key: "qc.capa.verify", description: "Verify CAPA implementation" },
      { key: "qc.capa.close", description: "Close CAPAs (Management only)" },

      // MRM Module
      { key: "qc.mrm.read", description: "Read MRMs (Management only)" },
      { key: "qc.mrm.create", description: "Create MRMs (Management only)" },
      { key: "qc.mrm.update", description: "Update MRMs (Management only)" },
      { key: "qc.mrm.pull-data", description: "Pull data for MRM (Management only)" },
      { key: "qc.mrm.complete", description: "Complete MRM (Management only)" },
      { key: "qc.mrm.approve", description: "Approve MRM (Management only)" },

      // Reporting Module
      { key: "qc.reporting.certificate", description: "Generate QC certificates" },
      { key: "qc.reporting.dashboard.performance", description: "View performance dashboard" },
      { key: "qc.reporting.dashboard.complaints", description: "View complaint dashboard" },
      { key: "qc.reporting.dashboard.capa", description: "View CAPA dashboard" },
      { key: "qc.reporting.en-compliance", description: "View EN compliance reports" },
      { key: "qc.reporting.export", description: "Export reports (Excel/CSV/PDF)" },
    ];

    const perms = [];
    for (const def of permissionDefs) {
      perms.push(await ensurePermission({ companyId, ...def }));
    }

    // Update Quality Control permission group
    let qcGroup = await PermissionGroup.findOne({ name: "Quality Control", company_id: companyId });
    if (qcGroup) {
      const existing = new Set((qcGroup.permissions || []).map((id) => String(id)));
      let changed = false;
      for (const p of perms) {
        if (!existing.has(String(p._id))) {
          qcGroup.permissions.push(p._id);
          changed = true;
        }
      }
      if (changed) {
        await qcGroup.save();
        console.log("✅ Updated permission group: Quality Control");
      }
    }

    // Create R&D permission group
    const rndPerms = perms.filter((p) => p.key.startsWith("rnd."));
    let rndGroup = await PermissionGroup.findOne({ name: "Research & Development", company_id: companyId });
    if (!rndGroup && rndPerms.length > 0) {
      rndGroup = await PermissionGroup.create({
        name: "Research & Development",
        company_id: companyId,
        permissions: rndPerms.map((p) => p._id),
      });
      console.log("✅ Created permission group: Research & Development");
    } else if (rndGroup) {
      const existing = new Set((rndGroup.permissions || []).map((id) => String(id)));
      let changed = false;
      for (const p of rndPerms) {
        if (!existing.has(String(p._id))) {
          rndGroup.permissions.push(p._id);
          changed = true;
        }
      }
      if (changed) {
        await rndGroup.save();
        console.log("✅ Updated permission group: Research & Development");
      }
    }

    // Create Management permission group
    const mgmtPerms = perms.filter((p) => p.key.startsWith("management.") || p.key.includes("approve") || p.key.includes("close") || p.key.includes("freeze") || p.key.includes("mrm"));
    let mgmtGroup = await PermissionGroup.findOne({ name: "Management", company_id: companyId });
    if (!mgmtGroup && mgmtPerms.length > 0) {
      mgmtGroup = await PermissionGroup.create({
        name: "Management",
        company_id: companyId,
        permissions: mgmtPerms.map((p) => p._id),
      });
      console.log("✅ Created permission group: Management");
    } else if (mgmtGroup) {
      const existing = new Set((mgmtGroup.permissions || []).map((id) => String(id)));
      let changed = false;
      for (const p of mgmtPerms) {
        if (!existing.has(String(p._id))) {
          mgmtGroup.permissions.push(p._id);
          changed = true;
        }
      }
      if (changed) {
        await mgmtGroup.save();
        console.log("✅ Updated permission group: Management");
      }
    }

    console.log("🎯 QC Hub SRS-Compliant permissions setup complete.");
    console.log(`✅ Created/updated ${perms.length} permissions`);
  } catch (err) {
    console.error("❌ Setup failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();

module.exports = { run };

