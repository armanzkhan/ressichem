const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const ctrl = require("../controllers/productionController");

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

router.get("/catalog", ctrl.catalog);
router.get("/lab", ctrl.lab);
router.get("/summary", ctrl.summary);
router.get("/dpr", ctrl.dpr);
router.get("/dpr/export", ctrl.exportDpr);
router.get("/trace", ctrl.trace);
router.get("/entries/export", ctrl.exportCsv);
router.get("/entries/import-template", ctrl.importTemplate);
router.post("/entries/import", upload.single("file"), ctrl.importEntries);
router.get("/entries", ctrl.list);
router.post("/entries", ctrl.create);
router.put("/entries/:id", ctrl.update);
router.delete("/entries/:id", ctrl.remove);

module.exports = router;
