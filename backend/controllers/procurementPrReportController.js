const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");
const { getCompanyId } = require("../utils/procurementHelpers");
const {
  applyPurchaseRequisitionVisibility,
  lahorePurchaseRequisitionClause,
  normalizeEmail,
  LAHORE_FINAL_APPROVER_EMAIL,
} = require("../utils/procurementPrRouting");
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

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function karachiDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isLahoreFinanceViewer(user) {
  const email = normalizeEmail(user?.email);
  if (!email) return false;
  const allowed = new Set(
    [LAHORE_FINAL_APPROVER_EMAIL, process.env.PROCUREMENT_LAHORE_APPROVER_EMAIL]
      .map((item) => normalizeEmail(item))
      .filter(Boolean)
  );
  return allowed.has(email);
}

function lineEstimate(pr) {
  return (pr.items || []).reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unitPrice) || 0;
    const lineTotal = Number(line.lineTotal) || 0;
    const amount = price > 0 ? qty * price : lineTotal;
    return sum + (amount > 0 ? amount : 0);
  }, 0);
}

function poEstimate(po) {
  const total = Number(po.total) || 0;
  if (total > 0) return total;
  return (po.items || []).reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unitPrice) || 0;
    const lineTotal = Number(line.lineTotal) || 0;
    const amount = lineTotal > 0 ? lineTotal : qty * price;
    return sum + (amount > 0 ? amount : 0);
  }, 0);
}

/**
 * Daily estimated cost of already-approved Lahore PRs.
 * Uses the requisition line estimate when a price is stored, otherwise the
 * purchase-order total raised against that requisition.
 */
exports.approvedDailyCost = async (req, res) => {
  try {
    if (!isLahoreFinanceViewer(req.user)) {
      return res.status(403).json({
        success: false,
        message: "This daily approved-cost total is available to Lahore finance only",
      });
    }

    const company_id = getCompanyId(req);
    const rows = await PurchaseRequisition.find({
      company_id,
      isActive: { $ne: false },
      status: "approved",
      ...lahorePurchaseRequisitionClause(),
    })
      .select(
        "requisitionNumber title purchaseType approvedAt updatedAt currency total items.quantity items.unitPrice items.lineTotal"
      )
      .lean();

    const ids = rows.map((row) => row._id);
    const numbers = rows.map((row) => row.requisitionNumber).filter(Boolean);
    const pos = ids.length
      ? await PurchaseOrder.find({
          company_id,
          isActive: { $ne: false },
          status: { $ne: "cancelled" },
          $or: [{ requisition: { $in: ids } }, { prNumber: { $in: numbers } }],
        })
          .select("requisition prNumber total currency status items.quantity items.unitPrice items.lineTotal")
          .lean()
      : [];

    const posByRequisition = new Map();
    const posByNumber = new Map();
    for (const po of pos) {
      const amount = poEstimate(po);
      const currency = String(po.currency || "PKR").trim() || "PKR";
      if (po.requisition) {
        const key = String(po.requisition);
        const bucket = posByRequisition.get(key) || [];
        bucket.push({ amount, currency });
        posByRequisition.set(key, bucket);
      }
      if (po.prNumber) {
        const key = String(po.prNumber);
        const bucket = posByNumber.get(key) || [];
        bucket.push({ amount, currency });
        posByNumber.set(key, bucket);
      }
    }

    const days = new Map();
    const grand = new Map();
    let unpricedCount = 0;

    for (const pr of rows) {
      const fromLines = lineEstimate(pr);
      const linked = posByRequisition.get(String(pr._id)) || posByNumber.get(pr.requisitionNumber) || [];
      let currency = String(pr.currency || "").trim();
      let amount = 0;
      if (fromLines > 0) {
        amount = fromLines;
        if (!currency) currency = "PKR";
      } else if (linked.length) {
        amount = linked.reduce((sum, entry) => sum + entry.amount, 0);
        currency = linked.find((entry) => entry.currency)?.currency || currency || "PKR";
      }
      amount = round2(amount);
      if (!(amount > 0)) unpricedCount += 1;
      currency = currency || "PKR";

      const date = karachiDateKey(pr.approvedAt || pr.updatedAt) || "unknown";
      const day = days.get(date) || {
        date,
        requisitionCount: 0,
        requisitions: [],
        totals: new Map(),
      };
      day.requisitionCount += 1;
      day.requisitions.push({
        _id: String(pr._id),
        requisitionNumber: pr.requisitionNumber,
        title: pr.title || "",
        purchaseType: pr.purchaseType === "foreign" ? "foreign" : "local",
        currency,
        estimatedCost: amount,
      });
      day.totals.set(currency, round2((day.totals.get(currency) || 0) + amount));
      days.set(date, day);
      grand.set(currency, round2((grand.get(currency) || 0) + amount));
    }

    const dayRows = [...days.values()]
      .map((day) => ({
        date: day.date,
        requisitionCount: day.requisitionCount,
        requisitions: day.requisitions,
        totals: [...day.totals.entries()].map(([currency, amount]) => ({ currency, amount })),
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return res.json({
      success: true,
      data: {
        days: dayRows,
        totals: [...grand.entries()].map(([currency, amount]) => ({ currency, amount })),
        requisitionCount: rows.length,
        unpricedCount,
      },
    });
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
