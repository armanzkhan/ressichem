require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const { getUserPermissions } = require("../services/authService");
const {
  accessLevelFromRole,
  effectiveProcurementDepartment,
  procurementSectionsForUser,
} = require("../utils/procurementRoleHelpers");

const URI =
  process.env.MONGODB_URI ||
  process.env.CONNECTION_STRING ||
  process.env.MONGO_URI ||
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

(async () => {
  await mongoose.connect(URI, { dbName: "Ressichem" });
  const email = "rana.mehtab@ressichem.com";
  const user = await User.findOne({
    company_id: "RESSICHEM",
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("_id email role isActive user_id company_id department")
    .lean();

  if (!user) {
    console.log(JSON.stringify({ error: "user not found" }));
    process.exit(1);
  }

  const { permissions, roles } = await getUserPermissions(user.user_id, user.company_id);
  const roleName = roles?.[0] || user.role;
  const department = effectiveProcurementDepartment(roleName, user.department);
  const accessLevel = accessLevelFromRole(roleName);
  const sections = procurementSectionsForUser(roleName, department);

  const prs = await PurchaseRequisition.find({
    company_id: "RESSICHEM",
    isActive: { $ne: false },
    requestedBy: user._id,
  })
    .select("requisitionNumber status location title purchaseType")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  console.log(
    JSON.stringify(
      {
        user: {
          email: user.email,
          role: user.role,
          department: user.department,
          effectiveDepartment: department,
        },
        accessLevel,
        sections,
        permissions: permissions.filter(
          (p) =>
            String(p).includes("po") ||
            String(p).includes("requisition") ||
            String(p).includes("access")
        ),
        hasPoCreate: permissions.includes("procurement.po.create"),
        ownPrs: prs,
        note: {
          uiCreatePo: "frontend canConvertToPo = buyer || admin only",
          apiConvert: "requires procurement.po.create + PR status approved",
        },
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
