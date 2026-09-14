const crypto = require("crypto");

const CODE_TTL_MINUTES = Number(process.env.FORMULATION_2FA_TTL_MINUTES || 10);

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function getExpiryDate() {
  const exp = new Date();
  exp.setMinutes(exp.getMinutes() + CODE_TTL_MINUTES);
  return exp;
}

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() < Date.now();
}

module.exports = {
  generateCode,
  hashCode,
  getExpiryDate,
  isExpired,
};
