const express = require("express");
const router = express.Router();
const qcReportingController = require("../controllers/qcReportingController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/certificate/:id", permissionMiddleware(["qc.results.read"]), qcReportingController.generateCertificate);
router.get("/dashboard/performance", permissionMiddleware(["qc.results.read"]), qcReportingController.getPerformanceDashboard);
router.get("/dashboard/complaints", permissionMiddleware(["qc.results.read"]), qcReportingController.getComplaintDashboard);
router.get("/dashboard/capa", permissionMiddleware(["qc.results.read"]), qcReportingController.getCAPADashboard);
router.get("/en-compliance", permissionMiddleware(["qc.results.read"]), qcReportingController.getENComplianceReport);
router.get("/export", permissionMiddleware(["qc.results.read"]), qcReportingController.exportData);

// SRS 3.6 - Additional Reports
router.get("/summary/batch", permissionMiddleware(["qc.results.read"]), qcReportingController.getQCSummaryByBatch);
router.get("/summary/product", permissionMiddleware(["qc.results.read"]), qcReportingController.getQCSummaryByProduct);
router.get("/qa/audit-summary", permissionMiddleware(["qc.results.read"]), qcReportingController.getQAAuditSummary);
router.get("/qa/bottle-filling-traceability", permissionMiddleware(["qc.results.read"]), qcReportingController.getBottleFillingTraceability);
router.get("/rd/trial-history", permissionMiddleware(["rnd.experiments.read"]), qcReportingController.getRDTrialHistory);

module.exports = router;

