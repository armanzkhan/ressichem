const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcTestController = require("../controllers/qcTestController");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.tests.read"]), qcTestController.list);
router.post("/", permissionMiddleware(["qc.tests.create"]), qcTestController.create);
router.put("/:id", permissionMiddleware(["qc.tests.update"]), qcTestController.update);
router.delete("/:id", permissionMiddleware(["qc.tests.delete"]), qcTestController.remove);

module.exports = router;


