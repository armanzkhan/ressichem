const express = require("express");
const router = express.Router();
const qaBottleFillingController = require("../controllers/qaBottleFillingController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.results.read"]), qaBottleFillingController.list);
router.get("/:id", permissionMiddleware(["qc.results.read"]), qaBottleFillingController.getById);
router.post("/", permissionMiddleware(["qc.results.create"]), qaBottleFillingController.create);
router.put("/:id", permissionMiddleware(["qc.results.update"]), qaBottleFillingController.update);
router.post("/:id/submit", permissionMiddleware(["qc.results.submit"]), qaBottleFillingController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), qaBottleFillingController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.results.approve"]), qaBottleFillingController.reject);
router.post("/:id/traceability-sheet", permissionMiddleware(["qc.results.read"]), qaBottleFillingController.generateTraceabilitySheet);

module.exports = router;

