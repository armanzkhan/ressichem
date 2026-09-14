const {
  escapeHtml,
  formatPoDate,
  formatPoNumber,
  formatPoAmount,
  formatAmountInWordsDisplay,
  buildSupplierParty,
  buildBillToParty,
  poPrintStyles,
  poPrintHeader,
  poPrintParties,
  poPrintAmountInWords,
  poPrintFooterBlock,
} = require("./poPrintShared");

function lineDescription(line) {
  const name = line.itemName || line.description || "";
  const extra = line.material && line.material !== name ? line.material : "";
  const text = extra ? `${name} ${extra}`.trim() : name;
  return escapeHtml(text);
}

function formatImportLineRows(items) {
  return (items || [])
    .map((line, i) => {
      const unit = line.unit || "KG";
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${lineDescription(line)}</td>
        <td>${escapeHtml(line.size || "")}</td>
        <td>${escapeHtml(line.material || "")}</td>
        <td class="r">${formatPoAmount(line.quantity, { min: 5, max: 5 })}</td>
        <td class="c">${escapeHtml(unit)}</td>
        <td class="r">${formatPoAmount(line.unitPrice, { min: 5, max: 5 })}</td>
        <td class="r">${formatPoAmount(line.lineTotal, { min: 5, max: 5 })}</td>
      </tr>`;
    })
    .join("");
}

function importTableFooterRows(subtotal, total) {
  const amount = formatPoAmount(total || subtotal, { min: 5, max: 5 });
  return `
    <tr class="sum">
      <td colspan="7" class="r lbl">Total</td>
      <td class="r">${amount}</td>
    </tr>
    <tr class="sum">
      <td colspan="7" class="r lbl">Total Amount</td>
      <td class="r">${amount}</td>
    </tr>`;
}

/**
 * Import PO print layout aligned to Ressichem sample (PO0477 / Hanzhong).
 * Same structure as local PO; USD columns; no sales tax row.
 */
function renderImportPOHtml(doc) {
  const supplierParty = buildSupplierParty(doc);
  const billTo = buildBillToParty(doc);
  const rawSupplier = doc.supplier;
  const dateStr = formatPoDate(doc.documentDate);
  const poNo = formatPoNumber(doc.poNumber);
  const currency = String(doc.currency || "USD").toUpperCase();
  const subtotal = Number(doc.subtotal || 0);
  const total = Number(doc.total || 0) || subtotal;
  const paymentTerms = String(doc.paymentTerms || "").trim();
  const amountWords = formatAmountInWordsDisplay(doc.amountInWords);
  const deliveryTerm = String(doc.incoTerm || doc.placeOfDelivery || "").trim();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Purchase Order ${escapeHtml(poNo)}</title>
  <style>${poPrintStyles()}</style>
</head>
<body>
  <div class="sheet">
    <div class="sheet-body">
  ${poPrintHeader(dateStr, poNo)}
  ${poPrintParties(supplierParty, billTo, rawSupplier)}

  <div class="pay-line">Payment Terms ${escapeHtml(paymentTerms)}</div>
  <div class="pr-line">P.R #: ${escapeHtml(doc.prNumber || "")}</div>

  <table class="grid">
    <thead>
      <tr>
        <th class="c">S.No</th>
        <th>Description</th>
        <th>Size</th>
        <th>Material</th>
        <th>Quantity</th>
        <th class="c">Unit</th>
        <th class="r">Rate(${escapeHtml(currency)})</th>
        <th class="r">Amount(${escapeHtml(currency)})</th>
      </tr>
    </thead>
    <tbody>
      ${formatImportLineRows(doc.items)}
      ${importTableFooterRows(subtotal, total)}
    </tbody>
  </table>
  ${poPrintAmountInWords(amountWords)}
    </div>

  ${poPrintFooterBlock(doc, amountWords, deliveryTerm)}
  </div>

  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

module.exports = {
  renderImportPOHtml,
};
