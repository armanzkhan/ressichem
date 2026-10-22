const express = require("express");
const router = express.Router();
const mrmController = require("../controllers/mrmController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  requireQCLayer,
  requireManagementLayer,
  enrichUserQcProfile,
} = require("../middleware/qcRndAccessMiddleware");

// All routes require authentication
router.use(authMiddleware);
router.use(enrichUserQcProfile);

// QC Hub users (qc.access / QC layer) can list & manage MRMs.
// Formal approval stays Management-only.
router.get("/", requireQCLayer, mrmController.getAll);
router.get("/:id", requireQCLayer, mrmController.getById);
router.post("/", requireQCLayer, mrmController.create);
router.post("/bulk-delete", requireQCLayer, mrmController.bulkSoftDelete);
router.put("/:id", requireQCLayer, mrmController.update);
router.delete("/:id", requireQCLayer, mrmController.softDelete);

router.post("/:id/pull-data", requireQCLayer, mrmController.pullData);
router.post("/:id/complete", requireQCLayer, mrmController.complete);
router.post("/:id/approve", requireManagementLayer, mrmController.approve);

module.exports = router;

