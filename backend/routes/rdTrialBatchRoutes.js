const express = require("express");
const router = express.Router();
const rdTrialBatchController = require("../controllers/rdTrialBatchController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

router.use(authMiddleware);
router.use(permissionMiddleware(["rnd.access"]));

const rndUploadsDir = path.join(__dirname, "..", "uploads", "qc", "rnd-trials");
try {
  fs.mkdirSync(rndUploadsDir, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, rndUploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    const safeExt = ext.length <= 10 ? ext : "";
    cb(null, `rndtrial-${req.params.id}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

function handleRndUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 15 MB)" : err.message || "Upload error";
      return res.status(400).json({ success: false, message: msg });
    }
    if (req.file) req.file.qcRelPath = `/uploads/qc/rnd-trials/${req.file.filename}`;
    next();
  });
}

router.get("/", permissionMiddleware(["rnd.experiments.read"]), rdTrialBatchController.list);
router.get("/product-folder/:productFolder", permissionMiddleware(["rnd.experiments.read"]), rdTrialBatchController.getByProductFolder);
router.get("/:id", permissionMiddleware(["rnd.experiments.read"]), rdTrialBatchController.getById);
router.post("/", permissionMiddleware(["rnd.experiments.create"]), rdTrialBatchController.create);
router.put("/:id", permissionMiddleware(["rnd.experiments.update"]), rdTrialBatchController.update);
router.post(
  "/:id/log-sheet",
  permissionMiddleware(["rnd.experiments.update"]),
  handleRndUpload,
  rdTrialBatchController.uploadLogSheet
);
router.post("/compare", permissionMiddleware(["rnd.experiments.compare"]), rdTrialBatchController.compareTrials);
router.get("/cost-comparison/:productFolder", permissionMiddleware(["rnd.experiments.read"]), rdTrialBatchController.getCostComparison);

module.exports = router;

