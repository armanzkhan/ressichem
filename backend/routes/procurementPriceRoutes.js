const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/procurementPriceController");

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/currencies", permissionMiddleware(["procurement.prices.read"]), ctrl.listCurrencies);
router.get("/", permissionMiddleware(["procurement.prices.read"]), ctrl.list);
router.post("/", permissionMiddleware(["procurement.prices.create"]), ctrl.create);
router.put("/:id", permissionMiddleware(["procurement.prices.update"]), ctrl.update);
router.delete("/:id", permissionMiddleware(["procurement.prices.update"]), ctrl.remove);

module.exports = router;
