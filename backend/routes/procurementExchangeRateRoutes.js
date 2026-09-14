const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementExchangeRateController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", ctrl.getRate);

module.exports = router;
