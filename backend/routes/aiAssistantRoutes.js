const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/aiAssistantController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.post("/chat", aiAssistantController.chat);

module.exports = router;
