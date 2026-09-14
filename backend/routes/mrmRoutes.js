const express = require("express");
const router = express.Router();
const mrmController = require("../controllers/mrmController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireManagementLayer, enrichUserQcProfile } = require("../middleware/qcRndAccessMiddleware");

// All routes require authentication
router.use(authMiddleware);
router.use(enrichUserQcProfile);

// MRM CRUD
router.get("/", requireManagementLayer, mrmController.getAll);
router.get("/:id", requireManagementLayer, mrmController.getById);
router.post("/", requireManagementLayer, mrmController.create);
router.put("/:id", requireManagementLayer, mrmController.update);

// MRM workflow
router.post("/:id/pull-data", requireManagementLayer, mrmController.pullData);
router.post("/:id/complete", requireManagementLayer, mrmController.complete);
router.post("/:id/approve", requireManagementLayer, mrmController.approve);

module.exports = router;

