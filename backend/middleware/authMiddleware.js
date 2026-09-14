// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { decryptObject } = require("../utils/crypto");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid authorization header" });
    }

    const token = parts[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // If there's an encrypted perms payload, decrypt it and merge
    if (decoded?.perms) {
      try {
        const decrypted = decryptObject(decoded.perms);
        req.user = { ...decoded, ...decrypted };
      } catch (e) {
        return res.status(403).json({ message: "Invalid encrypted payload" });
      }
    } else {
      req.user = decoded;
    }

    // Allow super admin switch company context
    const headerCompany = req.headers["x-company-id"];
    if (req.user.isSuperAdmin && headerCompany) {
      req.user.company_id = String(headerCompany);
    }

    next();
  } catch (err) {
    console.error("authMiddleware unexpected error:", err.message);
    return res.status(500).json({ message: "Auth error", error: err.message });
  }
}

module.exports = authMiddleware;
