const { writeAudit } = require("./qcAudit");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

/**
 * Soft-delete helpers for QC Hub entities that use isActive.
 */
function makeSoftDeleteHandlers(Model, entityType) {
  async function softDelete(req, res) {
    try {
      const company_id = getCompanyId(req);
      const before = await Model.findOne({ _id: req.params.id, company_id, isActive: true });
      if (!before) {
        return res.status(404).json({ success: false, message: `${entityType} not found` });
      }

      const after = await Model.findOneAndUpdate(
        { _id: req.params.id, company_id },
        { isActive: false, updatedBy: req.user?._id },
        { new: true }
      );

      await writeAudit({
        req,
        company_id,
        entityType,
        entityId: after._id,
        action: "DELETE",
        before: before.toObject ? before.toObject() : before,
        after: after.toObject ? after.toObject() : after,
      });

      return res.json({ success: true, data: after, message: `${entityType} deleted` });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async function bulkSoftDelete(req, res) {
    try {
      const company_id = getCompanyId(req);
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
      if (!ids.length) {
        return res.status(400).json({ success: false, message: "ids array is required" });
      }

      const beforeDocs = await Model.find({ _id: { $in: ids }, company_id, isActive: true });
      if (!beforeDocs.length) {
        return res.status(404).json({ success: false, message: `No matching ${entityType} records found` });
      }

      const matchedIds = beforeDocs.map((d) => d._id);
      await Model.updateMany(
        { _id: { $in: matchedIds }, company_id },
        { isActive: false, updatedBy: req.user?._id }
      );

      await Promise.all(
        beforeDocs.map((doc) =>
          writeAudit({
            req,
            company_id,
            entityType,
            entityId: doc._id,
            action: "DELETE",
            before: doc.toObject ? doc.toObject() : doc,
            after: { ...(doc.toObject ? doc.toObject() : doc), isActive: false },
            meta: { bulk: true },
          })
        )
      );

      return res.json({
        success: true,
        deletedCount: matchedIds.length,
        message: `${matchedIds.length} ${entityType} record(s) deleted`,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return { softDelete, bulkSoftDelete };
}

module.exports = { makeSoftDeleteHandlers, getCompanyId };
