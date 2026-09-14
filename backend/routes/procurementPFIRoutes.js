const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementPFIController");

const router = express.Router();

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

const pfiUploadsDir = path.join(__dirname, "..", "uploads", "procurement", "pfi");
if (!fs.existsSync(pfiUploadsDir)) {
  fs.mkdirSync(pfiUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pfiUploadsDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "pfi").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `pfi-${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const allowedExt = /\.(pdf|png|jpe?g|gif|webp|doc|docx|xls|xlsx|txt)$/i.test(name);
    const allowedMime =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "text/plain";
    cb(null, allowedExt || allowedMime);
  },
});

router.get("/", permissionMiddleware(["procurement.pfi.read"]), ctrl.list);
router.post(
  "/upload",
  permissionMiddleware(["procurement.pfi.create"]),
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || "Upload failed" });
      }
      next();
    });
  },
  ctrl.uploadReceived
);
router.get("/:id/print", permissionMiddleware(["procurement.pfi.read"]), ctrl.print);
router.get("/:id", permissionMiddleware(["procurement.pfi.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.pfi.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.pfi.update"]), ctrl.update);
router.delete("/:id", permissionMiddleware(["procurement.users.update"]), ctrl.remove);
router.post("/:id/convert-to-po", permissionMiddleware(["procurement.pfi.approve"]), ctrl.convertToPO);

module.exports = router;
