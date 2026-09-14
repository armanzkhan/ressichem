const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementCostingController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.costing.read"]), ctrl.list);
router.get("/export", permissionMiddleware(["procurement.costing.read"]), ctrl.exportList);
router.post("/preview", permissionMiddleware(["procurement.costing.read"]), ctrl.preview);
router.get("/:id/print", permissionMiddleware(["procurement.costing.read"]), ctrl.print);
router.get("/:id/export", permissionMiddleware(["procurement.costing.read"]), ctrl.exportOne);
router.get("/:id", permissionMiddleware(["procurement.costing.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.costing.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.costing.update"]), ctrl.update);
router.delete("/:id", permissionMiddleware(["procurement.costing.update"]), ctrl.remove);

module.exports = router;
