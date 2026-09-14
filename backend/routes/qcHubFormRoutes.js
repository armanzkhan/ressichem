const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcHubFormController = require("../controllers/qcHubFormController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.hub.forms.read"]), qcHubFormController.list);
router.post("/", permissionMiddleware(["qc.hub.forms.create"]), qcHubFormController.create);

router.get("/export.csv", permissionMiddleware(["qc.hub.forms.export"]), qcHubFormController.exportCsv);

router.get("/:id", permissionMiddleware(["qc.hub.forms.read"]), qcHubFormController.getById);
router.put("/:id", permissionMiddleware(["qc.hub.forms.update"]), qcHubFormController.update);

router.post("/:id/submit", permissionMiddleware(["qc.hub.forms.submit"]), qcHubFormController.submit);
router.post("/:id/approve", permissionMiddleware(["qc.hub.forms.approve"]), qcHubFormController.approve);
router.post("/:id/reject", permissionMiddleware(["qc.hub.forms.approve"]), qcHubFormController.reject);

// ----- attachments -----
const hubFormsDir = path.join(__dirname, "..", "uploads", "qc", "hub", "forms");
try {
  fs.mkdirSync(hubFormsDir, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, hubFormsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    const safeExt = ext.length <= 10 ? ext : "";
    cb(null, `qchubform-${req.params.id}-${Date.now()}${safeExt}`);
  },
});
const upload = multer({ storage });

router.post(
  "/:id/attachments",
  permissionMiddleware(["qc.hub.forms.update"]),
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      if (req.file) req.file.qcRelPath = `/uploads/qc/hub/forms/${req.file.filename}`;
      next();
    });
  },
  qcHubFormController.uploadAttachment
);

module.exports = router;


