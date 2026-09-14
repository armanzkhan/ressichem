const ProcurementItem = require("../models/ProcurementItem");
const { getCompanyId, nextItemCode } = require("../utils/procurementHelpers");

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { search, category, tradeScope } = req.query;
    const query = { company_id, isActive: true };
    if (category) query.category = category;
    if (tradeScope) query.tradeScope = tradeScope;
    if (search) {
      query.$or = [
        { itemCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }
    const data = await ProcurementItem.find(query)
      .populate("preferredSupplier", "supplierCode name defaultCurrency")
      .sort({ itemCode: 1 })
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementItem.findOne({ _id: req.params.id, company_id }).populate(
      "preferredSupplier",
      "supplierCode name"
    );
    if (!data) return res.status(404).json({ success: false, message: "Item not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = { ...(req.body || {}) };
    delete body.itemCode;
    if (body.preferredSupplier === "" || body.preferredSupplier == null) {
      delete body.preferredSupplier;
    }
    const itemCode = await nextItemCode(ProcurementItem, company_id);
    const data = await ProcurementItem.create({
      ...body,
      company_id,
      itemCode,
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
    delete updates.itemCode;
    const data = await ProcurementItem.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { ...updates, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Item not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementItem.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { isActive: false },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Item not found" });
    return res.json({ success: true, message: "Item deactivated", data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
