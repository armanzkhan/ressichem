const express = require("express");
const router = express.Router();
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const publicAssistantController = require("../controllers/publicAssistantController");

router.post("/chat", optionalAuth, publicAssistantController.chat);

module.exports = router;
