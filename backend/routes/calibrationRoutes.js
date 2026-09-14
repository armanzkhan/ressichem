const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const calibrationController = require("../controllers/calibrationController");

router.use(authMiddleware);

router.get("/", calibrationController.getAll);
router.get("/due-soon", calibrationController.getDueSoon);
router.get("/:id", calibrationController.getById);
router.post("/", calibrationController.create);
router.put("/:id", calibrationController.update);

module.exports = router;
