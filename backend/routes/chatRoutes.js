const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

router.use(auth);

const chatUploadsDir = path.join(__dirname, "..", "uploads", "chat");
try {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
} catch {
  /* ignore */
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || "";
    const safeExt = ext.length <= 12 ? ext : "";
    cb(null, `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const allowed =
      mime.startsWith("image/") ||
      mime.startsWith("video/") ||
      mime.startsWith("audio/") ||
      mime === "application/pdf" ||
      mime.includes("officedocument") ||
      mime.includes("msword") ||
      mime.includes("excel") ||
      mime.includes("spreadsheet") ||
      mime === "text/plain" ||
      mime === "application/zip" ||
      mime === "application/x-zip-compressed";
    if (!allowed) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

function optionalChatUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large (max 25 MB)"
          : err.message || "Upload error";
      return res.status(400).json({ success: false, message: msg });
    }
    if (req.file) {
      req.file.chatRelPath = `/uploads/chat/${req.file.filename}`;
    }
    next();
  });
}

router.get("/contacts", chatController.listContacts);
router.get("/conversations", chatController.listConversations);
router.post("/conversations/direct", chatController.createOrGetDirect);
router.post("/conversations/group", chatController.createGroup);
router.get("/conversations/:id/messages", chatController.listMessages);
router.post("/conversations/:id/messages", optionalChatUpload, chatController.sendMessage);
router.post("/conversations/:id/messages/:messageId/delivered", chatController.markMessageDelivered);
router.post("/conversations/:id/read", chatController.markRead);
router.post("/conversations/:id/members", chatController.addMembers);

module.exports = router;
