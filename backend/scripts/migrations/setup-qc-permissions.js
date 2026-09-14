// backend/scripts/migrations/setup-qc-permissions.js
// Usage:
//   node backend/scripts/migrations/setup-qc-permissions.js RESSICHEM
// or set COMPANY_ID env var.

require("dotenv").config();

const { connect, disconnect } = require("../../config/_db");
const Permission = require("../../models/Permission");
const PermissionGroup = require("../../models/PermissionGroup");
const Role = require("../../models/Role");

async function ensurePermission({ companyId, key, description }) {
  let p = await Permission.findOne({ key, company_id: companyId });
  if (!p) {
    p = await Permission.create({ key, description, company_id: companyId });
    console.log("✅ Created permission:", key);
  } else {
    // keep description updated (optional)
    if (description && p.description !== description) {
      p.description = description;
      await p.save();
    }
    console.log("ℹ️ Permission exists:", key);
  }
  return p;
}

async function ensureRole({ companyId, name, description, permissionIds }) {
  let r = await Role.findOne({ name, company_id: companyId });
  if (!r) {
    r = await Role.create({
      name,
      description,
      company_id: companyId,
      permissions: permissionIds,
      permissionGroups: [],
      isActive: true,
    });
    console.log("✅ Created role:", name);
  } else {
    // merge permissions
    const existing = new Set((r.permissions || []).map((id) => String(id)));
    for (const id of permissionIds) existing.add(String(id));
    r.permissions = Array.from(existing);
    if (description) r.description = description;
    await r.save();
    console.log("ℹ️ Role exists (updated):", name);
  }
  return r;
}

async function run() {
  const companyId = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    console.log("🔧 Setting up QC permissions for company:", companyId);

    const permissionDefs = [
      { key: "qc.access", description: "Access Quality Control module" },

      { key: "qc.tests.read", description: "Read QC tests" },
      { key: "qc.tests.create", description: "Create QC tests" },
      { key: "qc.tests.update", description: "Update QC tests" },
      { key: "qc.tests.delete", description: "Delete/deactivate QC tests" },

      { key: "qc.standards.read", description: "Read QC standard criteria" },
      { key: "qc.standards.create", description: "Create QC standard criteria" },
      { key: "qc.standards.update", description: "Update QC standard criteria" },
      { key: "qc.standards.delete", description: "Delete/deactivate QC standard criteria" },

      { key: "qc.results.read", description: "Read QC results" },
      { key: "qc.results.create", description: "Create QC results" },
      { key: "qc.results.update", description: "Update QC results" },
      { key: "qc.results.submit", description: "Submit QC results for approval" },
      { key: "qc.results.approve", description: "Approve/reject QC results" },

      { key: "qc.exports.read", description: "Export QC datasets (Power BI)" },

      // QC Site - R&D Trials (SRS 3.3.1+)
      { key: "rnd.access", description: "Access R&D trials module" },
      { key: "rnd.experiments.read", description: "Read R&D trial batches" },
      { key: "rnd.experiments.create", description: "Create R&D trial batches" },
      { key: "rnd.experiments.update", description: "Update R&D trial batches" },
      { key: "rnd.experiments.compare", description: "Compare R&D trials" },

      // QC Hub - Dry Mortar plan + forms
      { key: "qc.hub.plan.read", description: "Read QC Hub plan (Dry Mortar)" },
      { key: "qc.hub.plan.update", description: "Create/update QC Hub plan (Dry Mortar)" },
      { key: "qc.hub.forms.read", description: "Read QC Hub raw data forms" },
      { key: "qc.hub.forms.create", description: "Create QC Hub raw data forms" },
      { key: "qc.hub.forms.update", description: "Update QC Hub raw data forms" },
      { key: "qc.hub.forms.submit", description: "Submit QC Hub raw data forms" },
      { key: "qc.hub.forms.approve", description: "Approve/reject QC Hub raw data forms" },
      { key: "qc.hub.forms.export", description: "Export QC Hub raw data forms" },

      // QC user management (separate from global Users module)
      { key: "qc.users.read", description: "Read QC users list" },
      { key: "qc.users.create", description: "Create QC users (Site/Hub)" },
      { key: "qc.users.update", description: "Update QC users" },
    ];

    const perms = [];
    for (const def of permissionDefs) {
      perms.push(await ensurePermission({ companyId, ...def }));
    }

    // Permission group (helpful for UI)
    let group = await PermissionGroup.findOne({ name: "Quality Control", company_id: companyId });
    if (!group) {
      group = await PermissionGroup.create({
        name: "Quality Control",
        company_id: companyId,
        permissions: perms.map((p) => p._id),
      });
      console.log("✅ Created permission group: Quality Control");
    } else {
      const ids = perms.map((p) => String(p._id));
      const existing = new Set((group.permissions || []).map((id) => String(id)));
      let changed = false;
      for (const id of ids) {
        if (!existing.has(id)) {
          group.permissions.push(id);
          changed = true;
        }
      }
      if (changed) {
        await group.save();
        console.log("✅ Updated permission group: Quality Control");
      } else {
        console.log("ℹ️ Permission group exists: Quality Control");
      }
    }

    // Optional default roles aligned to SRS user classes
    const permId = (k) => perms.find((p) => p.key === k)?._id;

    // Split roles for separate login portals (as requested):
    // - QC Site User: can access QC Site Area only
    // - QC Hub User: can access QC Hub only
    await ensureRole({
      companyId,
      name: "QC Site User",
      description: "QC Site Area access (tests/standards/results). No QC Hub access.",
      permissionIds: [
        permId("qc.access"),
        permId("qc.tests.read"),
        permId("qc.standards.read"),
        permId("qc.results.read"),
        permId("qc.results.create"),
        permId("qc.results.update"),
        permId("qc.results.submit"),
        permId("qc.exports.read"),
        permId("rnd.access"),
        permId("rnd.experiments.read"),
        permId("rnd.experiments.create"),
        permId("rnd.experiments.update"),
        permId("rnd.experiments.compare"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "QC Hub User",
      description: "QC Hub access (Dry Mortar plan + raw data forms). No QC Site access.",
      permissionIds: [
        permId("qc.access"),
        permId("qc.hub.plan.read"),
        permId("qc.hub.forms.read"),
        permId("qc.hub.forms.create"),
        permId("qc.hub.forms.update"),
        permId("qc.hub.forms.submit"),
        permId("qc.hub.forms.export"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "QC Analyst",
      description: "QC data input and batch testing (submit for approval)",
      permissionIds: [
        permId("qc.access"),
        permId("qc.tests.read"),
        permId("qc.standards.read"),
        permId("qc.results.read"),
        permId("qc.results.create"),
        permId("qc.results.update"),
        permId("qc.results.submit"),
        permId("qc.exports.read"),
        permId("rnd.access"),
        permId("rnd.experiments.read"),
        permId("rnd.experiments.create"),
        permId("rnd.experiments.update"),
        permId("rnd.experiments.compare"),
        permId("qc.hub.plan.read"),
        permId("qc.hub.forms.read"),
        permId("qc.hub.forms.create"),
        permId("qc.hub.forms.update"),
        permId("qc.hub.forms.submit"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "QC Manager",
      description: "QC manager/director (full QC access incl. approvals)",
      permissionIds: perms.map((p) => p._id),
    });

    // QC Admin (can manage QC users without global users.* permissions)
    await ensureRole({
      companyId,
      name: "QC Admin",
      description: "Manage QC module + create QC users (Site/Hub)",
      permissionIds: [
        permId("qc.access"),
        permId("qc.tests.read"),
        permId("qc.tests.create"),
        permId("qc.tests.update"),
        permId("qc.tests.delete"),
        permId("qc.standards.read"),
        permId("qc.standards.create"),
        permId("qc.standards.update"),
        permId("qc.standards.delete"),
        permId("qc.results.read"),
        permId("qc.results.create"),
        permId("qc.results.update"),
        permId("qc.results.submit"),
        permId("qc.results.approve"),
        permId("qc.exports.read"),
        permId("rnd.access"),
        permId("rnd.experiments.read"),
        permId("rnd.experiments.create"),
        permId("rnd.experiments.update"),
        permId("rnd.experiments.compare"),
        permId("qc.hub.plan.read"),
        permId("qc.hub.plan.update"),
        permId("qc.hub.forms.read"),
        permId("qc.hub.forms.create"),
        permId("qc.hub.forms.update"),
        permId("qc.hub.forms.submit"),
        permId("qc.hub.forms.approve"),
        permId("qc.hub.forms.export"),
        permId("qc.users.read"),
        permId("qc.users.create"),
        permId("qc.users.update"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "QC Viewer",
      description: "Read-only QC dashboards and exports",
      permissionIds: [
        permId("qc.access"),
        permId("qc.results.read"),
        permId("qc.exports.read"),
        permId("rnd.access"),
        permId("rnd.experiments.read"),
        permId("qc.hub.plan.read"),
        permId("qc.hub.forms.read"),
      ].filter(Boolean),
    });

    console.log("🎯 QC permissions setup complete.");
  } catch (err) {
    console.error("❌ QC permissions setup failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();


