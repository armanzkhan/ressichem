const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");
const { getCompanyId } = require("../utils/procurementHelpers");
const { applyPurchaseRequisitionVisibility } = require("../utils/procurementPrRouting");
const { buildPrReportExportBuffer } = require("../utils/procurementPrReportExport");
const { enrichPrsWithFulfillment } = require("../utils/procurementPrFulfillment");

const USER_AUDIT_FIELDS = "firstName lastName email role";

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
  const { status, department, purchaseType, location, followUpStatus, dateField = "createdAt" } = req.query;

  const allowedDateFields = new Set(["createdAt", "submittedAt", "approvedAt"]);
  const field = allowedDateFields.has(String(dateField)) ? String(dateField) : "createdAt";

  const query = {
    company_id,
    isActive: { $ne: false },
    [field]: { $gte: start, $lt: end },
  };

  if (status) query.status = String(status).trim().toLowerCase();
  if (department) query.title = String(department).trim();
  if (location) query.location = String(location).trim();
  if (followUpStatus) query.followUpStatus = String(followUpStatus).trim();
  if (purchaseType === "local" || purchaseType === "foreign") {
    query.purchaseType = purchaseType;
  }

  applyPurchaseRequisitionVisibility(query, req.user);

  return { query, year, month, dateField: field };
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
  const byLocation = {};

  for (const row of rows) {
    const status = String(row.status || "draft").toLowerCase();
    if (byStatus[status] != null) byStatus[status] += 1;
    const stock = String(row.stockStatus || "n_a").toLowerCase();
    if (byStock[stock] != null) byStock[stock] += 1;
    else byStock[stock] = (byStock[stock] || 0) + 1;
    const dept = row.title || "Unspecified";
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    const loc = String(row.location || "").trim() || "Unspecified";
    byLocation[loc] = (byLocation[loc] || 0) + 1;
  }

  return {
    total: rows.length,
    byStatus,
    byStock,
    byDepartment,
    byLocation,
    pending: byStatus.submitted + byStatus.held,
    awaitingReceipt: byStock.awaiting_po + byStock.po_draft + byStock.issued,
    partiallyReceived: byStock.partial,
    fullyReceived: byStock.received + byStock.closed,
    purchased: byStock.issued || 0,
    partiallyDelivered: byStock.partial || 0,
    completed: (byStock.received || 0) + (byStock.closed || 0),
  };
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
    .populate("followUpBy", USER_AUDIT_FIELDS)
    .sort({ [dateField]: -1, createdAt: -1 })
    .lean();

  const company_id = getCompanyId(req);
  rows = await enrichPrsWithFulfillment(PurchaseOrder, company_id, rows);

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
