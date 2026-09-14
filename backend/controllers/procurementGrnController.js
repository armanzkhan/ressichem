const GoodsReceiptNote = require("../models/GoodsReceiptNote");
const { getCompanyId } = require("../utils/procurementHelpers");

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { purchaseType, purchaseOrder } = req.query;
    const query = { company_id };
    if (purchaseType) query.purchaseType = purchaseType;
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    const data = await GoodsReceiptNote.find(query)
      .populate("purchaseOrder", "poNumber status total currency")
      .populate("supplier", "supplierCode name")
      .populate("receivedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await GoodsReceiptNote.findOne({ _id: req.params.id, company_id })
      .populate("purchaseOrder", "poNumber status items total currency")
      .populate("supplier", "supplierCode name")
      .populate("receivedBy", "firstName lastName email")
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "GRN not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
