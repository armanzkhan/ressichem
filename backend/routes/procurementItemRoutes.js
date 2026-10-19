const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementItemController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.items.read"]), ctrl.list);
router.get("/:id", permissionMiddleware(["procurement.items.read"]), ctrl.getById);
// PR creators may add catalog items while raising a requisition
router.post(
  "/",
  permissionMiddleware.any(["procurement.items.create", "procurement.requisitions.create"]),
  ctrl.create
);
router.put("/:id", permissionMiddleware(["procurement.items.update"]), ctrl.update);
router.delete("/:id", permissionMiddleware(["procurement.access"]), ctrl.remove);

module.exports = router;
