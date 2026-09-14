const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcExportController = require("../controllers/qcExportController");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/results.csv", permissionMiddleware(["qc.exports.read"]), qcExportController.exportResultsCsv);

module.exports = router;


