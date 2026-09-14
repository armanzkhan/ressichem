const ProcurementItemPrice = require("../models/ProcurementItemPrice");
const { getCompanyId, SUPPORTED_CURRENCIES } = require("../utils/procurementHelpers");

exports.listCurrencies = async (_req, res) => {
  return res.json({ success: true, data: SUPPORTED_CURRENCIES });
};

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { itemId, supplierId, currency } = req.query;
    const query = { company_id, isActive: true };
    if (itemId) query.item = itemId;
    if (supplierId) query.supplier = supplierId;
    if (currency) query.currency = currency.toUpperCase();

    const data = await ProcurementItemPrice.find(query)
      .populate("item", "itemCode name unit")
      .populate("supplier", "supplierCode name defaultCurrency")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const currency = String(body.currency || "USD").toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return res.status(400).json({ success: false, message: `Unsupported currency. Use: ${SUPPORTED_CURRENCIES.join(", ")}` });
    }
    const exists = await ProcurementItemPrice.findOne({
      company_id,
      item: body.item,
      supplier: body.supplier,
      currency,
    });
    if (exists) {
      return res.status(409).json({ success: false, message: "Price already exists for this item, supplier, and currency" });
    }
    const data = await ProcurementItemPrice.create({
      ...body,
      company_id,
      currency,
      createdBy: req.user?._id,
    });
    const populated = await ProcurementItemPrice.findById(data._id)
      .populate("item", "itemCode name unit")
      .populate("supplier", "supplierCode name");
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = { ...req.body };
    if (body.currency) body.currency = String(body.currency).toUpperCase();
    const data = await ProcurementItemPrice.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { ...body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    )
      .populate("item", "itemCode name unit")
      .populate("supplier", "supplierCode name");
    if (!data) return res.status(404).json({ success: false, message: "Price not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementItemPrice.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { isActive: false },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Price not found" });
    return res.json({ success: true, message: "Price deactivated", data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
