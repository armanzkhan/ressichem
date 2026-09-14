const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementImportController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    if (/\.(xlsx|xls|csv)$/.test(name)) return cb(null, true);
    cb(new Error("Only .xlsx, .xls, and .csv files are allowed"));
  },
});

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

function templatePermission(req, res, next) {
  const perms = ctrl.PERMISSION_BY_TYPE[req.params.type];
  if (!perms) return res.status(400).json({ success: false, message: "Invalid import type" });
  return permissionMiddleware(perms)(req, res, next);
}

router.get("/templates/:type", templatePermission, ctrl.downloadTemplate);

function uploadPermission(req, res, next) {
  const perms = ctrl.PERMISSION_BY_TYPE[req.params.type];
  if (!perms) return res.status(400).json({ success: false, message: "Invalid import type" });
  return permissionMiddleware(perms)(req, res, next);
}

router.post("/:type", uploadPermission, upload.single("file"), ctrl.upload);

module.exports = router;
