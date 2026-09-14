const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const procurementNotificationService = require("../services/procurementNotificationService");

const router = express.Router();

router.use(authMiddleware);
router.use(permissionMiddleware(["procurement.access"]));

router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const unreadOnly = String(req.query.unreadOnly || "") === "true";
    const data = await procurementNotificationService.listForUser(req, { limit, unreadOnly });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    const data = await procurementNotificationService.markReadForUser(req, req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
});

module.exports = router;
