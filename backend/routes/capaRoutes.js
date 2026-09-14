const express = require("express");
const router = express.Router();
const capaController = require("../controllers/capaController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireQCLayer, requireManagementLayer, enrichUserQcProfile } = require("../middleware/qcRndAccessMiddleware");

// All routes require authentication
router.use(authMiddleware);
router.use(enrichUserQcProfile);

// CAPA CRUD
router.get("/", capaController.getAll);
router.get("/:id", capaController.getById);
router.post("/", requireQCLayer, capaController.create);
router.put("/:id", requireQCLayer, capaController.update);

// Workflow
router.post("/:id/root-cause-analysis", requireQCLayer, capaController.conductRootCauseAnalysis);
router.post("/:id/submit-for-approval", requireQCLayer, capaController.submitForApproval);
router.post("/:id/approve", requireManagementLayer, capaController.approve);
router.post("/:id/start-implementation", requireQCLayer, capaController.startImplementation);
router.put("/:id/implementation", requireQCLayer, capaController.updateImplementation);
router.post("/:id/verify", requireQCLayer, capaController.verify);
router.post("/:id/close", requireManagementLayer, capaController.close);

module.exports = router;

