/**
 * Ensure every role/user that can create PRs also has items.create
 * (so Requesters can add catalog items while raising a PR).
 *
 * Usage (from backend/):
 *   node scripts/migrations/fix-requester-item-create.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Permission = require("../../models/Permission");

const COMPANY_ID = process.env.COMPANY_ID || "RESSICHEM";
const DEFAULT_URI =
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

const PR_CREATE_KEY = "procurement.requisitions.create";
const ITEM_CREATE_KEY = "procurement.items.create";
const ITEM_READ_KEY = "procurement.items.read";

async function main() {
  const uri = process.env.MONGODB_URI || process.env.CONNECTION_STRING || process.env.MONGO_URI || DEFAULT_URI;
  await mongoose.connect(uri, { dbName: "Ressichem" });
  console.log("Connected");

  const needed = await Permission.find({
    company_id: COMPANY_ID,
    key: { $in: [PR_CREATE_KEY, ITEM_CREATE_KEY, ITEM_READ_KEY] },
  })
    .select("_id key")
    .lean();

  const byKey = Object.fromEntries(needed.map((p) => [p.key, p._id]));
  for (const key of [PR_CREATE_KEY, ITEM_CREATE_KEY, ITEM_READ_KEY]) {
    if (!byKey[key]) {
      throw new Error(`Missing permission ${key}. Run setup-procurement-permissions.js first.`);
    }
  }

  const roles = await Role.find({ company_id: COMPANY_ID, isActive: { $ne: false } }).populate(
    "permissions",
    "key"
  );
  const prRoles = [];

  for (const role of roles) {
    const keys = new Set((role.permissions || []).map((p) => (typeof p === "object" ? p.key : null)));
    if (!keys.has(PR_CREATE_KEY)) continue;

    const permIds = new Set((role.permissions || []).map((p) => String(p._id || p)));
    let changed = false;
    if (!keys.has(ITEM_CREATE_KEY)) {
      permIds.add(String(byKey[ITEM_CREATE_KEY]));
      changed = true;
    }
    if (!keys.has(ITEM_READ_KEY)) {
      permIds.add(String(byKey[ITEM_READ_KEY]));
      changed = true;
    }
    if (changed) {
      role.permissions = Array.from(permIds);
      await role.save();
      console.log(`Updated role: ${role.name} (+ items.read/create)`);
    } else {
      console.log(`Role OK: ${role.name}`);
    }
    prRoles.push(role);
  }

  if (!prRoles.length) {
    console.log("No roles with requisitions.create found.");
    await mongoose.disconnect();
    return;
  }

  const roleIds = prRoles.map((r) => r._id);
  const roleNames = prRoles.map((r) => r.name);
  const users = await User.find({
    company_id: COMPANY_ID,
    $or: [{ roles: { $in: roleIds } }, { role: { $in: roleNames } }],
  });

  let synced = 0;
  for (const user of users) {
    const assignedRole =
      prRoles.find((r) => (user.roles || []).some((id) => String(id) === String(r._id))) ||
      prRoles.find((r) => r.name === user.role) ||
      prRoles[0];

    const nextPermIds = (assignedRole.permissions || []).map((p) => p._id || p);
    user.roles = [assignedRole._id];
    if (!user.role) user.role = assignedRole.name;
    user.permissions = nextPermIds;
    if (!Array.isArray(user.modules) || !user.modules.includes("PROCUREMENT")) {
      user.modules = Array.from(new Set([...(user.modules || []), "PROCUREMENT"]));
    }
    await user.save();
    synced += 1;
    console.log(`Synced ${user.email} ← ${assignedRole.name}`);
  }

  console.log(`Done. Roles checked=${prRoles.length}, users synced=${synced}.`);
  console.log("Users should log out/in if a stale JWT still blocks them (API also accepts requisitions.create).");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
