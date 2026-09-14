const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcHubReportingController = require("../controllers/qcHubReportingController");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/qc-summary", qcHubReportingController.getQcSummary);
router.get("/qa-audit", qcHubReportingController.getQaAuditReport);
router.get("/raw-material", qcHubReportingController.getRawMaterialReport);
router.get("/packaging", qcHubReportingController.getPackagingReport);
router.get("/rnd-trials", qcHubReportingController.getRndTrialReport);
router.get("/product-comparison", qcHubReportingController.getProductComparison);
router.get("/traceability", qcHubReportingController.getTraceability);

module.exports = router;
