const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireQCLayer, requireCustomerDataAccess, requireManagementLayer, enrichUserQcProfile } = require("../middleware/qcRndAccessMiddleware");

// All routes require authentication
router.use(authMiddleware);
router.use(enrichUserQcProfile);

// Complaint CRUD
router.get("/", requireCustomerDataAccess, complaintController.getAll);
router.get("/:id", requireCustomerDataAccess, complaintController.getById);
router.post("/", requireCustomerDataAccess, complaintController.create);
router.put("/:id", requireCustomerDataAccess, complaintController.update);

// Workflow
router.post("/:id/investigate", requireQCLayer, complaintController.startInvestigation);
router.post("/:id/submit-for-review", requireQCLayer, complaintController.submitForManagementReview);
router.post("/:id/management-review", requireManagementLayer, complaintController.managementReview);
router.post("/:id/resolve", requireCustomerDataAccess, complaintController.resolve);
router.post("/:id/close", requireManagementLayer, complaintController.close);

module.exports = router;

