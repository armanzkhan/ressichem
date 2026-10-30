const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const ctrl = require("../controllers/productionController");

const router = express.Router();
router.use(authMiddleware);

router.get("/catalog", ctrl.catalog);
router.get("/lab", ctrl.lab);
router.get("/summary", ctrl.summary);
router.get("/dpr", ctrl.dpr);
router.get("/trace", ctrl.trace);
router.get("/entries/export", ctrl.exportCsv);
router.get("/entries", ctrl.list);
router.post("/entries", ctrl.create);
router.put("/entries/:id", ctrl.update);
router.delete("/entries/:id", ctrl.remove);

module.exports = router;
