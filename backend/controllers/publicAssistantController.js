const { guestReply, mainAppReply, customerReply } = require("../services/assistantReplies");

exports.chat = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const context = String(req.body?.context || "guest").toLowerCase();
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });

    let reply;
    if (context === "main" && req.user) reply = mainAppReply(message);
    else if (context === "customer" && req.user) reply = customerReply(message);
    else reply = guestReply(message);

    return res.json({ success: true, data: { reply, context: req.user ? context : "guest" } });
  } catch (error) {
    console.error("Public assistant error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
