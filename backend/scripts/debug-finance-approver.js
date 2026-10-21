require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const ProcurementDepartmentApprover = require("../models/ProcurementDepartmentApprover");
const { applyPurchaseRequisitionVisibility } = require("../utils/procurementPrRouting");
const { getActionableApprovalStage, approvalStage } = require("../utils/procurementPrApprovals");
const { getUserPermissions } = require("../services/authService");

const URI =
  process.env.MONGODB_URI ||
  process.env.CONNECTION_STRING ||
  process.env.MONGO_URI ||
  "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";

(async () => {
  await mongoose.connect(URI, { dbName: "Ressichem" });
  const email = "finance@ressichem.com";
  const user = await User.findOne({
    company_id: "RESSICHEM",
    email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("_id email role isActive user_id company_id")
    .lean();

  if (!user) {
    console.log(JSON.stringify({ error: "user not found" }, null, 2));
    process.exit(1);
  }

  const { permissions, roles } = await getUserPermissions(user.user_id, user.company_id);
  const mappings = await ProcurementDepartmentApprover.find({
    company_id: "RESSICHEM",
    approverEmail: new RegExp("finance", "i"),
  }).lean();
  const corporate = await ProcurementDepartmentApprover.find({
    company_id: "RESSICHEM",
    departmentKey: { $in: ["finance manager", "boss", "finance"] },
  }).lean();

  const allActive = await PurchaseRequisition.find({
    company_id: "RESSICHEM",
    isActive: { $ne: false },
    status: { $in: ["submitted", "held", "partially_approved"] },
  })
    .select("requisitionNumber status approvals assignedApprover requestedBy title")
    .lean();

  const stageSummary = allActive.map((pr) => {
    const approvals = pr.approvals || [];
    return {
      pr: pr.requisitionNumber,
      status: pr.status,
      actionableStage: getActionableApprovalStage(approvals),
      approvals: approvals.map((a) => ({
        stage: approvalStage(a),
        department: a.department,
        status: a.status,
        approver: String(a.approver),
        isFinanceUser: String(a.approver) === String(user._id),
      })),
    };
  });

  const financePending = stageSummary.filter((s) =>
    s.approvals.some((a) => a.isFinanceUser && (a.status === "pending" || a.status === "held"))
  );

  const listQuery = { company_id: "RESSICHEM", isActive: { $ne: false } };
  applyPurchaseRequisitionVisibility(listQuery, {
    ...user,
    permissions,
  });
  const visible = await PurchaseRequisition.find(listQuery)
    .select("requisitionNumber status")
    .lean();

  console.log(
    JSON.stringify(
      {
        user: { _id: user._id, email: user.email, role: user.role, isActive: user.isActive },
        permissions: permissions.filter((p) => String(p).includes("requisition") || String(p).includes("approve")),
        roles,
        mappingsForFinanceEmail: mappings,
        corporateMappings: corporate,
        awaitingApprovalCount: allActive.length,
        stageSummary,
        financePendingForThisUser: financePending,
        listVisibilityQuery: listQuery,
        visibleToFinanceUser: visible.map((v) => ({ pr: v.requisitionNumber, status: v.status })),
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
