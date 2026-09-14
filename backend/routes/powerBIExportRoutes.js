const express = require("express");
const router = express.Router();
const powerBIExportController = require("../controllers/powerBIExportController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.exports.read"]));

router.get("/resin-qc", powerBIExportController.exportResinQC);
router.get("/hardener-qc", powerBIExportController.exportHardenerQC);
router.get("/timeseries-qc", powerBIExportController.exportTimeSeriesQC);
router.get("/rd-trials", powerBIExportController.exportRDTrialData);
router.get("/qa-logs", powerBIExportController.exportQALogs);
router.get("/all", powerBIExportController.exportAll);

module.exports = router;

