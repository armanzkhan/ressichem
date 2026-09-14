const { buildSpreadsheetBuffer } = require("./procurementSpreadsheet");

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

function userLabel(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "";
}

function itemSummary(items = []) {
  if (!Array.isArray(items) || !items.length) return "";
  return items
    .map((line) => {
      const name = line.itemName || line.description || line.itemCode || "Item";
      const qty = Number(line.quantity) || 0;
      const unit = line.unit || "";
      return `${name} (${qty}${unit ? ` ${unit}` : ""})`;
    })
    .join("; ");
}

function lineCount(items = []) {
  return Array.isArray(items) ? items.length : 0;
}

function stockLabel(status) {
  const map = {
    n_a: "",
    awaiting_po: "Awaiting PO",
    po_draft: "PO draft",
    issued: "Awaiting receipt",
    partial: "Partially received",
    received: "Fully received",
    closed: "Closed",
    cancelled: "PO cancelled",
  };
  return map[String(status || "").toLowerCase()] ?? String(status || "");
}

function toExportRows(rows = []) {
  if (!rows.length) {
    return [
      {
        "PR #": "",
        Department: "",
        Type: "",
        Status: "",
        "PO #": "",
        "Stock status": "",
        "Qty ordered": "",
        "Qty received": "",
        Created: "",
        Submitted: "",
        Approved: "",
        Rejected: "",
        Held: "",
        Requester: "",
        Approver: "",
        "Assigned Approver": "",
        "Line Count": "",
        Items: "",
        Currency: "",
        Total: "",
        "Rejection Reason": "",
        "Hold Reason": "",
        Notes: "",
      },
    ];
  }

  return rows.map((doc) => ({
    "PR #": doc.requisitionNumber || "",
    Department: doc.title || "",
    Type: doc.purchaseType === "local" ? "Local" : "Import",
    Status: doc.status || "",
    "PO #": doc.poNumber || "",
    "Stock status": stockLabel(doc.stockStatus),
    "Qty ordered": Number(doc.qtyOrdered) || 0,
    "Qty received": Number(doc.qtyReceived) || 0,
    Created: fmtDate(doc.createdAt),
    Submitted: fmtDate(doc.submittedAt),
    Approved: fmtDate(doc.approvedAt),
    Rejected: fmtDate(doc.rejectedAt),
    Held: fmtDate(doc.heldAt),
    Requester: userLabel(doc.requestedBy || doc.submittedBy),
    Approver: userLabel(doc.approvedBy || doc.rejectedBy || doc.heldBy),
    "Assigned Approver": userLabel(doc.assignedApprover),
    "Line Count": lineCount(doc.items),
    Items: itemSummary(doc.items),
    Currency: doc.currency || "",
    Total: Number(doc.total) || 0,
    "Rejection Reason": doc.rejectionReason || "",
    "Hold Reason": doc.holdReason || "",
    Notes: doc.notes || "",
  }));
}

function buildPrReportExportBuffer(rows, format = "xlsx") {
  return buildSpreadsheetBuffer(toExportRows(rows), "PR Report", format);
}

module.exports = {
  buildPrReportExportBuffer,
  toExportRows,
  fmtDate,
  userLabel,
};
