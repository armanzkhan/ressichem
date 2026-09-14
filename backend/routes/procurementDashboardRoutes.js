const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const procurementDashboardController = require("../controllers/procurementDashboardController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", procurementDashboardController.getDashboard);

module.exports = router;
