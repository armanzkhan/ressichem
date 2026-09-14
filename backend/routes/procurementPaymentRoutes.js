const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementPaymentController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.costing.read"]), ctrl.list);
router.get("/:id", permissionMiddleware(["procurement.costing.read"]), ctrl.getById);
router.post("/", permissionMiddleware(["procurement.costing.create"]), ctrl.create);

module.exports = router;
