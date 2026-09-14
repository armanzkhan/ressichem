const ProformaInvoice = require("../models/ProformaInvoice");
const PurchaseOrder = require("../models/PurchaseOrder");
const fs = require("fs");
const path = require("path");
const { getCompanyId, createWithDocumentNumber, nextDocumentNumber, commercialFieldsFromDoc } = require("../utils/procurementHelpers");
const {
  prepareCommercialPayload,
  renderPFIHtml,
  enrichPfiForPrint,
  persistSupplierBanking,
  normalizeSupplierIds,
} = require("../services/procurementDocumentService");

const supplierPopulate =
  "supplierCode name defaultCurrency paymentTerms street city country mobile phone taxId banking";

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, pfiFlow, purchaseType } = req.query;
    const query = { company_id };
    if (status) query.status = status;
    if (pfiFlow) query.pfiFlow = pfiFlow;
    if (purchaseType) query.purchaseType = purchaseType;
    const data = await ProformaInvoice.find(query)
      .populate("supplier", supplierPopulate)
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
    const data = await ProformaInvoice.findOne({ _id: req.params.id, company_id })
      .populate("supplier", supplierPopulate)
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "PFI not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.print = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProformaInvoice.findOne({ _id: req.params.id, company_id })
      .populate("supplier", supplierPopulate)
      .lean();
    if (!data) return res.status(404).send("PFI not found");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderPFIHtml(enrichPfiForPrint(data)));
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

exports.uploadReceived = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const supplier = req.body?.supplier;
    if (!supplier) {
      return res.status(400).json({ success: false, message: "Supplier is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "PFI file is required" });
    }

    const pfiFlow = req.body.pfiFlow || "import_received";
    const relPath = `/uploads/procurement/pfi/${req.file.filename}`;

    const data = await createWithDocumentNumber(ProformaInvoice, company_id, "PFI", (pfiNumber) => {
      const suppliedRef = String(req.body.supplierPfiNumber || req.body.quoteNumber || "").trim();
      // Import received: always use the system PFI number (no manual supplier ref).
      const quoteNumber =
        pfiFlow === "import_received" ? pfiNumber : suppliedRef || pfiNumber;
      return {
        company_id,
        pfiNumber,
        supplier,
        pfiFlow,
        purchaseType: "foreign",
        status: "sent",
        quoteNumber,
        notes: String(req.body.notes || "").trim(),
        documentDate: req.body.documentDate ? new Date(req.body.documentDate) : new Date(),
        currency: req.body.currency || "USD",
        sourceDocument: {
          path: relPath,
          originalName: req.file.originalname || "",
          mimeType: req.file.mimetype || "",
          size: req.file.size || 0,
        },
        items: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        createdBy: req.user?._id,
      };
    });

    const populated = await ProformaInvoice.findById(data._id).populate("supplier", supplierPopulate).lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = await prepareCommercialPayload(req.body || {});
    if (body.pfiFlow !== "export_issued") {
      await persistSupplierBanking(normalizeSupplierIds(body), body.supplierBanking, req.user?._id);
    }
    // Never trust a client-sent document number — allocate server-side with retry on race.
    delete body.pfiNumber;
    const data = await createWithDocumentNumber(ProformaInvoice, company_id, "PFI", (pfiNumber) => ({
      ...body,
      company_id,
      pfiNumber,
      status: body.status || "draft",
      createdBy: req.user?._id,
    }));
    const populated = await ProformaInvoice.findById(data._id).populate("supplier", supplierPopulate).lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = await prepareCommercialPayload(req.body || {});
    if (body.pfiFlow !== "export_issued") {
      await persistSupplierBanking(normalizeSupplierIds(body), body.supplierBanking, req.user?._id);
    }
    const data = await ProformaInvoice.findOneAndUpdate({ _id: req.params.id, company_id }, body, { new: true })
      .populate("supplier", supplierPopulate)
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "PFI not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.convertToPO = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const pfi = await ProformaInvoice.findOne({
      _id: req.params.id,
      company_id,
      status: { $in: ["accepted", "sent"] },
    }).lean();
    if (!pfi) return res.status(400).json({ success: false, message: "PFI not found or not ready for conversion" });

    const poNumber = await nextDocumentNumber(PurchaseOrder, company_id, "PO");
    const commercial = commercialFieldsFromDoc(pfi);
    const po = await PurchaseOrder.create({
      company_id,
      poNumber,
      supplier: pfi.supplier,
      pfi: pfi._id,
      status: "draft",
      notes: commercial.notes || `Converted from PFI ${pfi.pfiNumber}`,
      referencePoNumber: pfi.referencePoNumber,
      createdBy: req.user?._id,
      ...commercial,
    });

    await ProformaInvoice.updateOne(
      { _id: pfi._id },
      { status: "converted", purchaseOrder: po._id }
    );

    return res.status(201).json({
      success: true,
      message: "PFI converted to purchase order",
      data: { pfi: { ...pfi, status: "converted" }, purchaseOrder: po },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

function deletePfiSourceFile(sourceDocument) {
  const relPath = sourceDocument?.path;
  if (!relPath || relPath.startsWith("http://") || relPath.startsWith("https://")) return;
  const localPath = path.join(__dirname, "..", String(relPath).replace(/^\//, ""));
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
  }
}

/** Admin-only: delete a received PFI upload and its stored file */
exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const pfi = await ProformaInvoice.findOne({ _id: req.params.id, company_id }).lean();
    if (!pfi) return res.status(404).json({ success: false, message: "PFI not found" });

    if (pfi.status === "converted") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a PFI that has been converted to a purchase order",
      });
    }

    const receivedFlows = new Set(["import_received", "export_received"]);
    if (!receivedFlows.has(pfi.pfiFlow)) {
      return res.status(400).json({
        success: false,
        message: "Only uploaded received PFIs can be deleted from this screen",
      });
    }

    deletePfiSourceFile(pfi.sourceDocument);
    await ProformaInvoice.deleteOne({ _id: pfi._id, company_id });

    return res.json({ success: true, message: "PFI deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
