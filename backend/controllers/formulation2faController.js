const User = require("../models/User");
const { generateCode, hashCode, getExpiryDate, isExpired } = require("../services/formulation2faService");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

exports.requestCode = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findOne({ user_id: userId, company_id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const code = generateCode();
    user.formulation2fa = {
      codeHash: hashCode(code),
      expiresAt: getExpiryDate(),
      verifiedAt: null,
    };
    await user.save();

    return res.json({
      success: true,
      message: "Verification code generated",
      // Dev-friendly response: surface the code so it can be used immediately.
      code,
      expiresAt: user.formulation2fa.expiresAt,
    });
  } catch (error) {
    console.error("Formulation 2FA request error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const userId = req.user?.user_id;
    const code = String(req.body?.code || "").trim();
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!code) return res.status(400).json({ success: false, message: "Verification code required" });

    const user = await User.findOne({ user_id: userId, company_id });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const record = user.formulation2fa || {};
    if (!record.codeHash || isExpired(record.expiresAt)) {
      return res.status(400).json({ success: false, message: "Verification code expired or missing" });
    }

    if (record.codeHash !== hashCode(code)) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    user.formulation2fa.verifiedAt = new Date();
    user.formulation2fa.codeHash = "";
    user.formulation2fa.expiresAt = null;
    await user.save();

    return res.json({ success: true, message: "Verification successful" });
  } catch (error) {
    console.error("Formulation 2FA verify error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
