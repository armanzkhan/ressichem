const express = require("express");
const router = express.Router();
const qcAuthController = require("../controllers/qcAuthController");

router.post("/login", qcAuthController.login);
router.post("/site-login", qcAuthController.siteLogin);
router.post("/hub-login", qcAuthController.hubLogin);
router.post("/site-signup", qcAuthController.siteSignup);
router.post("/hub-signup", qcAuthController.hubSignup);

module.exports = router;


