function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

function scenarioCells(doc, scenario, label, { highlightUnit = false } = {}) {
  const s = scenario || {};
  const landingPct = Number(s.landingPct ?? (label === "tax" ? doc.taxPurposeLandingPct : doc.inclusiveLandingPct) ?? 1);
  const unit = Number(s.unitPrice || 0);
  const qty = Number(doc.qtyExBond || 0);
  const rate = Number(doc.exchangeRate || 1);
  const landingPkr = Number(s.landingUsd || 0) * rate;

  return `
    <td class="c">${escapeHtml(label === "tax" ? "Tax purpose" : "All inclusive")}</td>
    <td>${escapeHtml(fmtDate(doc.documentDate) || doc.bondCiDate || "")}</td>
    <td>${escapeHtml(doc.product || "")}${doc.productDetail ? `<div class="muted">${escapeHtml(doc.productDetail)}</div>` : ""}</td>
    <td class="r">${fmt(qty, 0)}</td>
    <td class="r">${fmt(unit, 3)}</td>
    <td class="r">${fmt(s.amountUsd)}</td>
    <td class="r">${fmt(s.insuranceUsd)}</td>
    <td class="r">${fmt(landingPct, 0)}%<div class="muted">${fmt(s.landingUsd)}</div></td>
    <td class="r">${fmt(landingPkr, 0)}</td>
    <td class="r">${fmt(s.amountPkr, 0)}</td>
    <td class="r">${fmt(s.cd, 0)}<div class="muted">${fmt(doc.cdPct, 0)}%</div></td>
    <td class="r">${fmt(s.addCd, 0)}<div class="muted">${fmt(doc.addCdPct, 0)}%</div></td>
    <td class="r">${fmt(s.adSalesTax, 0)}<div class="muted">${fmt(doc.adSalesTaxPct, 0)}%</div></td>
    <td class="r">${fmt(s.salesTax, 0)}<div class="muted">${fmt(doc.salesTaxPct, 0)}%</div></td>
    <td class="r">${fmt(s.incomeTax, 0)}<div class="muted">${fmt(doc.incomeTaxPct, 0)}%</div></td>
    <td class="r bold">${fmt(s.totalDuties, 0)}</td>
    <td class="r">${fmt(doc.whsc, 0)}</td>
    <td class="r">${fmt(doc.dutiesBond, 0)}</td>
    <td class="r">${fmt(doc.agentBill, 0)}</td>
    <td class="r">${fmt(doc.insurancePkr, 0)}</td>
    <td class="r">${fmt(doc.bankComm, 0)}</td>
    <td class="r bold">${fmt(s.gTotal, 0)}</td>
    <td class="r bold${highlightUnit ? " hi" : ""}">${fmt(s.priceInclAllTaxes, 2)}</td>
    <td class="r">${fmt(s.priceWithoutSalesTax, 2)}</td>
  `;
}

function renderCostingHtml(doc) {
  const hs = doc.hsCode || doc.bondCiDate || "";
  const title = [doc.product, doc.costingNumber].filter(Boolean).join(" — ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Costing ${escapeHtml(doc.costingNumber || "")}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; }
    h1 { font-size: 14px; margin: 0 0 4px; }
    .meta { margin-bottom: 8px; color: #333; }
    table.sheet { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sheet th, .sheet td {
      border: 1px solid #333;
      padding: 3px 4px;
      vertical-align: middle;
      word-wrap: break-word;
    }
    .sheet thead .g1 { background: #90EE90; }
    .sheet thead .g2 { background: #FFD966; }
    .sheet thead .g3 { background: #FFE599; }
    .sheet thead .g4 { background: #FFF2CC; }
    .sheet thead .g5 { background: #D9EAD3; }
    .sheet th { font-weight: bold; text-align: center; font-size: 9px; }
    .sheet td.r { text-align: right; }
    .sheet td.c { text-align: center; }
    .sheet td.bold { font-weight: bold; }
    .sheet td.hi { background: #f4cccc; font-weight: bold; }
    .muted { font-size: 8px; color: #555; }
    .notes { margin-top: 10px; white-space: pre-wrap; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>Payment / Costing / Expense</h1>
  <div class="meta">
    <strong>${escapeHtml(title || "Costing sheet")}</strong>
    &nbsp;|&nbsp; Scope: ${escapeHtml(doc.tradeScope || "")}
    &nbsp;|&nbsp; FX: ${fmt(doc.exchangeRate, 4)}
    &nbsp;|&nbsp; HS: ${escapeHtml(hs)}
  </div>
  <table class="sheet">
    <thead>
      <tr>
        <th class="g1" rowspan="2">Type</th>
        <th class="g1" rowspan="2">Bond CI Date</th>
        <th class="g1" rowspan="2">Product</th>
        <th class="g1" rowspan="2">Qty Ex-Bond</th>
        <th class="g2" colspan="6">C F R</th>
        <th class="g3" colspan="6">D U T I E S</th>
        <th class="g4" colspan="5">OTHER CHARGES</th>
        <th class="g5" colspan="3">HS CODE ${escapeHtml(hs)}</th>
      </tr>
      <tr>
        <th class="g2">@</th>
        <th class="g2">Amount</th>
        <th class="g2">Insurance</th>
        <th class="g2">Landing chg</th>
        <th class="g2">Landing PKR</th>
        <th class="g2">Amount (PKR)</th>
        <th class="g3">CD</th>
        <th class="g3">Add CD</th>
        <th class="g3">AD S/Tax</th>
        <th class="g3">SALES TAX</th>
        <th class="g3">I/TAX</th>
        <th class="g3">Total</th>
        <th class="g4">WHSC</th>
        <th class="g4">Duties/Bond</th>
        <th class="g4">Agent Bill</th>
        <th class="g4">Insurance</th>
        <th class="g4">Bank Comm</th>
        <th class="g5">G-Total</th>
        <th class="g5">Price incl all Taxes</th>
        <th class="g5">Price without Sales Tax</th>
      </tr>
    </thead>
    <tbody>
      <tr>${scenarioCells(doc, doc.taxPurpose, "tax")}</tr>
      <tr>${scenarioCells(doc, doc.allInclusive, "inc", { highlightUnit: true })}</tr>
    </tbody>
  </table>
  ${doc.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(doc.notes)}</div>` : ""}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

module.exports = { renderCostingHtml };
