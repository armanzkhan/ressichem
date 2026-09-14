const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const internalAuditController = require("../controllers/internalAuditController");

router.use(authMiddleware);

router.get("/", internalAuditController.getAll);
router.get("/:id", internalAuditController.getById);
router.post("/", internalAuditController.create);
router.put("/:id", internalAuditController.update);
router.post("/:id/approve", internalAuditController.approve);

module.exports = router;
