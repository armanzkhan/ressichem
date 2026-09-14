const jwt = require("jsonwebtoken");
const { decryptObject } = require("../utils/crypto");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/** Sets req.user when a valid Bearer token is present; continues without user if missing/invalid. */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return next();

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return next();

    const token = parts[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return next();
    }

    if (decoded?.perms) {
      try {
        const decrypted = decryptObject(decoded.perms);
        req.user = { ...decoded, ...decrypted };
      } catch {
        return next();
      }
    } else {
      req.user = decoded;
    }

    const headerCompany = req.headers["x-company-id"];
    if (req.user?.isSuperAdmin && headerCompany) {
      req.user.company_id = String(headerCompany);
    }

    next();
  } catch {
    next();
  }
}

module.exports = optionalAuthMiddleware;
