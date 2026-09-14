const express = require("express");
const router = express.Router();
const electronicSignatureController = require("../controllers/electronicSignatureController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

router.post("/", electronicSignatureController.create);
router.get("/entity/:entityType/:entityId", electronicSignatureController.getByEntity);
router.get("/:id", electronicSignatureController.getById);
router.get("/:id/verify", electronicSignatureController.verify);

module.exports = router;

