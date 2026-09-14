const ProcurementPayment = require("../models/ProcurementPayment");
const ProcurementSupplierInvoice = require("../models/ProcurementSupplierInvoice");
const { getCompanyId, nextDocumentNumber } = require("../utils/procurementHelpers");

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function refreshInvoicePaymentStatus(invoice) {
  const paid = round2(invoice.amountPaid);
  const total = round2(invoice.total);
  if (paid <= 0) {
    if (invoice.status === "partially_paid" || invoice.status === "paid") {
      invoice.status = invoice.matchStatus === "matched" ? "matched" : "submitted";
    }
  } else if (paid + 0.01 >= total) {
    invoice.status = "paid";
  } else {
    invoice.status = "partially_paid";
  }
  await invoice.save();
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { purchaseType, supplierInvoice } = req.query;
    const query = { company_id };
    if (purchaseType) query.purchaseType = purchaseType;
    if (supplierInvoice) query.supplierInvoice = supplierInvoice;
    const data = await ProcurementPayment.find(query)
      .populate("supplierInvoice", "invoiceNumber total status currency amountPaid")
      .populate("purchaseOrder", "poNumber")
      .populate("supplier", "supplierCode name")
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
    const data = await ProcurementPayment.findOne({ _id: req.params.id, company_id })
      .populate("supplierInvoice", "invoiceNumber total status currency amountPaid")
      .populate("purchaseOrder", "poNumber")
      .populate("supplier", "supplierCode name")
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "Payment not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    if (!body.supplierInvoice) {
      return res.status(400).json({ success: false, message: "Supplier invoice is required" });
    }
    const amount = round2(body.amount);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "Payment amount must be greater than zero" });
    }

    const invoice = await ProcurementSupplierInvoice.findOne({ _id: body.supplierInvoice, company_id });
    if (!invoice) return res.status(404).json({ success: false, message: "Supplier invoice not found" });
    if (invoice.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot pay a cancelled invoice" });
    }

    const remaining = round2(invoice.total - (invoice.amountPaid || 0));
    if (amount > remaining + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance (${remaining})`,
      });
    }

    const paymentNumber = await nextDocumentNumber(ProcurementPayment, company_id, "PAY");
    const payment = await ProcurementPayment.create({
      company_id,
      paymentNumber,
      supplierInvoice: invoice._id,
      purchaseOrder: invoice.purchaseOrder,
      supplier: invoice.supplier,
      purchaseType: invoice.purchaseType || body.purchaseType || "foreign",
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      amount,
      currency: body.currency || invoice.currency || "USD",
      exchangeRate: Number(body.exchangeRate) || invoice.exchangeRate || 1,
      method: body.method || "bank_transfer",
      reference: body.reference || "",
      status: "posted",
      notes: body.notes || "",
      createdBy: req.user?._id,
    });

    invoice.amountPaid = round2((invoice.amountPaid || 0) + amount);
    await refreshInvoicePaymentStatus(invoice);

    const data = await ProcurementPayment.findById(payment._id)
      .populate("supplierInvoice", "invoiceNumber total status amountPaid")
      .populate("supplier", "supplierCode name")
      .lean();

    return res.status(201).json({
      success: true,
      message: `Payment ${payment.paymentNumber} posted. Invoice is now ${invoice.status}.`,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
