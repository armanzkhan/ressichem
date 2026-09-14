const { defaultBillTo } = require("../utils/procurementDefaults");
const { integerToWords } = require("../utils/amountInWords");
const { escapeHtml, buildBillToParty } = require("./poPrintShared");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatPfiDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}, ${dt.getFullYear()}`;
}

function formatUsd(n, { min = 2, max = 2 } = {}) {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function formatUsdAmountWords(doc) {
  const raw = String(doc.amountInWords || "").trim();
  if (/dollars and/i.test(raw)) return raw.replace(/\s+USD$/i, "");
  const total = Number(doc.total || doc.subtotal || 0);
  const whole = Math.floor(total);
  const cents = Math.round((total - whole) * 100);
  return `${integerToWords(whole)} Dollars and ${integerToWords(cents)} Cents`;
}

function partyBlockLines(party, { uppercase = false } = {}) {
  const lines = [];
  if (party?.name) lines.push(`<div class="party-name">${escapeHtml(party.name)}</div>`);
  const street = party?.street || "";
  const city = party?.city || "";
  const postal = party?.postalCode || "";
  const country = party?.country || "";
  if (street) lines.push(`<div>${escapeHtml(uppercase ? street.toUpperCase() : street)}</div>`);
  const cityLine = [city, postal, country].filter(Boolean).join(", ");
  if (cityLine) lines.push(`<div>${escapeHtml(uppercase ? cityLine.toUpperCase() : cityLine)}</div>`);
  return lines.join("") || "&nbsp;";
}

function lineGrade(line) {
  return line.material || line.size || "";
}

function lineDescription(line) {
  return escapeHtml(line.itemName || line.description || "");
}

function collectHsCodeLines(items) {
  const byCode = new Map();
  for (const line of items || []) {
    const code = String(line.hsCode || "").trim();
    if (!code) continue;
    if (byCode.has(code)) continue;
    const label = String(line.itemName || line.description || "Product").trim();
    byCode.set(code, label);
  }
  return [...byCode.entries()].map(([code, label]) => ({
    label,
    code,
  }));
}

function deliveryTerms(doc) {
  const inco = String(doc.incoTerm || "").trim();
  const place = String(doc.placeOfDelivery || doc.portOfLoading || "KARACHI").trim();
  if (inco && place) {
    return `${inco}-${place}`.replace(/[\s,]+/g, "-").toUpperCase();
  }
  return (inco || place).toUpperCase();
}

function documentPacking(doc) {
  return String(doc.shipment || doc.packing || "").trim();
}

function formatLineRows(items) {
  return (items || [])
    .map((line, i) => {
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${lineDescription(line)}</td>
        <td class="c">${escapeHtml(lineGrade(line))}</td>
        <td class="r">${formatUsd(line.quantity, { min: 2, max: 2 })}</td>
        <td class="c">${escapeHtml(line.packing || "")}</td>
        <td class="r">${formatUsd(line.unitPrice, { min: 2, max: 5 })}</td>
        <td class="r">${formatUsd(line.lineTotal ?? Number(line.quantity) * Number(line.unitPrice), { min: 2, max: 2 })}</td>
      </tr>`;
    })
    .join("");
}

function totalRow(items, total) {
  const qty = (items || []).reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  return `<tr class="total">
    <td colspan="2"></td>
    <td class="r lbl">Total Kgs</td>
    <td class="r">${formatUsd(qty, { min: 2, max: 2 })}</td>
    <td></td>
    <td class="r lbl">Total USD</td>
    <td class="r">${formatUsd(total, { min: 2, max: 2 })}</td>
  </tr>`;
}

function buildShipper(doc) {
  if (doc.supplierParty?.name) return doc.supplierParty;
  return defaultBillTo();
}

function buildConsignee(doc) {
  return buildBillToParty(doc);
}

function buildNotifyAddress(doc) {
  const notify = doc.shipTo;
  if (notify?.name || notify?.street || notify?.city) return notify;
  return null;
}

/**
 * Export PFI print — Ressichem proforma invoice (sample: RPL/036 layout).
 */
function renderExportPfiHtml(doc) {
  const shipper = buildShipper(doc);
  const consignee = buildConsignee(doc);
  const notify = buildNotifyAddress(doc);
  const invoiceNo = doc.quoteNumber || doc.pfiNumber || "";
  const dateStr = formatPfiDate(doc.documentDate);
  const items = doc.items || [];
  const total = Number(doc.total || doc.subtotal || 0);
  const amountWords = formatUsdAmountWords(doc);
  const hsCodeLines = collectHsCodeLines(items);
  const delivery = deliveryTerms(doc);
  const payment = String(doc.paymentTerms || "").trim();
  const packing = documentPacking(doc);
  const terms = String(doc.termsAndConditions || "").trim();

  const shipperAddr = [
    shipper.street || "Plot # D-83, S.I.T.E, Industrial Area, Manghopir Road",
    [shipper.city || "Karachi", shipper.postalCode || "75530"].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ")
    .toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Proforma Invoice ${escapeHtml(invoiceNo)}</title>
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      margin: 0;
      padding: 0;
    }
    table { border-collapse: collapse; width: 100%; }
    .header { width: 100%; margin-bottom: 8px; }
    .header td { vertical-align: top; }
    .logo-name {
      font-size: 28px;
      font-weight: bold;
      color: #c41e3a;
      letter-spacing: 1px;
      line-height: 1;
    }
    .logo-tag {
      font-size: 10px;
      color: #2d8a4e;
      font-style: italic;
      margin-top: 2px;
    }
    .head-office {
      text-align: right;
      font-size: 10px;
      line-height: 1.45;
    }
    .head-office strong { font-size: 11px; }
    .doc-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      text-decoration: underline;
      margin: 10px 0 12px;
      letter-spacing: 0.5px;
    }
    .info td {
      border: 1px solid #000;
      vertical-align: top;
      padding: 6px 8px;
      font-size: 11px;
      line-height: 1.45;
      width: 50%;
    }
    .info .lbl { font-weight: bold; margin-bottom: 4px; }
    .info .party-name { font-weight: bold; margin-bottom: 2px; }
    .info .meta .k { font-weight: bold; display: block; margin-bottom: 4px; }
    .grid th, .grid td {
      border: 1px solid #000;
      padding: 5px 6px;
      font-size: 11px;
      vertical-align: top;
    }
    .grid th { font-weight: bold; text-align: center; }
    .grid td.r, .grid th.r { text-align: right; }
    .grid td.c, .grid th.c { text-align: center; }
    .grid tr.total td { font-weight: bold; }
    .grid tr.total td.lbl { font-weight: bold; }
    .after { margin-top: 10px; font-size: 11px; line-height: 1.65; }
    .after .k { font-weight: bold; display: inline-block; min-width: 170px; }
    .after .words { font-style: italic; font-weight: bold; }
    .origin {
      margin-top: 28px;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
    }
    .sign {
      margin-top: 36px;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
    }
    .sign-line {
      display: inline-block;
      min-width: 180px;
      margin-top: 48px;
      padding-top: 4px;
      border-top: 1px solid #000;
    }
    .page-footer {
      margin-top: 24px;
      border-top: 1px solid #999;
      padding-top: 8px;
      font-size: 9px;
      line-height: 1.45;
    }
    .page-footer td { width: 33%; vertical-align: top; padding: 0 6px; }
    .page-footer strong { font-size: 9px; }
    .terms { margin-top: 12px; font-size: 10px; white-space: pre-wrap; }
    .r { text-align: right; }
    .c { text-align: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <table class="header">
    <tr>
      <td>
        <div class="logo-name">RESSICHEM</div>
        <div class="logo-tag">adding life and value to your property</div>
      </td>
      <td class="head-office">
        <strong>Head Office</strong><br/>
        D-83, S.I.T.E., Industrial Area, Manghopir Road,<br/>
        Karachi - 75530, Pakistan
      </td>
    </tr>
  </table>

  <div class="doc-title">PROFORMA INVOICE</div>

  <table class="info">
    <tr>
      <td>
        <div class="lbl">Shipper / Exporter</div>
        <div class="party-name">${escapeHtml(shipper.name || "RESSICHEM (PRIVATE) LIMITED")}</div>
        <div>${escapeHtml(shipperAddr)}</div>
        ${shipper.taxId ? `<div>NTN# ${escapeHtml(shipper.taxId)}</div>` : "<div>NTN# 3673887-5</div>"}
      </td>
      <td class="meta">
        <span class="k">Invoice No.</span>
        ${escapeHtml(invoiceNo)}
      </td>
    </tr>
    <tr>
      <td>
        <div class="lbl">Consignee</div>
        ${partyBlockLines(consignee, { uppercase: true })}
      </td>
      <td class="meta">
        <span class="k">Date</span>
        ${escapeHtml(dateStr)}
      </td>
    </tr>
    <tr>
      <td>
        <div class="lbl">Notify address</div>
        ${notify ? partyBlockLines(notify, { uppercase: true }) : "&nbsp;"}
      </td>
      <td>&nbsp;</td>
    </tr>
  </table>

  <table class="grid" style="margin-top:12px">
    <thead>
      <tr>
        <th class="c">Sr. No.</th>
        <th>Description</th>
        <th class="c">GRADE</th>
        <th class="r">Qty (Kgs)</th>
        <th class="c">Packing</th>
        <th class="r">Price (USD)<br/>Per Kg</th>
        <th class="r">Amount (USD)</th>
      </tr>
    </thead>
    <tbody>
      ${formatLineRows(items)}
      ${totalRow(items, total)}
    </tbody>
  </table>

  <div class="after">
    <div><span class="k">Amount in Words (USD):</span> <span class="words">${escapeHtml(amountWords)}</span></div>
    ${hsCodeLines
      .map(
        (row) =>
          `<div><span class="k">HS Code No. ${escapeHtml(row.label)}</span> ${escapeHtml(row.code)}</div>`
      )
      .join("")}
    ${packing ? `<div><span class="k">Packing</span> ${escapeHtml(packing)}</div>` : ""}
    <div><span class="k">Delivery Terms</span> ${escapeHtml(delivery)}</div>
    <div><span class="k">Payment Terms</span> ${escapeHtml(payment)}</div>
  </div>
  ${terms ? `<div class="terms">${escapeHtml(terms).replace(/\n/g, "<br/>")}</div>` : ""}

  <div class="origin">GOODS ARE OF PAKISTAN ORIGIN</div>
  <div class="sign"><div class="sign-line">Ressichem Pvt Ltd</div></div>

  <table class="page-footer">
    <tr>
      <td>
        <strong>UAN:</strong> 021-111-737-742<br/>
        <strong>Mobile:</strong> 0321-2431666<br/>
        <strong>Email:</strong> info@ressichem.com<br/>
        <strong>Website:</strong> www.ressichem.com
      </td>
      <td>
        <strong>HUB FACTORY</strong><br/>
        Plot # 19,20,21,22,23, Phase # 2, Marble City,<br/>
        Gaddani Road, Hub, Balochistan, Pakistan
      </td>
      <td>
        <strong>LAHORE OFFICE</strong><br/>
        47-A, 2nd Floor, Sector XX,<br/>
        DHA Phase III, Lahore, Pakistan
      </td>
    </tr>
  </table>

  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

module.exports = { renderExportPfiHtml, formatPfiDate };
