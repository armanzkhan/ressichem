require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const PurchaseOrder = require("../models/PurchaseOrder");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const {
  ensureUserDepartment,
  isLahorePlantScopedUser,
  lahorePurchaseRequisitionClause,
} = require("../utils/procurementPrRouting");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.CONNECTION_STRING || process.env.MONGO_URI, {
    dbName: "Ressichem",
  });
  const u = await User.findOne({ email: /^rana\.mehtab@ressichem.com$/i }).lean();
  const user = {
    _id: u._id,
    user_id: u.user_id,
    company_id: u.company_id,
    email: u.email,
    role: u.role,
  };
  await ensureUserDepartment(user);
  const company_id = "RESSICHEM";
  const lahorePrIds = await PurchaseRequisition.find({
    company_id,
    isActive: { $ne: false },
    ...lahorePurchaseRequisitionClause(),
  }).distinct("_id");
  const all = await PurchaseOrder.countDocuments({
    company_id,
    isActive: { $ne: false },
    purchaseType: "local",
  });
  const scoped = await PurchaseOrder.countDocuments({
    company_id,
    isActive: { $ne: false },
    purchaseType: "local",
    $or: [{ requisition: { $in: lahorePrIds } }, { plantScope: "lahore" }],
  });
  console.log(
    JSON.stringify(
      {
        department: user.department,
        scoped: isLahorePlantScopedUser(user),
        allLocalPos: all,
        lahoreScopedPos: scoped,
        lahorePrCount: lahorePrIds.length,
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
