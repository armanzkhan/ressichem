const express = require("express");
const router = express.Router();
const predictiveAnalyticsController = require("../controllers/predictiveAnalyticsController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/batch-trends", permissionMiddleware(["qc.results.read"]), predictiveAnalyticsController.getBatchTrends);
router.get("/abnormality-predictions", permissionMiddleware(["qc.results.read"]), predictiveAnalyticsController.getAbnormalityPredictions);

module.exports = router;

