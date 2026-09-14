const express = require("express");
const router = express.Router();
const lmsQCController = require("../controllers/lmsQCController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.results.read"]), lmsQCController.list);
router.get("/trends", permissionMiddleware(["qc.results.read"]), lmsQCController.getTrends);
router.get("/:id", permissionMiddleware(["qc.results.read"]), lmsQCController.getById);
router.post("/", permissionMiddleware(["qc.results.create"]), lmsQCController.create);
router.put("/:id", permissionMiddleware(["qc.results.update"]), lmsQCController.update);
router.delete("/:id", permissionMiddleware(["qc.results.update"]), lmsQCController.remove);
router.post("/:id/submit", permissionMiddleware(["qc.results.submit"]), lmsQCController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), lmsQCController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.results.approve"]), lmsQCController.reject);

module.exports = router;

