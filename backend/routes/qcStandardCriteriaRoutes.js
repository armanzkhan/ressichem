const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcStandardCriteriaController = require("../controllers/qcStandardCriteriaController");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.standards.read"]), qcStandardCriteriaController.list);
router.post("/", permissionMiddleware(["qc.standards.create"]), qcStandardCriteriaController.create);
router.put("/:id", permissionMiddleware(["qc.standards.update"]), qcStandardCriteriaController.update);
router.delete("/:id", permissionMiddleware(["qc.standards.delete"]), qcStandardCriteriaController.remove);

module.exports = router;


