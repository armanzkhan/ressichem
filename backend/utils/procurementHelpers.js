const { amountInWords } = require("./amountInWords");

const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "JPY",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "INR",
  "PKR",
  "BDT",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
  "HKD",
  "KRW",
  "TWD",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "TRY",
  "ZAR",
  "MXN",
  "BRL",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "EGP",
  "NGN",
  "KES",
  "RUB",
];

function getCompanyId(req, fallback = "RESSICHEM") {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || fallback;
}

/** Normalize supplier name for duplicate detection (trim, collapse spaces, case-insensitive). */
function normalizeSupplierName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/** Build map of normalized name -> supplier doc (first wins if duplicates already exist). */
function indexSuppliersByName(suppliers) {
  const map = new Map();
  for (const s of suppliers) {
    const key = normalizeSupplierName(s.name);
    if (key && !map.has(key)) map.set(key, s);
  }
  return map;
}

async function findActiveSupplierByName(SupplierModel, company_id, name, excludeId = null) {
  const key = normalizeSupplierName(name);
  if (!key) return null;
  const rows = await SupplierModel.find({ company_id, isActive: true })
    .select("_id name supplierCode")
    .lean();
  const hit = rows.find(
    (s) =>
      normalizeSupplierName(s.name) === key &&
      (!excludeId || String(s._id) !== String(excludeId))
  );
  return hit || null;
}

async function nextDocumentNumber(Model, company_id, prefix) {
  const year = new Date().getFullYear();
  const fieldByPrefix = {
    PFI: "pfiNumber",
    PO: "poNumber",
    PR: "requisitionNumber",
    SUP: "supplierCode",
    ITM: "itemCode",
    CST: "costingNumber",
    GRN: "grnNumber",
    SINV: "invoiceNumber",
    PAY: "paymentNumber",
  };
  const field = fieldByPrefix[prefix];
  if (!field) {
    const count = await Model.countDocuments({ company_id });
    return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
  }

  const escape = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWith = `${prefix}-${year}-`;
  // Prefer lexicographic max on zero-padded numbers (works with padded 5-digit seq)
  const latest = await Model.findOne({
    company_id,
    [field]: new RegExp(`^${escape}-${year}-\\d+$`),
  })
    .sort({ [field]: -1 })
    .select({ [field]: 1 })
    .lean();

  let maxSeq = 0;
  if (latest?.[field]) {
    const match = String(latest[field]).match(new RegExp(`^${escape}-${year}-(\\d+)$`));
    if (match) maxSeq = Number(match[1]) || 0;
  } else {
    // Fallback scan if sort/regex findOne missed (legacy formats)
    const rows = await Model.find({ company_id, [field]: { $regex: `^${escape}-` } })
      .select({ [field]: 1 })
      .lean();
    for (const row of rows) {
      const value = String(row[field] || "");
      if (!value.startsWith(startsWith)) continue;
      const seq = Number(value.slice(startsWith.length));
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  return `${prefix}-${year}-${String(maxSeq + 1).padStart(5, "0")}`;
}

/** Create a doc with an auto number; retries if another insert took the same sequence. */
async function createWithDocumentNumber(Model, company_id, prefix, buildDoc, attempts = 8) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const documentNumber = await nextDocumentNumber(Model, company_id, prefix);
    try {
      return await Model.create(buildDoc(documentNumber));
    } catch (err) {
      const isDup = err && (err.code === 11000 || /E11000|duplicate key/i.test(String(err.message || "")));
      if (!isDup) throw err;
      lastErr = err;
    }
  }
  const detail = lastErr?.keyValue ? JSON.stringify(lastErr.keyValue) : lastErr?.message;
  throw new Error(`Could not allocate a unique ${prefix} number after ${attempts} attempts. ${detail || ""}`.trim());
}

/** Auto supplier code e.g. SUP-2026-00001 */
async function nextSupplierCode(Model, company_id) {
  return nextDocumentNumber(Model, company_id, "SUP");
}

/** Auto item code e.g. ITM-2026-00001 */
async function nextItemCode(Model, company_id) {
  return nextDocumentNumber(Model, company_id, "ITM");
}

/** Strip empty strings so Mongoose does not cast "" to ObjectId on line refs */
function sanitizeLineItem(line = {}) {
  const out = { ...line };
  if (!out.item) delete out.item;
  if (!out.supplier) delete out.supplier;
  return out;
}

function sanitizeLineItems(items = []) {
  return (items || []).map(sanitizeLineItem);
}

function computeLineTotals(items = [], exchangeRate = 1) {
  const normalized = (items || []).map((line) => {
    const cleaned = sanitizeLineItem(line);
    const qty = Number(cleaned.quantity) || 0;
    const price = Number(cleaned.unitPrice) || 0;
    const rate = Number(exchangeRate) || 1;
    const lineTotal = Math.round(qty * price * rate * 100) / 100;
    return { ...cleaned, quantity: qty, unitPrice: price, lineTotal };
  });
  const subtotal = normalized.reduce((sum, l) => sum + l.lineTotal, 0);
  return { items: normalized, subtotal: Math.round(subtotal * 100) / 100 };
}

function buildDocumentTotals(body, items, subtotal) {
  const taxAmount = Number(body.taxAmount) || 0;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const currency = body.currency || "USD";
  const localPurchase = body.purchaseType === "local";
  const amountWords = body.amountInWords || amountInWords(total, currency, { localPurchase });
  return { taxAmount, total, amountInWords: amountWords };
}

/** Copy commercial fields from PFI to PO on conversion */
function commercialFieldsFromDoc(doc) {
  if (!doc) return {};
  const keys = [
    "documentDate",
    "quoteNumber",
    "customerNumber",
    "referencePoNumber",
    "referencePoDate",
    "orderedBy",
    "bookedBy",
    "paymentTerms",
    "incoTerm",
    "portOfLoading",
    "placeOfDelivery",
    "loadingPort",
    "shipment",
    "saleTax",
    "validFrom",
    "validUntil",
    "billTo",
    "shipTo",
    "supplierParty",
    "supplierBanking",
    "amountInWords",
    "termsAndConditions",
    "prNumber",
    "purchaseType",
    "currency",
    "exchangeRate",
    "items",
    "subtotal",
    "taxAmount",
    "total",
  ];
  const out = {};
  keys.forEach((k) => {
    if (doc[k] !== undefined) out[k] = doc[k];
  });
  return out;
}

module.exports = {
  SUPPORTED_CURRENCIES,
  getCompanyId,
  nextDocumentNumber,
  createWithDocumentNumber,
  nextSupplierCode,
  nextItemCode,
  sanitizeLineItem,
  sanitizeLineItems,
  computeLineTotals,
  buildDocumentTotals,
  commercialFieldsFromDoc,
  amountInWords,
  normalizeSupplierName,
  indexSuppliersByName,
  findActiveSupplierByName,
};
