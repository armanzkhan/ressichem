const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementExportRecordController");
const firebaseStorage = require("../services/firebaseStorageService");

const router = express.Router();

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

const uploadsDir = path.join(__dirname, "..", "uploads", "procurement", "export-documents");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `export-doc-${Date.now()}-${safe}`);
  },
});

const storage = firebaseStorage.useFirebaseStorage() ? multer.memoryStorage() : diskStorage;

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const allowedExt = /\.(pdf|png|jpe?g|gif|webp|doc|docx|xls|xlsx|txt|csv)$/i.test(name);
    const allowedMime =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "text/csv";
    cb(null, allowedExt || allowedMime);
  },
});

router.get("/", permissionMiddleware(["procurement.pfi.read"]), ctrl.list);
router.get("/:id", permissionMiddleware(["procurement.pfi.read"]), ctrl.getById);
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
  ctrl.uploadDocument
);
router.post("/shipments", permissionMiddleware(["procurement.pfi.create"]), ctrl.createShipment);
router.put("/shipments/:id", permissionMiddleware(["procurement.pfi.update"]), ctrl.updateShipment);
router.delete("/:id", permissionMiddleware(["procurement.pfi.update"]), ctrl.deleteRecord);

module.exports = router;
