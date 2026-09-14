const { procurementReply } = require("../services/assistantReplies");

exports.chat = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });

    const reply = procurementReply(message);
    return res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error("Procurement assistant error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
