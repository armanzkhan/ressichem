const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementPOController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.po.read"]), ctrl.list);
router.post("/bulk-delete", permissionMiddleware(["procurement.access"]), ctrl.bulkRemove);
router.get("/:id/print", permissionMiddleware(["procurement.po.read"]), ctrl.print);
router.get("/:id", permissionMiddleware(["procurement.po.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.po.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.po.update"]), ctrl.update);
router.post("/:id/issue", permissionMiddleware(["procurement.po.update"]), ctrl.issue);
router.post("/:id/receive", permissionMiddleware(["procurement.po.update"]), ctrl.receive);
router.post("/:id/close", permissionMiddleware(["procurement.po.update"]), ctrl.close);
router.post("/:id/cancel", permissionMiddleware(["procurement.po.update"]), ctrl.cancel);
// Admin-only delete (controller also enforces Procurement Admin / po.delete)
router.delete("/:id", permissionMiddleware(["procurement.access"]), ctrl.remove);

module.exports = router;
