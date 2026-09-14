const express = require("express");
const router = express.Router();
const rdExperimentController = require("../controllers/rdExperimentController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRDLayer, enrichUserQcProfile } = require("../middleware/qcRndAccessMiddleware");

// All routes require authentication
router.use(authMiddleware);
router.use(enrichUserQcProfile);

// Experiment CRUD
router.get("/", rdExperimentController.getAll);
router.get("/:id", rdExperimentController.getById);
router.post("/", requireRDLayer, rdExperimentController.create);
router.put("/:id", requireRDLayer, rdExperimentController.update);

// Trial management
router.post("/:id/trials", requireRDLayer, rdExperimentController.addTrial);
router.put("/:id/trials/:trialNo", requireRDLayer, rdExperimentController.updateTrial);

// Comparison and completion
router.post("/:id/compare", requireRDLayer, rdExperimentController.compareTrials);
router.post("/:id/complete", requireRDLayer, rdExperimentController.complete);

module.exports = router;

