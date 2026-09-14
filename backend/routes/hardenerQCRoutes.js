const express = require("express");
const router = express.Router();
const hardenerQCController = require("../controllers/hardenerQCController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.results.read"]), hardenerQCController.list);
router.get("/trends", permissionMiddleware(["qc.results.read"]), hardenerQCController.getTrends);
router.get("/:id", permissionMiddleware(["qc.results.read"]), hardenerQCController.getById);
router.post("/", permissionMiddleware(["qc.results.create"]), hardenerQCController.create);
router.put("/:id", permissionMiddleware(["qc.results.update"]), hardenerQCController.update);
router.delete("/:id", permissionMiddleware(["qc.results.update"]), hardenerQCController.remove);
router.post("/:id/submit", permissionMiddleware(["qc.results.submit"]), hardenerQCController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), hardenerQCController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.results.approve"]), hardenerQCController.reject);

module.exports = router;

