// Ensure Reactor / LMS / BFS production logins exist.
// Does not change a password that is already set.
//
// Usage (from repo root):
//   node backend/scripts/migrations/ensure-production-users.js
//   PRODUCTION_USER_PASSWORD=YourPassword node backend/scripts/migrations/ensure-production-users.js

require("dotenv").config();

const bcrypt = require("bcryptjs");
const { connect, disconnect } = require("../../config/_db");
const User = require("../../models/User");

const COMPANY_ID = process.env.COMPANY_ID || "RESSICHEM";
const PASSWORD = process.env.PRODUCTION_USER_PASSWORD || "Production@2026";
const ACCOUNTS = [
  { email: "ubaid@ressichem.com", firstName: "Ubaid", lastName: "" },
  { email: "production.zepoxy@ressichem.com", firstName: "Zepoxy", lastName: "Production" },
];

function makeUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function run() {
  await connect();
  const watch = ["ubaid@ressichem.com", "production.zepoxy@ressichem.com", "asad@ressichem.com", "arsalan@ressichem.com"];
  const existing = await User.find({ email: { $in: watch } })
    .select("email role department modules isActive company_id")
    .lean();
  for (const email of watch) {
    const row = existing.find((user) => String(user.email).toLowerCase() === email);
    console.log(row ? `found ${email} role=${row.role || ""} modules=${(row.modules || []).join("|")} active=${row.isActive !== false}` : `missing ${email}`);
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);
  for (const account of ACCOUNTS) {
    let user = await User.findOne({ company_id: COMPANY_ID, email: account.email });
    if (!user) user = await User.findOne({ email: account.email });
    if (user) {
      const modules = new Set(user.modules || []);
      modules.add("PRODUCTION");
      user.modules = [...modules];
      if (!user.department) user.department = "Production — Reactor / LMS / BFS";
      if (!user.role) user.role = "Production";
      user.isActive = user.isActive !== false;
      await user.save();
      console.log(`kept existing password for ${account.email}`);
      continue;
    }
    await User.create({
      company_id: COMPANY_ID,
      user_id: makeUserId(),
      email: account.email,
      password: hashed,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: "",
      department: "Production — Reactor / LMS / BFS",
      role: "Production",
      roles: [],
      permissions: [],
      modules: ["PRODUCTION"],
      isActive: true,
      isCustomer: false,
      isManager: false,
      isCompanyAdmin: false,
    });
    console.log(`created ${account.email}`);
  }
  await disconnect();
}

run().catch(async (err) => {
  console.error(err.message || err);
  try {
    await disconnect();
  } catch {
    /* already closed */
  }
  process.exit(1);
});
