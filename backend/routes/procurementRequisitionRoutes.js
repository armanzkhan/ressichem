const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementRequisitionController");
const reportCtrl = require("../controllers/procurementPrReportController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.requisitions.read"]), ctrl.list);
router.get("/report/monthly", permissionMiddleware(["procurement.requisitions.read"]), reportCtrl.monthlyReport);
router.get(
  "/report/monthly/export",
  permissionMiddleware(["procurement.requisitions.read"]),
  reportCtrl.exportMonthlyReport
);
router.post(
  "/bulk-delete",
  permissionMiddleware(["procurement.access"]),
  ctrl.bulkSoftDelete
);
router.get("/:id", permissionMiddleware(["procurement.requisitions.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.requisitions.create"]), ctrl.create);
// Requesters use update; assigned approvers use approve (amend before decision)
router.put(
  "/:id",
  permissionMiddleware.any(["procurement.requisitions.update", "procurement.requisitions.approve"]),
  ctrl.update
);
router.patch(
  "/:id/follow-up",
  permissionMiddleware(["procurement.requisitions.read"]),
  ctrl.updateFollowUp
);
router.post("/:id/submit", permissionMiddleware(["procurement.requisitions.update"]), ctrl.submit);
// Department-mapped approvers may only have create/read — controller still enforces assignee via assertCanActOnPr
router.post(
  "/:id/approve",
  permissionMiddleware.any(["procurement.requisitions.approve", "procurement.access"]),
  ctrl.approve
);
router.post(
  "/:id/reject",
  permissionMiddleware.any(["procurement.requisitions.approve", "procurement.access"]),
  ctrl.reject
);
router.post(
  "/:id/hold",
  permissionMiddleware.any(["procurement.requisitions.approve", "procurement.access"]),
  ctrl.hold
);
router.post(
  "/:id/release-hold",
  permissionMiddleware.any(["procurement.requisitions.approve", "procurement.access"]),
  ctrl.releaseHold
);
// Buyers: po.create. Requesters: convert their own approved PRs via requisitions.create
router.post(
  "/:id/convert-to-po",
  permissionMiddleware.any(["procurement.po.create", "procurement.requisitions.create"]),
  ctrl.convertToPO
);
router.delete("/:id", permissionMiddleware(["procurement.access"]), ctrl.softDelete);

module.exports = router;
