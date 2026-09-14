const User = require("../models/User");
const { hashCode, isExpired } = require("../services/formulation2faService");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

module.exports = async function requireFormulation2FA(req, res, next) {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const code =
      String(req.headers["x-formulation-2fa"] || req.body?.formulation2faCode || "").trim();
    if (!code) {
      return res.status(401).json({ success: false, message: "2-step verification code required" });
    }

    const company_id = getCompanyId(req);
    const user = await User.findOne({ user_id: userId, company_id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const record = user.formulation2fa || {};
    if (!record.codeHash || isExpired(record.expiresAt)) {
      return res.status(401).json({ success: false, message: "Verification code expired or missing" });
    }

    if (record.codeHash !== hashCode(code)) {
      return res.status(401).json({ success: false, message: "Invalid verification code" });
    }

    user.formulation2fa.verifiedAt = new Date();
    user.formulation2fa.codeHash = "";
    user.formulation2fa.expiresAt = null;
    await user.save();

    return next();
  } catch (error) {
    console.error("Formulation 2FA middleware error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
