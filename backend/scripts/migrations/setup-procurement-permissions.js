// backend/scripts/migrations/setup-procurement-permissions.js
// Usage:
//   node backend/scripts/migrations/setup-procurement-permissions.js RESSICHEM

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
    if (description && p.description !== description) {
      p.description = description;
      await p.save();
    }
    console.log("ℹ️ Permission exists:", key);
  }
  return p;
}

async function ensureRole({ companyId, name, description, permissionIds, replacePermissions = false }) {
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
    if (replacePermissions) {
      r.permissions = permissionIds;
    } else {
      const existing = new Set((r.permissions || []).map((id) => String(id)));
      for (const id of permissionIds) existing.add(String(id));
      r.permissions = Array.from(existing);
    }
    if (description) r.description = description;
    await r.save();
    console.log(replacePermissions ? "✅ Role permissions replaced:" : "ℹ️ Role exists (updated):", name);
  }
  return r;
}

async function run() {
  const companyId = process.argv[2] || process.env.COMPANY_ID || "RESSICHEM";
  await connect();

  try {
    console.log("🔧 Setting up Procurement permissions for company:", companyId);

    const permissionDefs = [
      { key: "procurement.access", description: "Access Procurement System module" },
      { key: "procurement.dashboard.read", description: "View procurement dashboard" },

      { key: "procurement.vendors.read", description: "Read suppliers/vendors" },
      { key: "procurement.vendors.create", description: "Create suppliers/vendors" },
      { key: "procurement.vendors.update", description: "Update suppliers/vendors" },

      { key: "procurement.items.read", description: "Read procurement items" },
      { key: "procurement.items.create", description: "Create procurement items" },
      { key: "procurement.items.update", description: "Update procurement items" },

      { key: "procurement.prices.read", description: "Read item prices (multi-currency)" },
      { key: "procurement.prices.create", description: "Create item prices" },
      { key: "procurement.prices.update", description: "Update item prices" },

      { key: "procurement.pfi.read", description: "Read proforma invoices (PFI)" },
      { key: "procurement.pfi.create", description: "Create PFI" },
      { key: "procurement.pfi.update", description: "Update PFI" },
      { key: "procurement.pfi.approve", description: "Approve/convert PFI" },

      { key: "procurement.requisitions.read", description: "Read purchase requisitions" },
      { key: "procurement.requisitions.create", description: "Create purchase requisitions" },
      { key: "procurement.requisitions.update", description: "Update purchase requisitions" },
      { key: "procurement.requisitions.approve", description: "Approve purchase requisitions" },

      { key: "procurement.po.read", description: "Read purchase orders" },
      { key: "procurement.po.create", description: "Create purchase orders" },
      { key: "procurement.po.update", description: "Update purchase orders" },
      { key: "procurement.po.approve", description: "Approve purchase orders" },
      { key: "procurement.po.delete", description: "Delete purchase orders (admin)" },

      { key: "procurement.costing.read", description: "Read payment/costing/expense sheets" },
      { key: "procurement.costing.create", description: "Create payment/costing/expense sheets" },
      { key: "procurement.costing.update", description: "Update payment/costing/expense sheets" },

      { key: "procurement.users.read", description: "Read procurement users" },
      { key: "procurement.users.create", description: "Create procurement users" },
      { key: "procurement.users.update", description: "Update procurement users" },
    ];

    const perms = [];
    for (const def of permissionDefs) {
      perms.push(await ensurePermission({ companyId, ...def }));
    }

    let group = await PermissionGroup.findOne({ name: "Procurement", company_id: companyId });
    if (!group) {
      group = await PermissionGroup.create({
        name: "Procurement",
        company_id: companyId,
        permissions: perms.map((p) => p._id),
      });
      console.log("✅ Created permission group: Procurement");
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
        console.log("✅ Updated permission group: Procurement");
      } else {
        console.log("ℹ️ Permission group exists: Procurement");
      }
    }

    const permId = (k) => perms.find((p) => p.key === k)?._id;

    // Requester: create PRs + view PR status only (items.read needed to pick catalog lines)
    await ensureRole({
      companyId,
      name: "Procurement User",
      description: "Requester — create purchase requisitions and view PR status",
      replacePermissions: true,
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.items.read"),
        permId("procurement.requisitions.read"),
        permId("procurement.requisitions.create"),
        permId("procurement.requisitions.update"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "Procurement Buyer",
      description: "Create and manage requisitions and purchase orders",
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.vendors.read"),
        permId("procurement.vendors.create"),
        permId("procurement.vendors.update"),
        permId("procurement.items.read"),
        permId("procurement.items.create"),
        permId("procurement.items.update"),
        permId("procurement.prices.read"),
        permId("procurement.prices.create"),
        permId("procurement.prices.update"),
        permId("procurement.requisitions.read"),
        permId("procurement.requisitions.create"),
        permId("procurement.requisitions.update"),
        permId("procurement.po.read"),
        permId("procurement.po.create"),
        permId("procurement.po.update"),
        permId("procurement.pfi.read"),
        permId("procurement.pfi.create"),
        permId("procurement.pfi.update"),
        permId("procurement.costing.read"),
        permId("procurement.costing.create"),
        permId("procurement.costing.update"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "Procurement Manager",
      description: "Approve, reject, or hold purchase requisitions",
      replacePermissions: true,
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.requisitions.read"),
        permId("procurement.requisitions.approve"),
        permId("procurement.items.read"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "Procurement Admin",
      description: "Full procurement access and user management",
      permissionIds: perms.map((p) => p._id),
    });

    await ensureRole({
      companyId,
      name: "Procurement Viewer",
      description: "Read-only procurement dashboards and records",
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.vendors.read"),
        permId("procurement.items.read"),
        permId("procurement.prices.read"),
        permId("procurement.requisitions.read"),
        permId("procurement.po.read"),
        permId("procurement.pfi.read"),
        permId("procurement.costing.read"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "Procurement Local User",
      description: "Domestic (local) purchasing — suppliers, items, requisitions, and POs",
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.vendors.read"),
        permId("procurement.vendors.create"),
        permId("procurement.vendors.update"),
        permId("procurement.items.read"),
        permId("procurement.items.create"),
        permId("procurement.items.update"),
        permId("procurement.prices.read"),
        permId("procurement.requisitions.read"),
        permId("procurement.requisitions.create"),
        permId("procurement.requisitions.update"),
        permId("procurement.po.read"),
        permId("procurement.po.create"),
        permId("procurement.po.update"),
        permId("procurement.costing.read"),
        permId("procurement.costing.create"),
        permId("procurement.costing.update"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "Procurement Import User",
      description: "Import purchasing — foreign suppliers, POs, PRs, and received PFI",
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.vendors.read"),
        permId("procurement.vendors.create"),
        permId("procurement.vendors.update"),
        permId("procurement.items.read"),
        permId("procurement.items.create"),
        permId("procurement.items.update"),
        permId("procurement.prices.read"),
        permId("procurement.prices.create"),
        permId("procurement.prices.update"),
        permId("procurement.requisitions.read"),
        permId("procurement.requisitions.create"),
        permId("procurement.requisitions.update"),
        permId("procurement.po.read"),
        permId("procurement.po.create"),
        permId("procurement.po.update"),
        permId("procurement.pfi.read"),
        permId("procurement.pfi.create"),
        permId("procurement.pfi.update"),
        permId("procurement.costing.read"),
        permId("procurement.costing.create"),
        permId("procurement.costing.update"),
      ].filter(Boolean),
    });

    await ensureRole({
      companyId,
      name: "Procurement Export User",
      description: "Export operations — PFI, received PFI, documents, and shipment tracking",
      permissionIds: [
        permId("procurement.access"),
        permId("procurement.dashboard.read"),
        permId("procurement.vendors.read"),
        permId("procurement.vendors.create"),
        permId("procurement.vendors.update"),
        permId("procurement.pfi.read"),
        permId("procurement.pfi.create"),
        permId("procurement.pfi.update"),
      ].filter(Boolean),
    });

    console.log("🎯 Procurement permissions setup complete.");
  } catch (err) {
    console.error("❌ Procurement permissions setup failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

if (require.main === module) run();
