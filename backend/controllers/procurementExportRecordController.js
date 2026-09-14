const ProcurementExportRecord = require("../models/ProcurementExportRecord");
const fs = require("fs");
const path = require("path");
const { getCompanyId } = require("../utils/procurementHelpers");
const firebaseStorage = require("../services/firebaseStorageService");

const exportUploadsDir = path.join(__dirname, "..", "uploads", "procurement", "export-documents");

const supplierPopulate =
  "supplierCode name defaultCurrency paymentTerms street city country mobile phone taxId banking";

async function nextRecordNumber(company_id, recordType) {
  const prefix = recordType === "shipment" ? "SHP" : "DOC";
  const year = new Date().getFullYear();
  const count = await ProcurementExportRecord.countDocuments({
    company_id,
    recordType,
    createdAt: {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${year + 1}-01-01`),
    },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
}

function parseDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function shipmentPayloadFromBody(body) {
  return {
    customer: body.customer,
    lcNumber: String(body.lcNumber || "").trim(),
    lcIssueDate: parseDate(body.lcIssueDate),
    lcExpiryDate: parseDate(body.lcExpiryDate),
    lcAmendment1: String(body.lcAmendment1 || "").trim(),
    lcAmendment2: String(body.lcAmendment2 || "").trim(),
    lcAmendment3: String(body.lcAmendment3 || "").trim(),
    vesselName: String(body.vesselName || "").trim(),
    ets: parseDate(body.ets),
    eta: parseDate(body.eta),
    docsDispatchDate: parseDate(body.docsDispatchDate),
    docsReceiveDate: parseDate(body.docsReceiveDate),
    dhlNumber: String(body.dhlNumber || "").trim(),
  };
}

function buildLocalSourceDocument(file) {
  if (!fs.existsSync(exportUploadsDir)) {
    fs.mkdirSync(exportUploadsDir, { recursive: true });
  }
  const safeName = String(file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = file.filename || `export-doc-${Date.now()}-${safeName}`;
  if (!file.filename && file.buffer) {
    fs.writeFileSync(path.join(exportUploadsDir, filename), file.buffer);
  }
  return {
    storage: "local",
    firebasePath: "",
    path: `/uploads/procurement/export-documents/${filename}`,
    originalName: file.originalname || "",
    mimeType: file.mimetype || "",
    size: file.size || file.buffer?.length || 0,
  };
}

async function buildSourceDocument({ company_id, recordNumber, file }) {
  if (firebaseStorage.useFirebaseStorage()) {
    try {
      return await firebaseStorage.uploadExportDocument({
        companyId: company_id,
        recordNumber,
        file,
      });
    } catch (err) {
      console.error("Firebase upload failed, using local storage:", err.message);
    }
  }
  return buildLocalSourceDocument(file);
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { recordType } = req.query;
    const query = { company_id };
    if (recordType) query.recordType = recordType;
    const data = await ProcurementExportRecord.find(query)
      .populate("customer", supplierPopulate)
      .sort({ createdAt: -1 })
      .lean();
    const enriched = await firebaseStorage.enrichRecords(data);
    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementExportRecord.findOne({ _id: req.params.id, company_id })
      .populate("customer", supplierPopulate)
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    const enriched = await firebaseStorage.enrichRecordDocument(data);
    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const customer = req.body?.customer;
    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    const recordNumber = await nextRecordNumber(company_id, "document");
    const sourceDocument = await buildSourceDocument({ company_id, recordNumber, file: req.file });

    const data = await ProcurementExportRecord.create({
      company_id,
      recordType: "document",
      recordNumber,
      customer,
      documentCategory: String(req.body.documentCategory || "Other").trim(),
      referenceNumber: String(req.body.referenceNumber || "").trim(),
      notes: String(req.body.notes || "").trim(),
      documentDate: req.body.documentDate ? new Date(req.body.documentDate) : new Date(),
      sourceDocument,
      createdBy: req.user?._id,
    });

    const populated = await ProcurementExportRecord.findById(data._id).populate("customer", supplierPopulate).lean();
    const enriched = await firebaseStorage.enrichRecordDocument(populated);
    return res.status(201).json({
      success: true,
      data: enriched,
      storage: sourceDocument.storage,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createShipment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    if (!body.customer) {
      return res.status(400).json({ success: false, message: "Customer is required" });
    }

    const recordNumber = await nextRecordNumber(company_id, "shipment");
    const data = await ProcurementExportRecord.create({
      company_id,
      recordType: "shipment",
      recordNumber,
      ...shipmentPayloadFromBody(body),
      createdBy: req.user?._id,
    });

    const populated = await ProcurementExportRecord.findById(data._id).populate("customer", supplierPopulate).lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateShipment = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const update = shipmentPayloadFromBody(body);

    const data = await ProcurementExportRecord.findOneAndUpdate(
      { _id: req.params.id, company_id, recordType: "shipment" },
      update,
      { new: true }
    )
      .populate("customer", supplierPopulate)
      .lean();

    if (!data) return res.status(404).json({ success: false, message: "Shipment record not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await ProcurementExportRecord.findOneAndDelete({ _id: req.params.id, company_id });
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });

    const src = data.sourceDocument;
    if (src?.storage === "firebase" && src.firebasePath) {
      await firebaseStorage.deleteFirebaseFile(src.firebasePath);
    } else if (src?.path) {
      firebaseStorage.deleteLocalUpload(src.path);
    }

    return res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
