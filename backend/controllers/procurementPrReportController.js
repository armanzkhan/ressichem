const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");
const { getCompanyId } = require("../utils/procurementHelpers");
const { canApproveRequisitions, isProcurementAdminUser } = require("../utils/procurementPrRouting");
const { buildPrReportExportBuffer } = require("../utils/procurementPrReportExport");

const USER_AUDIT_FIELDS = "firstName lastName email role";

const PO_STATUS_RANK = {
  received: 6,
  partial: 5,
  issued: 4,
  closed: 3,
  draft: 2,
  cancelled: 1,
};

function parseMonthYear(query = {}) {
  const now = new Date();
  let year = Number(query.year);
  let month = Number(query.month);

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    year = now.getFullYear();
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    month = now.getMonth() + 1;
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { year, month, start, end };
}

function buildQuery(req) {
  const company_id = getCompanyId(req);
  const { year, month, start, end } = parseMonthYear(req.query);
  const { status, department, purchaseType, dateField = "createdAt" } = req.query;

  const allowedDateFields = new Set(["createdAt", "submittedAt", "approvedAt"]);
  const field = allowedDateFields.has(String(dateField)) ? String(dateField) : "createdAt";

  const query = {
    company_id,
    [field]: { $gte: start, $lt: end },
  };

  if (status) query.status = String(status).trim().toLowerCase();
  if (department) query.title = String(department).trim();
  if (purchaseType === "local" || purchaseType === "foreign") {
    query.purchaseType = purchaseType;
  }

  // Approvers (non-admin) only see PRs routed to them.
  if (canApproveRequisitions(req.user) && !isProcurementAdminUser(req.user)) {
    query.assignedApprover = req.user._id;
  }

  return { query, year, month, dateField: field };
}

function sumLineQtys(items = []) {
  let ordered = 0;
  let received = 0;
  for (const line of items) {
    ordered += Number(line.quantity) || 0;
    received += Number(line.receivedQuantity) || 0;
  }
  return { ordered, received };
}

function pickLinkedPo(pos = []) {
  if (!pos.length) return null;
  return [...pos].sort((a, b) => {
    const rankDiff = (PO_STATUS_RANK[b.status] || 0) - (PO_STATUS_RANK[a.status] || 0);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  })[0];
}

/**
 * Stock/fulfillment is tracked on the PO after PR approval — not on the PR itself.
 * Map linked PO + received quantities into a report-friendly stockStatus.
 */
function deriveStockFulfillment(pr, po) {
  const prStatus = String(pr.status || "").toLowerCase();
  if (prStatus !== "approved") {
    return {
      stockStatus: "n_a",
      poId: null,
      poNumber: "",
      poStatus: "",
      qtyOrdered: 0,
      qtyReceived: 0,
    };
  }

  if (!po) {
    return {
      stockStatus: "awaiting_po",
      poId: null,
      poNumber: "",
      poStatus: "",
      qtyOrdered: 0,
      qtyReceived: 0,
    };
  }

  const { ordered, received } = sumLineQtys(po.items);
  const poStatus = String(po.status || "draft").toLowerCase();
  let stockStatus = poStatus;

  if (poStatus === "cancelled") {
    stockStatus = "cancelled";
  } else if (poStatus === "closed") {
    stockStatus = "closed";
  } else if (poStatus === "received" || (ordered > 0 && received >= ordered)) {
    stockStatus = "received";
  } else if (poStatus === "partial" || received > 0) {
    stockStatus = "partial";
  } else if (poStatus === "issued") {
    stockStatus = "issued";
  } else if (poStatus === "draft") {
    stockStatus = "po_draft";
  }

  return {
    stockStatus,
    poId: po._id,
    poNumber: po.poNumber || "",
    poStatus,
    qtyOrdered: ordered,
    qtyReceived: received,
  };
}

function buildSummary(rows = []) {
  const byStatus = {
    draft: 0,
    submitted: 0,
    partially_approved: 0,
    approved: 0,
    rejected: 0,
    held: 0,
    cancelled: 0,
  };
  const byStock = {
    n_a: 0,
    awaiting_po: 0,
    po_draft: 0,
    issued: 0,
    partial: 0,
    received: 0,
    closed: 0,
    cancelled: 0,
  };
  const byDepartment = {};

  for (const row of rows) {
    const status = String(row.status || "draft").toLowerCase();
    if (byStatus[status] != null) byStatus[status] += 1;
    const stock = String(row.stockStatus || "n_a").toLowerCase();
    if (byStock[stock] != null) byStock[stock] += 1;
    else byStock[stock] = (byStock[stock] || 0) + 1;
    const dept = row.title || "Unspecified";
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
  }

  return {
    total: rows.length,
    byStatus,
    byStock,
    byDepartment,
    pending: byStatus.submitted + byStatus.held,
    awaitingReceipt: byStock.awaiting_po + byStock.po_draft + byStock.issued,
    partiallyReceived: byStock.partial,
    fullyReceived: byStock.received + byStock.closed,
  };
}

async function enrichWithPurchaseOrders(company_id, rows = []) {
  if (!rows.length) return rows;

  const prIds = rows.map((r) => r._id).filter(Boolean);
  const pos = await PurchaseOrder.find({
    company_id,
    requisition: { $in: prIds },
  })
    .select("poNumber status items requisition updatedAt")
    .lean();

  const byPr = new Map();
  for (const po of pos) {
    const key = String(po.requisition);
    if (!byPr.has(key)) byPr.set(key, []);
    byPr.get(key).push(po);
  }

  return rows.map((pr) => {
    const linked = pickLinkedPo(byPr.get(String(pr._id)) || []);
    const fulfillment = deriveStockFulfillment(pr, linked);
    return {
      ...pr,
      ...fulfillment,
    };
  });
}

async function loadReportRows(req) {
  const { query, year, month, dateField } = buildQuery(req);
  const stockFilter = String(req.query.stockStatus || "")
    .trim()
    .toLowerCase();

  let rows = await PurchaseRequisition.find(query)
    .populate("requestedBy", USER_AUDIT_FIELDS)
    .populate("submittedBy", USER_AUDIT_FIELDS)
    .populate("assignedApprover", USER_AUDIT_FIELDS)
    .populate("approvedBy", USER_AUDIT_FIELDS)
    .populate("rejectedBy", USER_AUDIT_FIELDS)
    .populate("heldBy", USER_AUDIT_FIELDS)
    .sort({ [dateField]: -1, createdAt: -1 })
    .lean();

  const company_id = getCompanyId(req);
  rows = await enrichWithPurchaseOrders(company_id, rows);

  if (stockFilter) {
    rows = rows.filter((r) => String(r.stockStatus || "").toLowerCase() === stockFilter);
  }

  return {
    year,
    month,
    dateField,
    rows,
    summary: buildSummary(rows),
  };
}

exports.monthlyReport = async (req, res) => {
  try {
    const data = await loadReportRows(req);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportMonthlyReport = async (req, res) => {
  try {
    const format = String(req.query.format || "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
    const { year, month, rows } = await loadReportRows(req);
    const buffer = buildPrReportExportBuffer(rows, format);
    const monthPad = String(month).padStart(2, "0");
    const filename = `pr-monthly-report-${year}-${monthPad}.${format}`;
    const contentType =
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
