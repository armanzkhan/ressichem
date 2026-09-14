const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementGrnController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.po.read"]), ctrl.list);
router.get("/:id", permissionMiddleware(["procurement.po.read"]), ctrl.getById);

module.exports = router;
