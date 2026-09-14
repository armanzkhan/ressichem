const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const procurementAssistantController = require("../controllers/procurementAssistantController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.post("/chat", procurementAssistantController.chat);

module.exports = router;
