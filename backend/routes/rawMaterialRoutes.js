const express = require("express");
const router = express.Router();
const rawMaterialController = require("../controllers/rawMaterialController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Raw Material routes
router.get("/", rawMaterialController.getAll);
router.post("/", rawMaterialController.create);

// Raw Material Batch routes (keep before /:id to avoid route collisions)
router.get("/batches", rawMaterialController.getBatches);
router.get("/batches/:id", rawMaterialController.getBatchById);
router.post("/batches", rawMaterialController.createBatch);
router.put("/batches/:id", rawMaterialController.updateBatch);
router.get("/:materialId/batches", rawMaterialController.getBatches);

// Raw Material routes (by id)
router.get("/:id", rawMaterialController.getById);
router.put("/:id", rawMaterialController.update);
router.delete("/:id", rawMaterialController.delete);

module.exports = router;

