const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const ctrl = require("../controllers/productionAuthController");

const router = express.Router();
router.post("/login", ctrl.login);
router.post("/signup", ctrl.signup);
router.get("/me", authMiddleware, ctrl.me);

module.exports = router;
