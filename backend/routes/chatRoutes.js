const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

router.use(auth);

router.get("/contacts", chatController.listContacts);
router.get("/conversations", chatController.listConversations);
router.post("/conversations/direct", chatController.createOrGetDirect);
router.post("/conversations/group", chatController.createGroup);
router.get("/conversations/:id/messages", chatController.listMessages);
router.post("/conversations/:id/messages", chatController.sendMessage);
router.post("/conversations/:id/messages/:messageId/delivered", chatController.markMessageDelivered);
router.post("/conversations/:id/read", chatController.markRead);
router.post("/conversations/:id/members", chatController.addMembers);

module.exports = router;
