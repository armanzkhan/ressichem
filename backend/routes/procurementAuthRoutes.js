const express = require("express");
const router = express.Router();
const procurementAuthController = require("../controllers/procurementAuthController");

router.post("/login", procurementAuthController.login);
router.post("/signup", procurementAuthController.signup);

module.exports = router;
