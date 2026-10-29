/**
 * Derived purchase/delivery status from linked PO — does not change PR.status.
 * Used by PR list and monthly reports (additive only).
 * Also stamps each PR line with line-level processed / delivery status.
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
  partial_lines: "some lines on a PO — remaining awaiting PO",
  po_draft: "purchase drafting",
  issued: "purchased",
  partial: "partially delivered",
  received: "completed",
  closed: "completed",
  cancelled: "cancelled",
};

/** Per PR-line labels (shown on requisition detail / line list) */
const LINE_FULFILLMENT_LABELS = {
  n_a: "—",
  awaiting_po: "awaiting PO",
  po_draft: "on PO (draft)",
  issued: "processed",
  partial: "processed (partial)",
  received: "processed (received)",
  closed: "processed (received)",
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

function lineMatchKey(line = {}) {
  const id = line.item && typeof line.item === "object" ? line.item._id : line.item;
  if (id) return `id:${String(id)}`;
  if (line.itemCode) return `code:${String(line.itemCode).trim().toLowerCase()}`;
  if (line.itemName) return `name:${String(line.itemName).trim().toLowerCase()}`;
  return "";
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
 * Map a PR line to the linked PO line status.
 * "processed" = line is on a PO that has been issued (or further).
 */
function deriveLineFulfillment(prStatus, po, poLine) {
  const approved = String(prStatus || "").toLowerCase() === "approved";
  if (!approved) {
    return {
      lineFulfillmentStatus: "n_a",
      lineFulfillmentLabel: LINE_FULFILLMENT_LABELS.n_a,
      processed: false,
      qtyOrdered: 0,
      qtyReceived: 0,
      poLineId: null,
    };
  }

  if (!po || String(po.status || "").toLowerCase() === "cancelled" || !poLine) {
    return {
      lineFulfillmentStatus: "awaiting_po",
      lineFulfillmentLabel: LINE_FULFILLMENT_LABELS.awaiting_po,
      processed: false,
      qtyOrdered: 0,
      qtyReceived: 0,
      poLineId: null,
    };
  }

  const poStatus = String(po.status || "draft").toLowerCase();
  const ordered = Number(poLine.quantity) || 0;
  const received = Number(poLine.receivedQuantity) || 0;

  let status = "po_draft";
  if (poStatus === "closed" || poStatus === "received" || (ordered > 0 && received >= ordered - 1e-9)) {
    status = poStatus === "closed" ? "closed" : "received";
  } else if (poStatus === "partial" || received > 0) {
    status = "partial";
  } else if (poStatus === "issued") {
    status = "issued";
  } else if (poStatus === "draft") {
    status = "po_draft";
  }

  const processed = ["issued", "partial", "received", "closed"].includes(status);

  return {
    lineFulfillmentStatus: status,
    lineFulfillmentLabel: LINE_FULFILLMENT_LABELS[status] || status,
    processed,
    qtyOrdered: ordered,
    qtyReceived: received,
    poLineId: poLine._id || null,
  };
}

function activePurchaseOrders(pos) {
  const list = Array.isArray(pos) ? pos : pos ? [pos] : [];
  return list.filter((po) => String(po?.status || "").toLowerCase() !== "cancelled");
}

/** PR line indexes already copied onto a live PO. */
function takenPrLineIndexes(pr, pos) {
  const taken = new Set();
  const active = activePurchaseOrders(pos);
  const legacy = [];
  for (const po of active) {
    const poItems = po.items || [];
    const indexed = poItems.filter((line) => Number.isInteger(line?.prLineIndex));
    if (indexed.length) {
      indexed.forEach((line) => taken.add(line.prLineIndex));
    } else if (poItems.length) {
      legacy.push(po);
    }
  }
  // Older POs copied every PR line in order and did not store prLineIndex.
  if (legacy.length === 1 && (pr.items || []).length === (legacy[0].items || []).length) {
    (pr.items || []).forEach((_, index) => taken.add(index));
  }
  return taken;
}

function enrichPrItemsWithLineFulfillment(pr, pos) {
  const prItems = Array.isArray(pr.items) ? pr.items : [];
  if (!prItems.length) {
    return { items: prItems, linesProcessed: 0, linesTotal: 0 };
  }

  const active = activePurchaseOrders(pos);
  const byIndex = new Map();
  for (const po of active) {
    for (const poLine of po.items || []) {
      if (!Number.isInteger(poLine?.prLineIndex) || byIndex.has(poLine.prLineIndex)) continue;
      byIndex.set(poLine.prLineIndex, { po, poLine });
    }
  }
  const legacyPo =
    active.length === 1 &&
    (active[0].items || []).length === prItems.length &&
    (active[0].items || []).every((line) => !Number.isInteger(line?.prLineIndex))
      ? active[0]
      : null;

  let linesProcessed = 0;
  const items = prItems.map((prLine, i) => {
    const linked = byIndex.get(i) || (legacyPo ? { po: legacyPo, poLine: legacyPo.items[i] } : null);
    const lineMeta = deriveLineFulfillment(pr.status, linked?.po, linked?.poLine);
    if (["po_draft", "issued", "partial", "received", "closed"].includes(lineMeta.lineFulfillmentStatus)) {
      linesProcessed += 1;
    } else if (lineMeta.lineFulfillmentStatus === "awaiting_po" && active.length) {
      lineMeta.lineFulfillmentLabel = "remaining — awaiting PO";
    }
    return { ...prLine, ...lineMeta };
  });

  return { items, linesProcessed, linesTotal: items.length };
}

function headerFulfillmentFromLines(pr, items, pos) {
  const active = activePurchaseOrders(pos);
  const open = items.filter((line) => line.lineFulfillmentStatus === "awaiting_po").length;
  const covered = items.length - open;
  if (!items.length || !active.length || covered <= 0) {
    return deriveStockFulfillment(pr, null);
  }
  if (open > 0) {
    return {
      stockStatus: "partial_lines",
      fulfillmentStatus: "partial_lines",
      fulfillmentLabel: `${covered} of ${items.length} lines on a PO — remaining awaiting PO`,
      poId: active[0]._id,
      poNumber: active.map((po) => po.poNumber).filter(Boolean).join(", "),
      poStatus: "partial_lines",
      qtyOrdered: 0,
      qtyReceived: 0,
    };
  }
  return deriveStockFulfillment(pr, pickLinkedPo(active));
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
    const linked = byPr.get(String(pr._id)) || [];
    const { items, linesProcessed, linesTotal } = enrichPrItemsWithLineFulfillment(pr, linked);
    const header = headerFulfillmentFromLines(pr, items, linked);
    return {
      ...pr,
      ...header,
      items,
      linesProcessed,
      linesTotal,
    };
  });
}

module.exports = {
  PO_STATUS_RANK,
  FULFILLMENT_LABELS,
  LINE_FULFILLMENT_LABELS,
  sumLineQtys,
  pickLinkedPo,
  deriveStockFulfillment,
  deriveLineFulfillment,
  enrichPrItemsWithLineFulfillment,
  enrichPrsWithFulfillment,
  takenPrLineIndexes,
  activePurchaseOrders,
};
