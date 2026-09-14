const ProcurementSupplier = require("../models/ProcurementSupplier");
const { getCompanyId, nextSupplierCode, findActiveSupplierByName } = require("../utils/procurementHelpers");

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { search, status } = req.query;
    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (search) {
      const raw = String(search).trim();
      if (raw) {
        const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = { $regex: escaped, $options: "i" };
        query.$or = [
          { supplierCode: rx },
          { name: rx },
          { companyName: rx },
          { email: rx },
          { contactName: rx },
          { mobile: rx },
          { phone: rx },
          { city: rx },
          { country: rx },
        ];
      }
    }
    const data = await ProcurementSupplier.find(query).sort({ name: 1 }).lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementSupplier.findOne({ _id: req.params.id, company_id });
    if (!data) return res.status(404).json({ success: false, message: "Supplier not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = { ...(req.body || {}) };
    delete body.supplierCode;

    if (body.name) {
      const duplicate = await findActiveSupplierByName(ProcurementSupplier, company_id, body.name);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Supplier already exists: ${duplicate.supplierCode} (${duplicate.name})`,
        });
      }
    }

    const supplierCode = await nextSupplierCode(ProcurementSupplier, company_id);
    const data = await ProcurementSupplier.create({
      ...body,
      supplierCode,
      company_id,
      createdBy: req.user?._id,
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const updates = { ...(req.body || {}) };
    delete updates.supplierCode;

    if (updates.name) {
      const duplicate = await findActiveSupplierByName(
        ProcurementSupplier,
        company_id,
        updates.name,
        req.params.id
      );
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Another supplier already uses this name: ${duplicate.supplierCode} (${duplicate.name})`,
        });
      }
    }

    const data = await ProcurementSupplier.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { ...updates, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Supplier not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementSupplier.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { isActive: false, status: "inactive" },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Supplier not found" });
    return res.json({ success: true, message: "Supplier deactivated", data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
