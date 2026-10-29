/**
 * Promote rana.mehtab@ressichem.com to Procurement Buyer — Local (Lahore).
 * Run: node scripts/promote-rana-lahore-buyer.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
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
  const user = await User.findOne({
    company_id,
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  const roleName = "Procurement Buyer";
  const department = departmentFromArea("local_lahore");
  const { roleId, permissionIds } = await permissionIdsForRole(company_id, roleName);

  user.role = roleName;
  user.roles = [roleId];
  user.permissions = permissionIds;
  user.department = department;
  await user.save();

  console.log(
    JSON.stringify(
      {
        email: user.email,
        role: user.role,
        department: user.department,
        permissionCount: permissionIds.length,
        hasPoCreate: permissionIds.length > 0,
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
