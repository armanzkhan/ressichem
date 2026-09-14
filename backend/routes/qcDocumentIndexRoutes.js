const express = require("express");
const router = express.Router();
const qcDocumentIndexController = require("../controllers/qcDocumentIndexController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.post("/index", permissionMiddleware(["qc.results.create"]), qcDocumentIndexController.indexDocument);
router.get("/search", permissionMiddleware(["qc.results.read"]), qcDocumentIndexController.searchDocuments);
router.get("/batch/:batchNumber", permissionMiddleware(["qc.results.read"]), qcDocumentIndexController.getByBatchNumber);
router.get("/product/:productName/:grade?", permissionMiddleware(["qc.results.read"]), qcDocumentIndexController.getByProduct);

module.exports = router;

