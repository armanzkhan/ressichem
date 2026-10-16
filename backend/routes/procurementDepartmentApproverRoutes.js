const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementDepartmentApproverController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

// Any procurement user with requisitions access can read department names for dropdowns
router.get(
  "/departments",
  permissionMiddleware(["procurement.requisitions.read"]),
  ctrl.listDepartments
);

// Any PR creator/approver can register a new department mapped to themselves
router.post(
  "/ensure-self",
  permissionMiddleware(["procurement.requisitions.create"]),
  ctrl.ensureSelf
);

router.get("/", permissionMiddleware(["procurement.users.read"]), ctrl.list);
router.post("/", permissionMiddleware(["procurement.users.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.users.update"]), ctrl.update);
router.delete("/:id", permissionMiddleware(["procurement.users.update"]), ctrl.remove);

module.exports = router;
