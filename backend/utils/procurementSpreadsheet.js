const XLSX = require("xlsx");

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Parse lead time from "14", 14, "15 days", "30 Days", etc. */
function parseLeadTimeDays(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  const s = String(value).trim();
  if (!s) return 0;
  const direct = Number(s);
  if (Number.isFinite(direct)) return Math.max(0, Math.round(direct));
  const match = s.match(/(\d+(?:\.\d+)?)/);
  if (match) return Math.max(0, Math.round(Number(match[1])));
  return 0;
}

function parseSpreadsheetBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return raw.map((row, index) => {
    const normalized = { __row: index + 2 };
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeKey(key)] = cellValue(value);
    }
    return normalized;
  });
}

function buildSpreadsheetBuffer(rows, sheetName = "Sheet1", format = "xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return Buffer.from(csv, "utf8");
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

const TEMPLATES = {
  suppliers: {
    filename: "procurement-suppliers-template",
    columns: [
      "name",
      "country",
      "company_name",
      "contact_name",
      "email",
      "mobile",
      "phone",
      "street",
      "city",
      "address",
      "default_currency",
      "payment_terms",
      "lead_time_days",
      "inco_term",
      "tax_id",
      "strn",
      "income_tax_exemption",
      "srb",
      "notes",
    ],
    sample: {
      name: "ABC Chemicals",
      country: "Pakistan",
      company_name: "ABC Chemicals (Pvt) Ltd",
      contact_name: "Ali Khan",
      email: "ali@abc.com",
      mobile: "03001234567",
      phone: "",
      street: "Industrial Area",
      city: "Karachi",
      address: "",
      default_currency: "PKR",
      payment_terms: "30 days",
      lead_time_days: "14",
      inco_term: "",
      tax_id: "1234567-8",
      strn: "STRN-001",
      income_tax_exemption: "",
      srb: "3%",
      notes: "",
    },
  },
  items: {
    filename: "procurement-items-template",
    columns: [
      "name",
      "unit",
      "category",
      "hs_code",
      "trade_scope",
      "description",
      "preferred_supplier_code",
    ],
    sample: {
      name: "Portland Cement",
      unit: "MT",
      category: "Raw material",
      hs_code: "252329",
      trade_scope: "local",
      description: "OPC 53 grade",
      preferred_supplier_code: "SUP-2026-00001",
    },
  },
  requisitions: {
    filename: "procurement-requisitions-template",
    columns: ["title", "item_code", "quantity", "unit", "description", "purchase_type"],
    sample: {
      title: "Production - June",
      item_code: "ITM-2026-00001",
      quantity: "100",
      unit: "KG",
      description: "Monthly stock",
      purchase_type: "local",
    },
  },
  "purchase-orders": {
    filename: "procurement-purchase-orders-template",
    columns: [
      "po_group",
      "supplier_code",
      "purchase_type",
      "currency",
      "document_date",
      "payment_terms",
      "place_of_delivery",
      "sale_tax",
      "pr_number",
      "item_code",
      "item_name",
      "quantity",
      "unit_price",
      "unit",
      "description",
    ],
    sample: {
      po_group: "PO-IMPORT-001",
      supplier_code: "SUP-2026-00001",
      purchase_type: "foreign",
      currency: "USD",
      document_date: "2026-06-08",
      payment_terms: "LC at sight",
      place_of_delivery: "Karachi",
      sale_tax: "",
      pr_number: "PR-2026-00001",
      item_code: "ITM-2026-00001",
      item_name: "",
      quantity: "50",
      unit_price: "12.5",
      unit: "MT",
      description: "Cement bags",
    },
  },
};

function getTemplate(type) {
  return TEMPLATES[type] || null;
}

function buildTemplateBuffer(type, format = "xlsx") {
  const template = getTemplate(type);
  if (!template) return null;
  const row = {};
  for (const col of template.columns) {
    row[col] = template.sample[col] ?? "";
  }
  return buildSpreadsheetBuffer([row], "Template", format);
}

module.exports = {
  parseSpreadsheetBuffer,
  buildSpreadsheetBuffer,
  buildTemplateBuffer,
  getTemplate,
  normalizeKey,
  parseLeadTimeDays,
};
