const express = require("express");
const router = express.Router();
const resinQCController = require("../controllers/resinQCController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.results.read"]), resinQCController.list);
router.get("/trends", permissionMiddleware(["qc.results.read"]), resinQCController.getTrends);
router.get("/:id", permissionMiddleware(["qc.results.read"]), resinQCController.getById);
router.post("/", permissionMiddleware(["qc.results.create"]), resinQCController.create);
router.put("/:id", permissionMiddleware(["qc.results.update"]), resinQCController.update);
router.delete("/:id", permissionMiddleware(["qc.results.update"]), resinQCController.remove);
router.post("/:id/submit", permissionMiddleware(["qc.results.submit"]), resinQCController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), resinQCController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.results.approve"]), resinQCController.reject);

module.exports = router;

