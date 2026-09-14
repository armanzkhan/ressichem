const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcHubPlanController = require("../controllers/qcHubPlanController");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.hub.plan.read"]), qcHubPlanController.list);
router.post("/", permissionMiddleware(["qc.hub.plan.update"]), qcHubPlanController.create);
router.put("/:id", permissionMiddleware(["qc.hub.plan.update"]), qcHubPlanController.update);
router.delete("/:id", permissionMiddleware(["qc.hub.plan.update"]), qcHubPlanController.remove);

module.exports = router;


