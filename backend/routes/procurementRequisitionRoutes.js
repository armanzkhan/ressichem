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
router.get("/:id", permissionMiddleware(["procurement.requisitions.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.requisitions.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.requisitions.update"]), ctrl.update);
router.post("/:id/submit", permissionMiddleware(["procurement.requisitions.update"]), ctrl.submit);
router.post("/:id/approve", permissionMiddleware(["procurement.requisitions.approve"]), ctrl.approve);
router.post("/:id/reject", permissionMiddleware(["procurement.requisitions.approve"]), ctrl.reject);
router.post("/:id/hold", permissionMiddleware(["procurement.requisitions.approve"]), ctrl.hold);
router.post("/:id/release-hold", permissionMiddleware(["procurement.requisitions.approve"]), ctrl.releaseHold);
router.post("/:id/convert-to-po", permissionMiddleware(["procurement.po.create"]), ctrl.convertToPO);

module.exports = router;
