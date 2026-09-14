const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const procurementUserController = require("../controllers/procurementUserController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", permissionMiddleware(["procurement.users.read"]), procurementUserController.listProcurementUsers);
router.get("/:id", permissionMiddleware(["procurement.users.read"]), procurementUserController.getProcurementUser);
router.post("/", permissionMiddleware(["procurement.users.create"]), procurementUserController.createProcurementUser);
router.put("/:id", permissionMiddleware(["procurement.users.update"]), procurementUserController.updateProcurementUser);

module.exports = router;
