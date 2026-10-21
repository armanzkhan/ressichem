require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const { getUserPermissions } = require("../services/authService");
const {
  accessLevelFromRole,
  effectiveProcurementDepartment,
  procurementSectionsForUser,
  userProcurementArea,
} = require("../utils/procurementRoleHelpers");

const URI =
  process.env.MONGODB_URI ||
  process.env.CONNECTION_STRING ||
  process.env.MONGO_URI ||
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

(async () => {
  await mongoose.connect(URI, { dbName: "Ressichem" });
  const email = "arman@ressichem.com";
  const user = await User.findOne({
    company_id: "RESSICHEM",
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("_id email role department isActive user_id company_id isCompanyAdmin isSuperAdmin")
    .lean();

  if (!user) {
    console.log(JSON.stringify({ error: "not found" }));
    process.exit(1);
  }

  const { permissions, roles } = await getUserPermissions(user.user_id, user.company_id);
  const roleName = roles?.[0] || user.role;
  const department = effectiveProcurementDepartment(roleName, user.department);
  const accessLevel = accessLevelFromRole(roleName);
  const sections = procurementSectionsForUser(roleName, department);
  const area = userProcurementArea(roleName, department);

  console.log(
    JSON.stringify(
      {
        user: {
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          isCompanyAdmin: user.isCompanyAdmin,
          isSuperAdmin: user.isSuperAdmin,
        },
        roleName,
        roles,
        accessLevel,
        effectiveDepartment: department,
        area,
        allowedSections: sections,
        procurementPerms: permissions.filter((p) => String(p).startsWith("procurement.")),
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
