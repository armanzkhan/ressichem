const ProcurementCosting = require("../models/ProcurementCosting");
const { getCompanyId, nextDocumentNumber } = require("../utils/procurementHelpers");
const { computeBothScenarios } = require("../utils/procurementCostingCalc");
const { renderCostingHtml } = require("../services/costingPrintTemplate");
const { buildCostingExportBuffer } = require("../utils/procurementCostingExport");

function exportFormat(req) {
  return String(req.query.format || "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
}

function sendCostingExport(res, docs, filenameBase, format) {
  const buffer = buildCostingExportBuffer(docs, format);
  const ext = format === "csv" ? "csv" : "xlsx";
  const contentType =
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.${ext}"`);
  return res.send(buffer);
}

function buildPayload(body = {}, userId) {
  const { taxPurpose, allInclusive } = computeBothScenarios(body);
  return {
    tradeScope: body.tradeScope === "local" ? "local" : "import",
    status: body.status || "draft",
    documentDate: body.documentDate ? new Date(body.documentDate) : new Date(),
    hsCode: String(body.hsCode || "").trim(),
    bondCiDate: String(body.bondCiDate || "").trim(),
    product: String(body.product || "").trim(),
    productDetail: String(body.productDetail || "").trim(),
    item: body.item || undefined,
    supplier: body.supplier || undefined,
    purchaseOrder: body.purchaseOrder || undefined,
    qtyExBond: Number(body.qtyExBond) || 0,
    currency: body.currency || (body.tradeScope === "local" ? "PKR" : "USD"),
    exchangeRate: Number(body.exchangeRate) || 1,
    taxPurposeUnitPrice: Number(body.taxPurposeUnitPrice) || 0,
    taxPurposeInsuranceUsd: Number(body.taxPurposeInsuranceUsd) || 0,
    taxPurposeLandingPct: Number(body.taxPurposeLandingPct) ?? 1,
    inclusiveUnitPrice: Number(body.inclusiveUnitPrice) || 0,
    inclusiveInsuranceUsd: Number(body.inclusiveInsuranceUsd) || 0,
    inclusiveLandingPct: Number(body.inclusiveLandingPct) ?? 1,
    cdPct: Number(body.cdPct) || 0,
    addCdPct: Number(body.addCdPct) || 0,
    adSalesTaxPct: Number(body.adSalesTaxPct) || 0,
    salesTaxPct: Number(body.salesTaxPct) ?? 18,
    incomeTaxPct: Number(body.incomeTaxPct) ?? 2,
    whsc: Number(body.whsc) || 0,
    dutiesBond: Number(body.dutiesBond) || 0,
    agentBill: Number(body.agentBill) || 0,
    insurancePkr: Number(body.insurancePkr) || 0,
    bankComm: Number(body.bankComm) || 0,
    otherCharges: Number(body.otherCharges) || 0,
    notes: String(body.notes || "").trim(),
    taxPurpose,
    allInclusive,
    updatedBy: userId,
  };
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { tradeScope, status } = req.query;
    const query = { company_id };
    if (tradeScope) query.tradeScope = tradeScope;
    if (status) query.status = status;
    const data = await ProcurementCosting.find(query)
      .populate("supplier", "supplierCode name")
      .populate("item", "itemCode name")
      .populate("purchaseOrder", "poNumber")
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
    const data = await ProcurementCosting.findOne({ _id: req.params.id, company_id })
      .populate("supplier", "supplierCode name")
      .populate("item", "itemCode name")
      .populate("purchaseOrder", "poNumber")
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "Costing sheet not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.print = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementCosting.findOne({ _id: req.params.id, company_id }).lean();
    if (!data) return res.status(404).send("Costing sheet not found");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderCostingHtml(data));
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

exports.exportList = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const format = exportFormat(req);
    const { tradeScope, status } = req.query;
    const query = { company_id, status: { $ne: "cancelled" } };
    if (tradeScope) query.tradeScope = tradeScope;
    if (status) query.status = status;
    const data = await ProcurementCosting.find(query).sort({ createdAt: -1 }).lean();
    const scopePart = tradeScope ? `-${tradeScope}` : "";
    return sendCostingExport(res, data, `procurement-costing${scopePart}`, format);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportOne = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const format = exportFormat(req);
    const data = await ProcurementCosting.findOne({ _id: req.params.id, company_id }).lean();
    if (!data) return res.status(404).json({ success: false, message: "Costing sheet not found" });
    const base = data.costingNumber || `costing-${req.params.id}`;
    return sendCostingExport(res, [data], String(base).replace(/[^\w.-]+/g, "_"), format);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const { taxPurpose, allInclusive } = computeBothScenarios(req.body || {});
    return res.json({ success: true, data: { taxPurpose, allInclusive } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const costingNumber = await nextDocumentNumber(ProcurementCosting, company_id, "CST");
    const payload = buildPayload(req.body || {}, req.user?._id);
    if (!payload.product) {
      return res.status(400).json({ success: false, message: "Product is required" });
    }
    const data = await ProcurementCosting.create({
      ...payload,
      company_id,
      costingNumber,
      createdBy: req.user?._id,
    });
    const populated = await ProcurementCosting.findById(data._id)
      .populate("supplier", "supplierCode name")
      .populate("item", "itemCode name")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await ProcurementCosting.findOne({ _id: req.params.id, company_id });
    if (!existing) return res.status(404).json({ success: false, message: "Costing sheet not found" });
    if (existing.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot edit a cancelled costing sheet" });
    }
    const payload = buildPayload({ ...existing.toObject(), ...(req.body || {}) }, req.user?._id);
    delete payload.createdBy;
    const data = await ProcurementCosting.findByIdAndUpdate(existing._id, payload, { new: true })
      .populate("supplier", "supplierCode name")
      .populate("item", "itemCode name")
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementCosting.findOneAndUpdate(
      { _id: req.params.id, company_id },
      { status: "cancelled", updatedBy: req.user?._id },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Costing sheet not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
