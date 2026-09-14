const ProcurementSupplier = require("../models/ProcurementSupplier");
const {
  defaultBillTo,
  defaultShipTo,
  supplierToParty,
  supplierBanking,
  hasBankingDetails,
  normalizeBanking,
  resolveSupplierBanking,
} = require("../utils/procurementDefaults");
const { buildDocumentTotals, computeLineTotals } = require("../utils/procurementHelpers");
const { renderLocalPOHtml } = require("./localPoPrintTemplate");
const { renderImportPOHtml } = require("./importPoPrintTemplate");
const { renderExportPfiHtml } = require("./exportPfiPrintTemplate");

async function loadSupplier(supplierId) {
  if (!supplierId) return null;
  return ProcurementSupplier.findById(supplierId).lean();
}

/** Save banking from a PO/PFI onto the primary supplier for reuse on future documents */
async function persistSupplierBanking(supplierIds, banking, userId) {
  if (!Array.isArray(supplierIds) || !supplierIds.length) return;
  if (!hasBankingDetails(banking)) return;
  const primaryId = supplierIds[0];
  if (!primaryId) return;
  const update = { banking: normalizeBanking(banking) };
  if (userId) update.updatedBy = userId;
  await ProcurementSupplier.findByIdAndUpdate(primaryId, update);
}

function normalizeSupplierIds(body = {}) {
  if (Array.isArray(body.suppliers) && body.suppliers.length) {
    return body.suppliers.filter(Boolean).map(String);
  }
  if (body.supplier) return [String(body.supplier)];
  return [];
}

/** Prefill commercial fields when creating PFI/PO from supplier + optional body */
async function prepareCommercialPayload(body = {}) {
  const supplierIds = normalizeSupplierIds(body);
  if (supplierIds.length) {
    body.suppliers = supplierIds;
    body.supplier = supplierIds[0];
  }
  const supplier = await loadSupplier(body.supplier);
  const isExportIssued = body.pfiFlow === "export_issued";
  const isForeign = body.purchaseType === "foreign";

  let billTo;
  let shipTo;
  let supplierParty;
  let banking;

  if (isExportIssued) {
    const customerParty =
      body.billTo && String(body.billTo.name || "").trim()
        ? body.billTo
        : supplierToParty(supplier);
    billTo = customerParty;
    shipTo =
      body.shipTo && String(body.shipTo.name || "").trim()
        ? body.shipTo
        : customerParty;
    supplierParty = body.supplierParty?.name ? body.supplierParty : defaultBillTo();
    banking = body.supplierBanking || {};
  } else {
    billTo =
      body.billTo && String(body.billTo.name || "").trim()
        ? body.billTo
        : isForeign
          ? {}
          : defaultBillTo();
    shipTo =
      body.shipTo && String(body.shipTo.name || "").trim()
        ? body.shipTo
        : isForeign
          ? {}
          : defaultShipTo();
    supplierParty = body.supplierParty?.name ? body.supplierParty : supplierToParty(supplier);
    banking = resolveSupplierBanking(body.supplierBanking, supplier);
  }

  const payload = {
    ...body,
    documentDate: body.documentDate ? new Date(body.documentDate) : new Date(),
    paymentTerms: body.paymentTerms || supplier?.paymentTerms || "",
    billTo,
    shipTo,
    supplierParty,
    supplierBanking: banking,
  };

  if (body.items) {
    let items = body.items;
    if (supplierIds.length > 1) {
      const supplierDocs = await ProcurementSupplier.find({ _id: { $in: supplierIds } }).lean();
      const nameById = Object.fromEntries(supplierDocs.map((s) => [String(s._id), s.name || ""]));
      items = items.map((line) => ({
        ...line,
        supplierName: line.supplier ? nameById[String(line.supplier)] || line.supplierName || "" : "",
      }));
    }
    const { items: computedItems, subtotal } = computeLineTotals(items, body.exchangeRate || 1);
    payload.items = computedItems;
    payload.subtotal = subtotal;
    const totals = buildDocumentTotals(payload, items, subtotal);
    payload.taxAmount = totals.taxAmount;
    payload.total = totals.total;
    payload.amountInWords = totals.amountInWords;
  }

  return payload;
}

function formatPartyHtml(party) {
  if (!party) return "";
  const lines = [
    party.name,
    party.street,
    [party.city, party.postalCode].filter(Boolean).join(" "),
    party.country,
    party.phone ? `Phone: ${party.phone}` : "",
    party.taxId ? `NTN: ${party.taxId}` : "",
    party.strn ? `STRN: ${party.strn}` : "",
  ].filter(Boolean);
  return lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function lineDescriptionCell(line) {
  const parts = [line.itemName || line.description];
  if (line.shipmentNote) parts.push(line.shipmentNote);
  if (line.remarks) parts.push(line.remarks);
  return escapeHtml(parts.filter(Boolean).join(" — "));
}

function formatLinesTable(items, currency, purchaseType = "foreign", showSupplierCol = false) {
  const isLocal = purchaseType === "local";
  const supplierCell = (line) =>
    showSupplierCol ? `<td>${escapeHtml(line.supplierName || "—")}</td>` : "";
  return (items || [])
    .map((line, i) => {
      const qty = Number(line.quantity).toLocaleString();
      const rate = `${Number(line.unitPrice).toFixed(2)}${line.priceUom ? ` ${escapeHtml(line.priceUom)}` : ""}`;
      const amount = Number(line.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 });
      if (isLocal) {
        return `<tr>
      <td>${i + 1}</td>
      ${supplierCell(line)}
      <td>${lineDescriptionCell(line)}</td>
      <td>${escapeHtml(line.size || "—")}</td>
      <td>${escapeHtml(line.material || line.unit || "—")}</td>
      <td>${escapeHtml(line.packing || "—")}</td>
      <td class="num">${qty}</td>
      <td class="num">${rate}</td>
      <td class="num">${amount}</td>
    </tr>`;
      }
      return `<tr>
      <td>${i + 1}</td>
      ${supplierCell(line)}
      <td>${lineDescriptionCell(line)}</td>
      <td>${escapeHtml(line.hsCode || "—")}</td>
      <td>${escapeHtml(line.size || "—")}</td>
      <td>${escapeHtml(line.packing || "—")}</td>
      <td>${escapeHtml(line.material || line.unit || "—")}</td>
      <td class="num">${qty}</td>
      <td class="num">${rate}</td>
      <td class="num">${amount}</td>
    </tr>`;
    })
    .join("");
}

function linesTableHeader(currency, purchaseType = "foreign", showSupplierCol = false) {
  const supplierTh = showSupplierCol ? "<th>Supplier</th>" : "";
  if (purchaseType === "local") {
    return `<tr><th>S.No</th>${supplierTh}<th>Description</th><th>Size</th><th>Material</th><th>Packing</th><th>Qty</th><th>Rate (${currency})</th><th>Amount (${currency})</th></tr>`;
  }
  return `<tr><th>S.No</th>${supplierTh}<th>Description</th><th>HS Code</th><th>Size</th><th>Packing</th><th>Material</th><th>Qty</th><th>Rate (${currency})</th><th>Amount (${currency})</th></tr>`;
}

function enrichDocForPrint(doc) {
  const out = { ...doc };
  if (!out.supplierParty?.name && out.supplier) {
    out.supplierParty = supplierToParty(out.supplier);
  }
  if (!out.supplierBanking?.bankName && out.supplier?.banking) {
    out.supplierBanking = supplierBanking(out.supplier);
  }
  if (!out.purchaseType) {
    const country = (out.supplierParty?.country || out.supplier?.country || "").toLowerCase();
    out.purchaseType =
      country.includes("pakistan") || country === "pk" ? "local" : "foreign";
  }
  if (!out.billTo?.name) {
    out.billTo = defaultBillTo();
  }
  return out;
}

function enrichPfiForPrint(doc) {
  const out = { ...doc };
  const isExportIssued = out.pfiFlow === "export_issued";
  if (isExportIssued) {
    if (!out.supplierParty?.name) out.supplierParty = defaultBillTo();
    if (!out.billTo?.name && out.supplier && typeof out.supplier === "object") {
      out.billTo = supplierToParty(out.supplier);
    }
    if (!out.shipTo?.name) {
      out.shipTo = out.billTo?.name ? out.billTo : defaultShipTo();
    }
  } else {
    if (!out.supplierParty?.name && out.supplier && typeof out.supplier === "object") {
      out.supplierParty = supplierToParty(out.supplier);
    }
    if (!out.billTo?.name) out.billTo = defaultBillTo();
    if (!out.shipTo?.name) out.shipTo = defaultShipTo();
  }
  return out;
}

function renderPFIHtml(doc) {
  const enriched = enrichPfiForPrint(doc);
  if (enriched.pfiFlow === "export_issued") {
    return renderExportPfiHtml(enriched);
  }
  const cur = enriched.currency || "USD";
  const sup = enriched.supplierParty || {};
  const bank = enriched.supplierBanking || {};
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>PFI ${escapeHtml(doc.pfiNumber)}</title>
<style>
body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}
h1{font-size:18px;margin:0 0 8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.box{border:1px solid #ccc;padding:10px;border-radius:4px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #ccc;padding:6px;text-align:left}
th{background:#f3f4f6}
.num{text-align:right}
.totals{margin-top:12px;text-align:right}
.footer{margin-top:24px;font-size:11px;color:#444}
@media print{body{margin:12px}}
</style></head><body>
<h1>PRO-FORMA INVOICE</h1>
<p><strong>PFI No:</strong> ${escapeHtml(enriched.pfiNumber)} &nbsp; <strong>Date:</strong> ${formatDate(enriched.documentDate)}<br/>
<strong>Quote #:</strong> ${escapeHtml(enriched.quoteNumber)} &nbsp; <strong>Customer #:</strong> ${escapeHtml(enriched.customerNumber)}<br/>
<strong>Validity:</strong> ${formatDate(enriched.validFrom)} – ${formatDate(enriched.validUntil)}</p>
<div class="grid">
  <div class="box"><strong>Supplier / Shipper</strong><br/>${formatPartyHtml(sup)}</div>
  <div class="box"><strong>Sold to / Bill to</strong><br/>${formatPartyHtml(enriched.billTo)}</div>
</div>
<div class="grid">
  <div class="box"><strong>Ship to</strong><br/>${formatPartyHtml(enriched.shipTo)}</div>
  <div class="box">
    <strong>Terms</strong><br/>
    Payment: ${escapeHtml(enriched.paymentTerms)}<br/>
    Incoterm: ${escapeHtml(enriched.incoTerm)}<br/>
    Port of loading: ${escapeHtml(enriched.portOfLoading)}<br/>
    Place of delivery: ${escapeHtml(enriched.placeOfDelivery)}<br/>
    Shipment: ${escapeHtml(enriched.shipment)}<br/>
    Ordered by: ${escapeHtml(enriched.orderedBy)} &nbsp; Booked by: ${escapeHtml(enriched.bookedBy)}
  </div>
</div>
<table>
<thead>${linesTableHeader(cur, "foreign")}</thead>
<tbody>${formatLinesTable(enriched.items, cur, "foreign")}</tbody>
</table>
<div class="totals">
  <p>Subtotal: <strong>${Number(enriched.subtotal).toFixed(2)} ${cur}</strong></p>
  <p>Tax: ${Number(enriched.taxAmount || 0).toFixed(2)} ${cur}</p>
  <p>Total: <strong>${Number(enriched.total).toFixed(2)} ${cur}</strong></p>
  <p><em>Amount in words: ${escapeHtml(enriched.amountInWords)}</em></p>
</div>
<div class="footer">
  <strong>Banking</strong><br/>
  ${escapeHtml(bank.bankName)} | A/C: ${escapeHtml(bank.accountNo)} | SWIFT: ${escapeHtml(bank.swift)}<br/>
  ${escapeHtml(bank.branch)} | ${escapeHtml(bank.address)}<br/><br/>
  ${escapeHtml(enriched.termsAndConditions || "")}<br/>
  <small>This is a computer-generated document.</small>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

function renderPOHtml(doc) {
  const enriched = enrichDocForPrint(doc);
  if (enriched.purchaseType === "local") {
    return renderLocalPOHtml(enriched);
  }
  return renderImportPOHtml(enriched);
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB");
}

module.exports = {
  prepareCommercialPayload,
  renderPFIHtml,
  renderPOHtml,
  enrichDocForPrint,
  enrichPfiForPrint,
  loadSupplier,
  persistSupplierBanking,
  normalizeSupplierIds,
};
