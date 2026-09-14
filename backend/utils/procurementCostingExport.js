const { buildSpreadsheetBuffer } = require("./procurementSpreadsheet");

const EMPTY_ROW = {
  "Costing #": "",
  Scope: "",
  Status: "",
  Type: "",
  "Document Date": "",
  "HS Code": "",
  "Bond CI Date": "",
  Product: "",
  "Product Detail": "",
  Currency: "",
  "Exchange Rate": "",
  "Qty Ex-Bond": "",
  "@": "",
  Amount: "",
  Insurance: "",
  "Landing chg %": "",
  "Landing USD": "",
  "Landing PKR": "",
  "Amount (PKR)": "",
  "CD %": "",
  CD: "",
  "Add CD %": "",
  "Add CD": "",
  "AD S/Tax %": "",
  "AD S/Tax": "",
  "Sales Tax %": "",
  "Sales Tax": "",
  "I/Tax %": "",
  "I/Tax": "",
  "Total Duties": "",
  WHSC: "",
  "Duties/Bond": "",
  "Agent Bill": "",
  "Insurance PKR": "",
  "Bank Comm": "",
  "G-Total": "",
  "Price incl all Taxes": "",
  "Price without Sales Tax": "",
  Notes: "",
};

function n(v, digits) {
  const num = Number(v);
  if (!Number.isFinite(num)) return "";
  if (digits == null) return num;
  return Number(num.toFixed(digits));
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

function scenarioExportRow(doc, scenario, typeLabel) {
  const s = scenario || {};
  const rate = Number(doc.exchangeRate || 1) || 1;
  const landingPkr = Number(s.landingUsd || 0) * rate;

  return {
    "Costing #": doc.costingNumber || "",
    Scope: doc.tradeScope || "",
    Status: doc.status || "",
    Type: typeLabel,
    "Document Date": fmtDate(doc.documentDate),
    "HS Code": doc.hsCode || "",
    "Bond CI Date": doc.bondCiDate || doc.hsCode || "",
    Product: doc.product || "",
    "Product Detail": doc.productDetail || "",
    Currency: doc.currency || "",
    "Exchange Rate": n(doc.exchangeRate, 4),
    "Qty Ex-Bond": n(doc.qtyExBond),
    "@": n(s.unitPrice, 4),
    Amount: n(s.amountUsd, 2),
    Insurance: n(s.insuranceUsd, 2),
    "Landing chg %": n(
      s.landingPct ?? (typeLabel === "Tax purpose" ? doc.taxPurposeLandingPct : doc.inclusiveLandingPct),
      2
    ),
    "Landing USD": n(s.landingUsd, 2),
    "Landing PKR": n(landingPkr, 0),
    "Amount (PKR)": n(s.amountPkr, 0),
    "CD %": n(doc.cdPct, 2),
    CD: n(s.cd, 0),
    "Add CD %": n(doc.addCdPct, 2),
    "Add CD": n(s.addCd, 0),
    "AD S/Tax %": n(doc.adSalesTaxPct, 2),
    "AD S/Tax": n(s.adSalesTax, 0),
    "Sales Tax %": n(doc.salesTaxPct, 2),
    "Sales Tax": n(s.salesTax, 0),
    "I/Tax %": n(doc.incomeTaxPct, 2),
    "I/Tax": n(s.incomeTax, 0),
    "Total Duties": n(s.totalDuties, 0),
    WHSC: n(doc.whsc, 0),
    "Duties/Bond": n(doc.dutiesBond, 0),
    "Agent Bill": n(doc.agentBill, 0),
    "Insurance PKR": n(doc.insurancePkr, 0),
    "Bank Comm": n(doc.bankComm, 0),
    "G-Total": n(s.gTotal, 0),
    "Price incl all Taxes": n(s.priceInclAllTaxes, 4),
    "Price without Sales Tax": n(s.priceWithoutSalesTax, 4),
    Notes: doc.notes || "",
  };
}

function costingDocsToRows(docs) {
  const rows = [];
  for (const doc of docs || []) {
    rows.push(scenarioExportRow(doc, doc.taxPurpose, "Tax purpose"));
    rows.push(scenarioExportRow(doc, doc.allInclusive, "All inclusive"));
  }
  return rows;
}

function buildCostingExportBuffer(docs, format = "xlsx") {
  const rows = costingDocsToRows(docs);
  return buildSpreadsheetBuffer(rows.length ? rows : [EMPTY_ROW], "Costing", format === "csv" ? "csv" : "xlsx");
}

module.exports = {
  costingDocsToRows,
  buildCostingExportBuffer,
};
