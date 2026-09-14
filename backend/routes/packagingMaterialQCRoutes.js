const express = require("express");
const router = express.Router();
const packagingMaterialQCController = require("../controllers/packagingMaterialQCController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.results.read"]), packagingMaterialQCController.list);
router.get("/:id", permissionMiddleware(["qc.results.read"]), packagingMaterialQCController.getById);
router.post("/", permissionMiddleware(["qc.results.create"]), packagingMaterialQCController.create);
router.put("/:id", permissionMiddleware(["qc.results.update"]), packagingMaterialQCController.update);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), packagingMaterialQCController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.results.approve"]), packagingMaterialQCController.reject);

module.exports = router;

