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

function localSalesTaxLabel(doc) {
  const saleTax = String(doc.saleTax || "").trim();
  if (saleTax && /%/.test(saleTax)) return saleTax;
  const sub = Number(doc.subtotal) || 0;
  const tax = Number(doc.taxAmount) || 0;
  if (sub > 0 && tax > 0) {
    const pct = Math.round((tax / sub) * 100);
    return `${pct}%`;
  }
  return saleTax || "As applicable";
}

function lineDescription(line) {
  return escapeHtml(line.itemName || line.description || "");
}

function formatLineRows(items) {
  return (items || [])
    .map((line, i) => {
      const unit = line.unit || "EA";
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${lineDescription(line)}</td>
        <td>${escapeHtml(line.size || "")}</td>
        <td>${escapeHtml(line.material || "")}</td>
        <td class="r">${formatPoAmount(line.quantity)}</td>
        <td class="c">${escapeHtml(unit)}</td>
        <td class="r">${formatPoAmount(line.unitPrice)}</td>
        <td class="r">${formatPoAmount(line.lineTotal)}</td>
      </tr>`;
    })
    .join("");
}

function tableFooterRows(subtotal, taxAmount, total, salesTaxPct) {
  return `
    <tr class="sum">
      <td colspan="7" class="r lbl">Total</td>
      <td class="r">${formatPoAmount(subtotal)}</td>
    </tr>
    <tr class="sum">
      <td colspan="7" class="r lbl">Sales Tax(${escapeHtml(salesTaxPct)})</td>
      <td class="r">${formatPoAmount(taxAmount)}</td>
    </tr>
    <tr class="sum">
      <td colspan="7" class="r lbl">Total Amount</td>
      <td class="r">${formatPoAmount(total)}</td>
    </tr>`;
}

function renderLocalPOHtml(doc) {
  const supplierParty = buildSupplierParty(doc);
  const billTo = buildBillToParty(doc);
  const rawSupplier = doc.supplier;
  const dateStr = formatPoDate(doc.documentDate);
  const poNo = formatPoNumber(doc.poNumber);
  const subtotal = Number(doc.subtotal || 0);
  const taxAmount = Number(doc.taxAmount || 0);
  const total = Number(doc.total || 0);
  const salesTaxPct = localSalesTaxLabel(doc);
  const paymentTerms = String(doc.paymentTerms || "").toUpperCase();
  const amountWords = formatAmountInWordsDisplay(doc.amountInWords);
  const deliveryTerm = String(doc.placeOfDelivery || "").trim();

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
        <th class="r">Rate(PKR)</th>
        <th class="r">Amount(PKR)</th>
      </tr>
    </thead>
    <tbody>
      ${formatLineRows(doc.items)}
      ${tableFooterRows(subtotal, taxAmount, total, salesTaxPct)}
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
  renderLocalPOHtml,
  formatLocalPoNumber: formatPoNumber,
};
