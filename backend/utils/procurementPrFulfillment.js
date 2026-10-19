/**
 * Derived purchase/delivery status from linked PO — does not change PR.status.
 * Used by PR list and monthly reports (additive only).
 */

const PO_STATUS_RANK = {
  received: 6,
  partial: 5,
  issued: 4,
  closed: 3,
  draft: 2,
  cancelled: 1,
};

/** User-facing fulfillment labels aligned to business requirements */
const FULFILLMENT_LABELS = {
  n_a: "",
  awaiting_po: "approved (awaiting purchase)",
  po_draft: "purchase drafting",
  issued: "purchased",
  partial: "partially delivered",
  received: "completed",
  closed: "completed",
  cancelled: "cancelled",
};

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

function deriveStockFulfillment(pr, po) {
  const prStatus = String(pr.status || "").toLowerCase();
  if (prStatus !== "approved") {
    return {
      stockStatus: "n_a",
      fulfillmentStatus: "n_a",
      fulfillmentLabel: "",
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
      fulfillmentStatus: "awaiting_po",
      fulfillmentLabel: FULFILLMENT_LABELS.awaiting_po,
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
    fulfillmentStatus: stockStatus,
    fulfillmentLabel: FULFILLMENT_LABELS[stockStatus] || stockStatus,
    poId: po._id,
    poNumber: po.poNumber || "",
    poStatus,
    qtyOrdered: ordered,
    qtyReceived: received,
  };
}

async function enrichPrsWithFulfillment(PurchaseOrder, company_id, rows = []) {
  if (!rows.length) return rows;

  const prIds = rows.map((r) => r._id).filter(Boolean);
  const pos = await PurchaseOrder.find({
    company_id,
    requisition: { $in: prIds },
    isActive: { $ne: false },
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
    return { ...pr, ...deriveStockFulfillment(pr, linked) };
  });
}

module.exports = {
  PO_STATUS_RANK,
  FULFILLMENT_LABELS,
  sumLineQtys,
  pickLinkedPo,
  deriveStockFulfillment,
  enrichPrsWithFulfillment,
};
