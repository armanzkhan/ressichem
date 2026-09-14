const { defaultBillTo, supplierToParty } = require("../utils/procurementDefaults");

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPoDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** PO-2026-00477 or PO477/2026 → PO0477/2026 */
function formatPoNumber(poNumber) {
  const raw = String(poNumber || "").trim();
  const seqYear = raw.match(/^PO-(\d{4})-0*(\d+)$/i);
  if (seqYear) return `PO${String(seqYear[2]).padStart(4, "0")}/${seqYear[1]}`;
  const short = raw.match(/^PO(\d+)\/(\d{4})$/i);
  if (short) return `PO${String(short[1]).padStart(4, "0")}/${short[2]}`;
  return raw;
}

function formatPoAmount(n, { min = 2, max = 5 } = {}) {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function formatAmountInWordsDisplay(text) {
  return String(text || "")
    .replace(/\s+(PKR|USD)$/i, "")
    .trim();
}

function buildSupplierParty(doc) {
  if (doc.supplierParty?.name) return doc.supplierParty;
  if (doc.supplier && typeof doc.supplier === "object") return supplierToParty(doc.supplier);
  return supplierToParty(null);
}

function buildBillToParty(doc) {
  if (doc.billTo?.name) return doc.billTo;
  return defaultBillTo();
}

/** Left column — SUPPLIER/SHIPPER */
function supplierColumnHtml(party, rawSupplier) {
  const s = rawSupplier && typeof rawSupplier === "object" ? rawSupplier : {};
  const lines = [];
  if (party.name) lines.push(`<div class="co-name">${escapeHtml(party.name)}</div>`);

  const street = party.street || s.address || "";
  if (street) lines.push(`<div>${escapeHtml(street)}</div>`);

  const cityLine = [party.city, party.postalCode].filter(Boolean).join(", ");
  const country = party.country || s.country || "";
  if (cityLine) {
    lines.push(`<div>${escapeHtml(cityLine)}</div>`);
  } else if (country) {
    lines.push(`<div>${escapeHtml(country)}</div>`);
  }

  const phoneNum = s.mobile || s.phone || party.phone || "";
  if (phoneNum) {
    const dial = String(s.phoneDialCode || "").trim();
    const tel = dial ? `${dial} ${String(phoneNum).trim()}`.trim() : String(phoneNum).trim();
    lines.push(`<div>TEL: ${escapeHtml(tel)}</div>`);
  }

  lines.push(`<div>NTN :${escapeHtml(party.taxId || s.taxId || "")}</div>`);
  lines.push(`<div>STRN :${escapeHtml(party.strn || s.strn || "")}</div>`);
  if (s.incomeTaxExemption) {
    lines.push(`<div>Income Tax Exemption :${escapeHtml(s.incomeTaxExemption)}</div>`);
  }
  if (s.srb) {
    lines.push(`<div>SRB :${escapeHtml(s.srb)}</div>`);
  }

  return lines.join("") || "&nbsp;";
}

/** Right column — BILL TO/DELIVER TO/SHIP TO (Ressichem) */
function billToColumnHtml(party) {
  const lines = [];
  if (party.name) lines.push(`<div class="co-name">${escapeHtml(party.name)}</div>`);

  const street = party.street || "";
  const city = party.city || "";
  if (street || city) {
    const addr =
      street && city && !street.includes(city) ? `${street}, ${city}.` : `${street || city}.`;
    lines.push(`<div>${escapeHtml(addr)}</div>`);
  }

  if (party.taxId) lines.push(`<div>NTN :${escapeHtml(party.taxId)}</div>`);
  if (party.strn) lines.push(`<div>STRN :${escapeHtml(party.strn)}</div>`);
  if (party.phone) lines.push(`<div>Phone:${escapeHtml(party.phone)}</div>`);

  return lines.join("") || "&nbsp;";
}

function poPrintStyles() {
  return `
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    html, body {
      height: 100%;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .sheet {
      min-height: calc(297mm - 28mm);
      display: flex;
      flex-direction: column;
    }
    .sheet-body {
      flex: 1 1 auto;
    }
    .sheet-footer {
      margin-top: auto;
      padding-top: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table { border-collapse: collapse; }
    .w100 { width: 100%; }
    .dates {
      width: 100%;
      margin: 0 0 16px;
    }
    .dates td { font-size: 12px; padding: 0 0 4px; vertical-align: top; font-weight: bold; }
    .title {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      margin: 4px 0 14px;
    }
    .parties { width: 100%; margin-bottom: 14px; }
    .parties > tbody > tr > td {
      width: 50%;
      vertical-align: top;
      padding: 0 10px 0 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .parties > tbody > tr > td + td { padding: 0 0 0 10px; }
    .co-name { font-weight: bold; margin-bottom: 4px; }
    .party-tags td {
      padding: 0 0 8px;
      font-weight: bold;
      font-size: 11px;
      text-align: left;
      border-bottom: 1px solid #000;
      vertical-align: bottom;
    }
    .party-body td {
      padding-top: 12px;
    }
    .pay-line { margin: 12px 0 4px; font-size: 11px; }
    .pr-line { margin: 0 0 12px; font-size: 11px; }
    .grid {
      width: 100%;
      border: 1px solid #000;
    }
    .grid th, .grid td {
      border: 1px solid #000;
      padding: 4px 5px;
      font-size: 11px;
      vertical-align: top;
    }
    .grid th { font-weight: bold; text-align: center; }
    .grid td.r, .grid th.r { text-align: right; }
    .grid td.c, .grid th.c { text-align: center; }
    .grid tr.sum td { font-weight: normal; }
    .grid tr.sum td.lbl { font-weight: bold; }
    .amount-words {
      margin: 8px 0 4px;
      font-size: 11px;
      line-height: 1.45;
      font-weight: bold;
    }
    .after-table { margin-top: 6px; font-size: 11px; line-height: 1.55; }
    .terms {
      margin-top: 10px;
      font-size: 11px;
      line-height: 1.55;
      page-break-inside: avoid;
    }
    .terms-h { font-weight: bold; margin-bottom: 10px; }
    .terms-body { margin-bottom: 6px; white-space: pre-wrap; }
    .signs { width: 100%; margin-top: 28px; }
    .signs td { width: 50%; vertical-align: bottom; text-align: center; font-size: 11px; }
    .sign-line {
      display: inline-block;
      min-width: 150px;
      margin-top: 50px;
      padding-top: 6px;
      border-top: 1px solid #000;
      font-weight: bold;
    }
    .r { text-align: right; }
    @media print {
      html, body { height: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet {
        min-height: calc(297mm - 28mm);
      }
      .sheet-footer {
        margin-top: auto;
      }
    }`;
}

function poPrintHeader(dateStr, poNo) {
  return `
  <div class="title">Purchase Order</div>
  <table class="w100 dates">
    <tr>
      <td><strong>Purchase Order No. ${escapeHtml(poNo)}</strong></td>
      <td class="r">Date: ${escapeHtml(dateStr)}</td>
    </tr>
  </table>`;
}

function poPrintParties(supplierParty, billTo, rawSupplier) {
  return `
  <table class="parties">
    <tr class="party-tags">
      <td>SUPPLIER/SHIPPER</td>
      <td>BILL TO/DELIVER TO/SHIP TO</td>
    </tr>
    <tr class="party-body">
      <td>${supplierColumnHtml(supplierParty, rawSupplier)}</td>
      <td>${billToColumnHtml(billTo)}</td>
    </tr>
  </table>`;
}

function poPrintAmountInWords(amountWords) {
  return `<div class="amount-words">Amount In Words: ${escapeHtml(amountWords || "")}</div>`;
}

function poPrintFooterBlock(doc, _amountWords, deliveryTerm) {
  const termsBody = String(doc.termsAndConditions || "").trim();
  const termsContent = termsBody
    ? `<div class="terms-body">${escapeHtml(termsBody).replace(/\n/g, "<br/>")}</div>`
    : "";

  return `
  <div class="sheet-footer">
    <div class="terms">
      <div class="terms-h">Term &amp; Conditions</div>
      ${termsContent}
      <div class="after-table">
        <div>Delivery Term: ${escapeHtml(deliveryTerm)}</div>
        <div>Sale Tax: ${escapeHtml(doc.saleTax || "")}</div>
        <div>Shipment: ${escapeHtml(doc.shipment || "")}</div>
        <div>Loading Port: ${escapeHtml(doc.loadingPort || doc.portOfLoading || "")}</div>
      </div>
    </div>

    <table class="signs">
      <tr>
        <td><div class="sign-line">For Supplier</div></td>
        <td><div class="sign-line">For Ressichem Pvt.Ltd</div></td>
      </tr>
    </table>
  </div>`;
}

module.exports = {
  escapeHtml,
  formatPoDate,
  formatPoNumber,
  formatPoAmount,
  formatAmountInWordsDisplay,
  buildSupplierParty,
  buildBillToParty,
  supplierColumnHtml,
  billToColumnHtml,
  poPrintStyles,
  poPrintHeader,
  poPrintParties,
  poPrintAmountInWords,
  poPrintFooterBlock,
};
