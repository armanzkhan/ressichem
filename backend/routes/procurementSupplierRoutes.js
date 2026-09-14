const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementSupplierController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.vendors.read"]), ctrl.list);
router.get("/:id", permissionMiddleware(["procurement.vendors.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.vendors.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.vendors.update"]), ctrl.update);
router.delete("/:id", permissionMiddleware(["procurement.vendors.update"]), ctrl.remove);

module.exports = router;
