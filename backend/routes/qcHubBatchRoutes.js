const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcHubBatchController = require("../controllers/qcHubBatchController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/modules", permissionMiddleware(["qc.hub.forms.read"]), qcHubBatchController.getModules);
router.get("/trends", permissionMiddleware(["qc.hub.forms.read"]), qcHubBatchController.getTrends);
router.get("/", permissionMiddleware(["qc.hub.forms.read"]), qcHubBatchController.list);
router.post("/", permissionMiddleware(["qc.hub.forms.create"]), qcHubBatchController.create);

router.get("/:id", permissionMiddleware(["qc.hub.forms.read"]), qcHubBatchController.getById);
router.put("/:id", permissionMiddleware(["qc.hub.forms.update"]), qcHubBatchController.update);
router.delete("/:id", permissionMiddleware(["qc.hub.forms.update"]), qcHubBatchController.softDelete);

router.post("/:id/submit", permissionMiddleware(["qc.hub.forms.submit"]), qcHubBatchController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.hub.forms.approve"]), qcHubBatchController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.hub.forms.approve"]), qcHubBatchController.reject);

const batchDir = path.join(__dirname, "..", "uploads", "qc", "hub", "batch");
try {
  fs.mkdirSync(batchDir, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, batchDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    cb(null, `qchubbatch-${req.params.id}-${Date.now()}${ext.length <= 10 ? ext : ""}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = /\.(pdf|xlsx|xls|csv|png|jpe?g|gif|webp)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error("Only PDF, Excel, CSV, and image files are allowed"));
  },
});

router.post(
  "/:id/attachments",
  permissionMiddleware(["qc.hub.forms.update"]),
  upload.single("file"),
  (req, res, next) => {
    if (req.file) req.file.qcRelPath = `/uploads/qc/hub/batch/${req.file.filename}`;
    next();
  },
  qcHubBatchController.uploadAttachment
);

module.exports = router;
