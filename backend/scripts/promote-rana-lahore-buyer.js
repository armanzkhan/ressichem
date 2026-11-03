/**
 * Ensure rana.mehtab@ressichem.com is the Lahore procurement buyer (PR + PO, Lahore only).
 * Does not change an existing password.
 * Run: node scripts/promote-rana-lahore-buyer.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const { departmentFromArea } = require("../utils/procurementRoleHelpers");

const URI =
  process.env.MONGODB_URI ||
  process.env.CONNECTION_STRING ||
  process.env.MONGO_URI;

async function permissionIdsForRole(company_id, roleName) {
  const role = await Role.findOne({ company_id, name: roleName })
    .populate("permissions", "key")
    .lean();
  if (!role) throw new Error(`Role not found: ${roleName}`);
  const ids = (role.permissions || []).map((p) => p._id || p).filter(Boolean);
  const keys = new Set((role.permissions || []).map((p) => p.key).filter(Boolean));
  if (keys.has("procurement.requisitions.create")) {
    const extra = await Permission.find({
      company_id,
      key: { $in: ["procurement.items.create", "procurement.items.read"] },
    })
      .select("_id")
      .lean();
    for (const p of extra) {
      if (!ids.some((id) => String(id) === String(p._id))) ids.push(p._id);
    }
  }
  return { roleId: role._id, permissionIds: ids };
}

(async () => {
  await mongoose.connect(URI, { dbName: "Ressichem" });
  const email = "rana.mehtab@ressichem.com";
  const company_id = "RESSICHEM";
  const roleName = "Procurement Buyer";
  const department = departmentFromArea("local_lahore");
  const { roleId, permissionIds } = await permissionIdsForRole(company_id, roleName);

  let user = await User.findOne({
    company_id,
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  let created = false;
  if (!user) {
    const password = process.env.LAHORE_BUYER_PASSWORD || "RanaLahore@2026";
    user = await User.create({
      company_id,
      user_id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      email,
      password: await bcrypt.hash(password, 10),
      firstName: "Rana",
      lastName: "Mehtab",
      phone: "",
      department,
      role: roleName,
      roles: [roleId],
      permissions: permissionIds,
      modules: ["PROCUREMENT"],
      isActive: true,
      isCustomer: false,
      isManager: false,
      isCompanyAdmin: false,
    });
    created = true;
    console.log("created", email);
  } else {
    const modules = new Set(user.modules || []);
    modules.add("PROCUREMENT");
    user.role = roleName;
    user.roles = [roleId];
    user.permissions = permissionIds;
    user.department = department;
    user.modules = [...modules];
    user.isActive = true;
    if (!user.firstName) user.firstName = "Rana";
    if (!user.lastName) user.lastName = "Mehtab";
    await user.save();
    console.log("updated", email);
  }

  console.log(
    JSON.stringify(
      {
        email: user.email,
        role: user.role,
        department: user.department,
        modules: user.modules,
        created,
        permissionCount: permissionIds.length,
      },
      null,
      2
    )
  );

  // Verify po.create key present on role
  const role = await Role.findById(roleId).populate("permissions", "key").lean();
  const keys = (role.permissions || []).map((p) => p.key);
  console.log("hasPoCreate", keys.includes("procurement.po.create"));
  console.log("hasPoRead", keys.includes("procurement.po.read"));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
