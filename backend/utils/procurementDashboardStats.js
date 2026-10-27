const ProcurementSupplier = require("../models/ProcurementSupplier");
const ProcurementItem = require("../models/ProcurementItem");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");
const ProformaInvoice = require("../models/ProformaInvoice");
const ProcurementExportRecord = require("../models/ProcurementExportRecord");
const {
  applyPurchaseRequisitionVisibility,
  applyPurchaseOrderVisibility,
  ensureUserDepartment,
} = require("./procurementPrRouting");

const OPEN_PFI_STATUSES = ["draft", "sent", "accepted"];

function localSupplierFilter() {
  return {
    $or: [{ country: { $regex: /pakistan/i } }, { country: { $regex: /^pk$/i } }],
  };
}

function importSupplierFilter() {
  return {
    $and: [
      { country: { $not: { $regex: /pakistan/i } } },
      { country: { $not: { $regex: /^pk$/i } } },
    ],
  };
}

/** Same visibility as PR list — requester sees own, approver sees own+assigned, etc. */
function prBaseFilter(company_id, purchaseType, user) {
  const filter = {
    company_id,
    purchaseType,
    isActive: { $ne: false },
  };
  applyPurchaseRequisitionVisibility(filter, user);
  return filter;
}

async function purchaseStats(company_id, purchaseType, user) {
  const filter = prBaseFilter(company_id, purchaseType, user);
  const [
    draft,
    submitted,
    held,
    partiallyApproved,
    rejected,
    approved,
    total,
  ] = await Promise.all([
    PurchaseRequisition.countDocuments({ ...filter, status: "draft" }),
    PurchaseRequisition.countDocuments({ ...filter, status: "submitted" }),
    PurchaseRequisition.countDocuments({ ...filter, status: "held" }),
    PurchaseRequisition.countDocuments({ ...filter, status: "partially_approved" }),
    PurchaseRequisition.countDocuments({ ...filter, status: "rejected" }),
    PurchaseRequisition.countDocuments({ ...filter, status: "approved" }),
    PurchaseRequisition.countDocuments(filter),
  ]);
  const pending = submitted + held + partiallyApproved;
  const poFilter = { company_id, purchaseType, isActive: { $ne: false } };
  await applyPurchaseOrderVisibility(poFilter, user);
  const [poDraft, poIssued, poTotal] = await Promise.all([
    PurchaseOrder.countDocuments({ ...poFilter, status: "draft" }),
    // "issued" card = issued + partial + received (in progress / done) — still plant-scoped
    PurchaseOrder.countDocuments({
      ...poFilter,
      status: { $in: ["issued", "partial", "received", "closed"] },
    }),
    PurchaseOrder.countDocuments(poFilter),
  ]);
  return {
    requisitions: {
      draft,
      pending,
      submitted,
      held,
      partially_approved: partiallyApproved,
      rejected,
      approved,
      total,
    },
    purchaseOrders: { draft: poDraft, issued: poIssued, total: poTotal },
  };
}

async function countLocalImportStats(company_id, user) {
  if (user) await ensureUserDepartment(user);
  const base = { company_id, isActive: true };
  const [localSuppliers, importSuppliers, localItems, importItems] = await Promise.all([
    ProcurementSupplier.countDocuments({ ...base, ...localSupplierFilter() }),
    ProcurementSupplier.countDocuments({ ...base, ...importSupplierFilter() }),
    ProcurementItem.countDocuments({ ...base, tradeScope: "local" }),
    ProcurementItem.countDocuments({ ...base, tradeScope: { $ne: "local" } }),
  ]);

  const [localPurchase, importPurchase, importPfiOpen] = await Promise.all([
    purchaseStats(company_id, "local", user),
    purchaseStats(company_id, "foreign", user),
    ProformaInvoice.countDocuments({
      company_id,
      pfiFlow: "import_received",
      status: { $in: OPEN_PFI_STATUSES },
    }),
  ]);

  const [exportPfiIssued, exportPfiReceived, documents, shipments] = await Promise.all([
    ProformaInvoice.countDocuments({
      company_id,
      pfiFlow: "export_issued",
      status: { $in: OPEN_PFI_STATUSES },
    }),
    ProformaInvoice.countDocuments({
      company_id,
      pfiFlow: "export_received",
      status: { $in: OPEN_PFI_STATUSES },
    }),
    ProcurementExportRecord.countDocuments({ company_id, recordType: "document" }),
    ProcurementExportRecord.countDocuments({ company_id, recordType: "shipment" }),
  ]);

  return {
    local: {
      suppliers: localSuppliers,
      items: localItems,
      ...localPurchase,
    },
    import: {
      suppliers: importSuppliers,
      items: importItems,
      pfiOpen: importPfiOpen,
      ...importPurchase,
    },
    export: {
      pfiIssuedOpen: exportPfiIssued,
      pfiReceivedOpen: exportPfiReceived,
      documents,
      shipments,
    },
  };
}

module.exports = {
  countLocalImportStats,
  OPEN_PFI_STATUSES,
};
