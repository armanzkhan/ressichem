/**
 * Ensure role "Procurement Requester Approver" exists and assign it to lab@ressichem.com
 * so the user can both create and approve purchase requisitions.
 *
 * Usage (from backend/):
 *   node scripts/migrations/set-lab-requester-approver.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Permission = require("../../models/Permission");

const COMPANY_ID = process.env.COMPANY_ID || "RESSICHEM";
const EMAIL = (process.env.LAB_EMAIL || "lab@ressichem.com").trim().toLowerCase();
const ROLE_NAME = "Procurement Requester Approver";
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
  "procurement.requisitions.approve",
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
      description: "Create PRs and approve/reject/hold — PR and reports only",
      permissions: perms.map((p) => p._id),
      isActive: true,
    });
    console.log(`Created role: ${ROLE_NAME}`);
  } else {
    role.permissions = perms.map((p) => p._id);
    role.description = "Create PRs and approve/reject/hold — PR and reports only";
    await role.save();
    console.log(`Updated role permissions: ${ROLE_NAME}`);
  }

  const user = await User.findOne({
    company_id: COMPANY_ID,
    email: new RegExp(`^${EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (!user) {
    throw new Error(`User not found: ${EMAIL} (company ${COMPANY_ID})`);
  }

  user.role = ROLE_NAME;
  user.roles = [role._id];
  if (!Array.isArray(user.modules) || !user.modules.includes("PROCUREMENT")) {
    user.modules = Array.from(new Set([...(user.modules || []), "PROCUREMENT"]));
  }
  await user.save();

  console.log(`Updated ${user.email}: role=${user.role}, access=Requester & Approver (create + approve PR)`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
