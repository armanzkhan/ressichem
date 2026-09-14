const QCAuditLog = require("../models/QCAuditLog");

function getActor(req) {
  return {
    actorId: req.user?._id || null,
    actorEmail: req.user?.email || "",
  };
}

async function writeAudit({ req, company_id, entityType, entityId, action, before, after, meta }) {
  try {
    const actor = getActor(req);
    await QCAuditLog.create({
      company_id,
      entityType,
      entityId,
      action,
      ...actor,
      before,
      after,
      meta,
    });
  } catch (e) {
    // Audit failure should never block main operation
    console.error("QC audit log write failed:", e?.message || e);
  }
}

module.exports = { writeAudit };


