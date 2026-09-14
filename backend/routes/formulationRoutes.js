const express = require("express");
const router = express.Router();
const formulationController = require("../controllers/formulationController");
const formulation2faController = require("../controllers/formulation2faController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRDLayer, requireReleaseToQC, requireManagementLayer } = require("../middleware/qcRndAccessMiddleware");
const requireFormulation2FA = require("../middleware/formulation2faMiddleware");

// All routes require authentication
router.use(authMiddleware);

// 2-step verification for formulation section (SRS 4.2)
router.post("/2fa/request", formulation2faController.requestCode);
router.post("/2fa/verify", formulation2faController.verifyCode);

// Formulation CRUD
router.get("/", formulationController.getAll);
router.get("/:id", formulationController.getById);
router.post("/", requireFormulation2FA, formulationController.create);
router.put("/:id", requireFormulation2FA, formulationController.update);

// Version control
router.post("/:parentId/version", requireFormulation2FA, requireRDLayer, formulationController.createVersion);

// R&D to QC transition
router.post("/:id/submit-to-qc", requireFormulation2FA, requireRDLayer, formulationController.submitToQC);
router.post("/:id/approve-for-qc", requireFormulation2FA, requireReleaseToQC, formulationController.approveForQC);

// Management actions
router.post("/:id/freeze", requireFormulation2FA, requireManagementLayer, formulationController.freeze);

// BOM generation
router.get("/:id/bom", formulationController.generateBOM);

module.exports = router;

