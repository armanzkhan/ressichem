const ProcurementSupplierInvoice = require("../models/ProcurementSupplierInvoice");
const PurchaseOrder = require("../models/PurchaseOrder");
const GoodsReceiptNote = require("../models/GoodsReceiptNote");
const { getCompanyId, nextDocumentNumber, computeLineTotals } = require("../utils/procurementHelpers");

const VARIANCE_TOLERANCE = 0.01;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function computeMatch(company_id, invoice) {
  let matchedPoTotal = 0;
  let matchedReceivedTotal = 0;

  if (invoice.purchaseOrder) {
    const po = await PurchaseOrder.findOne({ _id: invoice.purchaseOrder, company_id }).lean();
    if (po) {
      matchedPoTotal = round2(po.total);
      matchedReceivedTotal = round2(
        (po.items || []).reduce(
          (sum, line) => sum + (Number(line.receivedQuantity) || 0) * (Number(line.unitPrice) || 0),
          0
        )
      );
    }
  }

  if (invoice.goodsReceipt) {
    const grn = await GoodsReceiptNote.findOne({ _id: invoice.goodsReceipt, company_id }).lean();
    if (grn) {
      matchedReceivedTotal = round2((grn.items || []).reduce((sum, line) => sum + (Number(line.lineTotal) || 0), 0));
    }
  }

  const invoiceTotal = round2(invoice.total);
  let matchStatus = "unmatched";
  if (invoice.purchaseOrder) {
    const poOk = Math.abs(invoiceTotal - matchedPoTotal) <= VARIANCE_TOLERANCE;
    const recvOk =
      matchedReceivedTotal <= 0 ? true : Math.abs(invoiceTotal - matchedReceivedTotal) <= VARIANCE_TOLERANCE || invoiceTotal <= matchedReceivedTotal + VARIANCE_TOLERANCE;
    matchStatus = poOk && recvOk ? "matched" : "variance";
  }

  return { matchedPoTotal, matchedReceivedTotal, matchStatus };
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { purchaseType, status, purchaseOrder } = req.query;
    const query = { company_id };
    if (purchaseType) query.purchaseType = purchaseType;
    if (status) query.status = status;
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    const data = await ProcurementSupplierInvoice.find(query)
      .populate("supplier", "supplierCode name")
      .populate("purchaseOrder", "poNumber status total currency")
      .populate("goodsReceipt", "grnNumber")
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
    const data = await ProcurementSupplierInvoice.findOne({ _id: req.params.id, company_id })
      .populate("supplier", "supplierCode name")
      .populate("purchaseOrder", "poNumber status total currency items")
      .populate("goodsReceipt", "grnNumber items")
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "Supplier invoice not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    if (!body.supplier) {
      return res.status(400).json({ success: false, message: "Supplier is required" });
    }

    let items = body.items || [];
    let subtotal = Number(body.subtotal) || 0;
    let taxAmount = Number(body.taxAmount) || 0;
    let total = Number(body.total) || 0;

    if (items.length) {
      const computed = computeLineTotals(items, body.exchangeRate || 1);
      items = computed.items;
      subtotal = computed.subtotal;
      taxAmount = Number(body.taxAmount) || 0;
      total = round2(subtotal + taxAmount);
    } else if (body.purchaseOrder && !total) {
      const po = await PurchaseOrder.findOne({ _id: body.purchaseOrder, company_id }).lean();
      if (po) {
        items = (po.items || []).map((line) => ({
          item: line.item,
          itemCode: line.itemCode,
          itemName: line.itemName,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        }));
        subtotal = po.subtotal || 0;
        taxAmount = po.taxAmount || 0;
        total = po.total || 0;
      }
    }

    const invoiceNumber = await nextDocumentNumber(ProcurementSupplierInvoice, company_id, "SINV");
    const draft = {
      company_id,
      invoiceNumber,
      supplierInvoiceNo: body.supplierInvoiceNo || "",
      purchaseOrder: body.purchaseOrder || undefined,
      goodsReceipt: body.goodsReceipt || undefined,
      supplier: body.supplier,
      purchaseType: body.purchaseType || "foreign",
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      currency: body.currency || "USD",
      exchangeRate: Number(body.exchangeRate) || 1,
      items,
      subtotal,
      taxAmount,
      total,
      notes: body.notes || "",
      status: body.status || "draft",
      createdBy: req.user?._id,
    };

    const match = await computeMatch(company_id, draft);
    Object.assign(draft, match);

    const data = await ProcurementSupplierInvoice.create(draft);
    const populated = await ProcurementSupplierInvoice.findById(data._id)
      .populate("supplier", "supplierCode name")
      .populate("purchaseOrder", "poNumber status total")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await ProcurementSupplierInvoice.findOne({ _id: req.params.id, company_id });
    if (!existing) return res.status(404).json({ success: false, message: "Supplier invoice not found" });
    if (["paid", "cancelled"].includes(existing.status)) {
      return res.status(400).json({ success: false, message: `Cannot edit invoice in status: ${existing.status}` });
    }

    const body = req.body || {};
    const updates = { ...body };
    delete updates.invoiceNumber;
    delete updates.amountPaid;

    if (body.items) {
      const computed = computeLineTotals(body.items, body.exchangeRate ?? existing.exchangeRate);
      updates.items = computed.items;
      updates.subtotal = computed.subtotal;
      updates.taxAmount = Number(body.taxAmount) || 0;
      updates.total = round2(updates.subtotal + updates.taxAmount);
    }

    Object.assign(existing, updates);
    const match = await computeMatch(company_id, existing);
    Object.assign(existing, match);
    await existing.save();

    const data = await ProcurementSupplierInvoice.findById(existing._id)
      .populate("supplier", "supplierCode name")
      .populate("purchaseOrder", "poNumber status total")
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.match = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const invoice = await ProcurementSupplierInvoice.findOne({ _id: req.params.id, company_id });
    if (!invoice) return res.status(404).json({ success: false, message: "Supplier invoice not found" });
    if (!invoice.purchaseOrder) {
      return res.status(400).json({ success: false, message: "Link a purchase order before matching" });
    }

    const match = await computeMatch(company_id, invoice);
    invoice.matchedPoTotal = match.matchedPoTotal;
    invoice.matchedReceivedTotal = match.matchedReceivedTotal;
    invoice.matchStatus = match.matchStatus;
    invoice.matchNotes = req.body?.matchNotes || invoice.matchNotes || "";
    invoice.matchedBy = req.user?._id;
    invoice.matchedAt = new Date();
    if (match.matchStatus === "matched" && invoice.status === "draft") {
      invoice.status = "matched";
    } else if (match.matchStatus === "matched") {
      invoice.status = invoice.status === "draft" ? "matched" : invoice.status;
    }
    await invoice.save();

    const data = await ProcurementSupplierInvoice.findById(invoice._id)
      .populate("supplier", "supplierCode name")
      .populate("purchaseOrder", "poNumber status total")
      .lean();
    return res.json({
      success: true,
      message: match.matchStatus === "matched" ? "Invoice matched to PO/GRN" : "Invoice has variance vs PO/received",
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
