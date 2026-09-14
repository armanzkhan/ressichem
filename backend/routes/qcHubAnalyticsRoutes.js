const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const qcHubAnalyticsController = require("../controllers/qcHubAnalyticsController");

router.use(authMiddleware);

router.get("/dashboard", qcHubAnalyticsController.getDashboard);
router.get("/trends", qcHubAnalyticsController.getBatchTrends);
router.get("/abnormality", qcHubAnalyticsController.getAbnormalityAlerts);
router.get("/powerbi", qcHubAnalyticsController.exportPowerBI);

module.exports = router;
