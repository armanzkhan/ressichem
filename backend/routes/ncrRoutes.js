const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ncrController = require("../controllers/ncrController");

router.use(authMiddleware);

router.get("/", ncrController.getAll);
router.get("/:id", ncrController.getById);
router.post("/", ncrController.create);
router.put("/:id", ncrController.update);
router.post("/:id/close", ncrController.close);

module.exports = router;
