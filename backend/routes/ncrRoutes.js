const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ncrController = require("../controllers/ncrController");

router.use(authMiddleware);

router.get("/", ncrController.getAll);
router.get("/:id", ncrController.getById);
router.post("/", ncrController.create);
router.post("/bulk-delete", ncrController.bulkSoftDelete);
router.put("/:id", ncrController.update);
router.delete("/:id", ncrController.softDelete);
router.post("/:id/close", ncrController.close);

module.exports = router;
