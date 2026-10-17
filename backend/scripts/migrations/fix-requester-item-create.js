/**
 * Ensure "Procurement User" (Requester) role includes items.create so
 * requesters can add catalog items while raising a PR.
 * Also syncs babarshaikh@ / raees.ahmed@ (and optionally all Requesters).
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
const ROLE_NAME = "Procurement User";
const EXTRA_EMAILS = ["babarshaikh@ressichem.com", "raees.ahmed@ressichem.com"];
const DEFAULT_URI =
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

const PERM_KEYS = [
  "procurement.access",
  "procurement.dashboard.read",
  "procurement.items.read",
  "procurement.items.create",
  "procurement.requisitions.read",
  "procurement.requisitions.create",
  "procurement.requisitions.update",
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.CONNECTION_STRING || process.env.MONGO_URI || DEFAULT_URI;
  await mongoose.connect(uri, { dbName: "Ressichem" });
  console.log("Connected");

  const perms = await Permission.find({ company_id: COMPANY_ID, key: { $in: PERM_KEYS } })
    .select("_id key")
    .lean();
  const found = new Set(perms.map((p) => p.key));
  const missing = PERM_KEYS.filter((k) => !found.has(k));
  if (missing.length) {
    throw new Error(`Missing permissions: ${missing.join(", ")}. Run setup-procurement-permissions.js first.`);
  }

  let role = await Role.findOne({ company_id: COMPANY_ID, name: ROLE_NAME });
  if (!role) {
    role = await Role.create({
      company_id: COMPANY_ID,
      name: ROLE_NAME,
      description: "Requester — create purchase requisitions and view PR status",
      permissions: perms.map((p) => p._id),
      isActive: true,
    });
    console.log(`Created role: ${ROLE_NAME}`);
  } else {
    role.permissions = perms.map((p) => p._id);
    role.description = "Requester — create purchase requisitions and view PR status";
    await role.save();
    console.log(`Updated role permissions: ${ROLE_NAME}`);
  }

  console.log("Role now has:", PERM_KEYS.join(", "));

  // Sync all users on this role + the named emails
  const users = await User.find({
    company_id: COMPANY_ID,
    $or: [
      { roles: role._id },
      { role: ROLE_NAME },
      { email: { $in: EXTRA_EMAILS.map((e) => new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) } },
    ],
  });

  for (const user of users) {
    user.role = ROLE_NAME;
    user.roles = [role._id];
    user.permissions = perms.map((p) => p._id);
    if (!Array.isArray(user.modules) || !user.modules.includes("PROCUREMENT")) {
      user.modules = Array.from(new Set([...(user.modules || []), "PROCUREMENT"]));
    }
    await user.save();
    console.log(`Synced ${user.email}`);
  }

  console.log(`Done. Updated ${users.length} user(s). Ask them to log out and log back into Procurement.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
