const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcResultController = require("../controllers/qcResultController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

// ----- Product-specific tests and spec comparison (keep before :id routes) -----
router.get("/product-tests", permissionMiddleware(["qc.results.read"]), qcResultController.getProductTests);
router.get("/trends", permissionMiddleware(["qc.results.read"]), qcResultController.trends);
router.get("/fast", permissionMiddleware(["qc.results.read"]), qcResultController.fastList);

router.get("/", permissionMiddleware(["qc.results.read"]), qcResultController.list);
router.post("/", permissionMiddleware(["qc.results.create"]), qcResultController.create);
router.post("/sync-modules", permissionMiddleware(["qc.results.update"]), qcResultController.syncFromModules);

router.get("/:id", permissionMiddleware(["qc.results.read"]), qcResultController.getById);
router.put("/:id", permissionMiddleware(["qc.results.update"]), qcResultController.update);

router.post("/:id/submit", permissionMiddleware(["qc.results.submit"]), qcResultController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.results.approve"]), qcResultController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.results.approve"]), qcResultController.reject);

// ----- Spec comparison and EN compliance -----
router.get("/:id/compare-specs", permissionMiddleware(["qc.results.read"]), qcResultController.compareSpecs);
router.get("/:id/en-compliance", permissionMiddleware(["qc.results.read"]), qcResultController.checkENCompliance);

// ----- attachments (multipart/form-data) -----
const qcUploadsDir = path.join(__dirname, "..", "uploads", "qc", "results");
try {
  fs.mkdirSync(qcUploadsDir, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, qcUploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    const safeExt = ext.length <= 10 ? ext : "";
    cb(null, `qcresult-${req.params.id}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

function handleQcUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE" ? "File too large (max 15 MB)" : err.message || "Upload error";
      return res.status(400).json({ success: false, message: msg });
    }
    if (req.file) req.file.qcRelPath = `/uploads/qc/results/${req.file.filename}`;
    next();
  });
}

router.post(
  "/:id/attachments",
  permissionMiddleware(["qc.results.update"]),
  handleQcUpload,
  qcResultController.uploadAttachment
);

router.put(
  "/:id/attachments/:attachmentId",
  permissionMiddleware(["qc.results.update"]),
  handleQcUpload,
  qcResultController.replaceAttachment
);

router.delete(
  "/:id/attachments/:attachmentId",
  permissionMiddleware(["qc.results.update"]),
  qcResultController.deleteAttachment
);

module.exports = router;


