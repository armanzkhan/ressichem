const ProcurementSupplier = require("../models/ProcurementSupplier");
const ProcurementItem = require("../models/ProcurementItem");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const PurchaseOrder = require("../models/PurchaseOrder");
const {
  getCompanyId,
  nextSupplierCode,
  nextItemCode,
  nextDocumentNumber,
  computeLineTotals,
  normalizeSupplierName,
  indexSuppliersByName,
} = require("../utils/procurementHelpers");
const { prepareCommercialPayload } = require("../services/procurementDocumentService");
const { parseSpreadsheetBuffer, buildTemplateBuffer, getTemplate, parseLeadTimeDays } = require("../utils/procurementSpreadsheet");

const IMPORT_TYPES = ["suppliers", "items", "requisitions", "purchase-orders"];

const PERMISSION_BY_TYPE = {
  suppliers: ["procurement.vendors.create"],
  items: ["procurement.items.create"],
  requisitions: ["procurement.requisitions.create"],
  "purchase-orders": ["procurement.po.create"],
};

function isLocalCountry(country) {
  const c = (country || "").toLowerCase().trim();
  return !c || c.includes("pakistan") || c === "pk";
}

function purchaseTypeForSection(section) {
  return section === "local" ? "local" : "foreign";
}

function tradeScopeForSection(section) {
  return section === "local" ? "local" : "import";
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function rowRef(row) {
  return row.__row || "?";
}

function supplierPayloadFromRow(row, section) {
  const name = row.name || row.supplier_name;
  if (!name) throw new Error("name is required");

  let country = row.country || "";
  if (!country && section === "local") country = "Pakistan";
  if (section === "import" && isLocalCountry(country)) {
    throw new Error("import suppliers must have a non-Pakistan country");
  }
  if (section === "local" && country && !isLocalCountry(country)) {
    throw new Error("local suppliers must use Pakistan as country");
  }

  return {
    name,
    companyName: row.company_name || "",
    contactName: row.contact_name || "",
    email: row.email || "",
    mobile: row.mobile || "",
    phone: row.phone || "",
    street: row.street || "",
    city: row.city || "",
    address: row.address || "",
    country,
    defaultCurrency: row.default_currency || (section === "local" ? "PKR" : "USD"),
    paymentTerms: row.payment_terms || "",
    leadTimeDays: parseLeadTimeDays(row.lead_time_days ?? row.lead_time),
    incoTerm: row.inco_term || "",
    taxId: row.tax_id || "",
    strn: row.strn || "",
    incomeTaxExemption: row.income_tax_exemption || "",
    srb: row.srb || "",
    notes: row.notes || "",
  };
}

async function importSuppliers(rows, company_id, section, userId) {
  const created = [];
  const updated = [];
  const skipped = [];
  const failed = [];
  const seenInFile = new Set();

  const existingRows = await ProcurementSupplier.find({ company_id, isActive: true })
    .select("_id name supplierCode")
    .lean();
  const byNameKey = indexSuppliersByName(existingRows);

  for (const row of rows) {
    if (!row.name && !row.supplier_name) continue;
    try {
      const payload = supplierPayloadFromRow(row, section);
      const nameKey = normalizeSupplierName(payload.name);
      if (!nameKey) throw new Error("name is required");

      if (seenInFile.has(nameKey)) {
        skipped.push({
          row: rowRef(row),
          message: `Duplicate row in file (already processed): ${payload.name}`,
          supplierCode: byNameKey.get(nameKey)?.supplierCode,
        });
        continue;
      }
      seenInFile.add(nameKey);

      const existing = byNameKey.get(nameKey);
      if (existing) {
        const doc = await ProcurementSupplier.findOneAndUpdate(
          { _id: existing._id, company_id },
          { ...payload, updatedBy: userId },
          { new: true, runValidators: true }
        );
        updated.push({
          row: rowRef(row),
          id: doc._id,
          supplierCode: doc.supplierCode,
          name: doc.name,
          action: "updated",
        });
        continue;
      }

      const supplierCode = await nextSupplierCode(ProcurementSupplier, company_id);
      const doc = await ProcurementSupplier.create({
        ...payload,
        supplierCode,
        company_id,
        createdBy: userId,
      });
      byNameKey.set(nameKey, { _id: doc._id, supplierCode: doc.supplierCode, name: doc.name });
      created.push({ row: rowRef(row), id: doc._id, supplierCode: doc.supplierCode, name: doc.name });
    } catch (err) {
      failed.push({ row: rowRef(row), message: err.message });
    }
  }

  return {
    createdCount: created.length,
    updatedCount: updated.length,
    skippedCount: skipped.length,
    created,
    updated,
    skipped,
    failed,
  };
}

async function importItems(rows, company_id, section, userId) {
  const created = [];
  const failed = [];
  const defaultScope = tradeScopeForSection(section);

  for (const row of rows) {
    if (!row.name && !row.item_name) continue;
    const name = row.name || row.item_name;
    try {
      let preferredSupplier;
      const supplierCode = row.preferred_supplier_code || row.supplier_code;
      if (supplierCode) {
        preferredSupplier = await ProcurementSupplier.findOne({ company_id, supplierCode, isActive: true });
        if (!preferredSupplier) throw new Error(`supplier not found: ${supplierCode}`);
      }

      let tradeScope = (row.trade_scope || defaultScope).toLowerCase();
      if (!["local", "import"].includes(tradeScope)) {
        throw new Error("trade_scope must be local or import");
      }
      if (section === "local" && tradeScope !== "local") {
        throw new Error("local catalog items must have trade_scope=local");
      }
      if (section === "import" && tradeScope !== "import") {
        throw new Error("import catalog items must have trade_scope=import");
      }

      const itemCode = await nextItemCode(ProcurementItem, company_id);
      const doc = await ProcurementItem.create({
        name,
        description: row.description || "",
        hsCode: row.hs_code || "",
        unit: row.unit || "EA",
        category: row.category || "General",
        tradeScope,
        preferredSupplier: preferredSupplier?._id,
        itemCode,
        company_id,
        createdBy: userId,
      });
      created.push({ row: rowRef(row), id: doc._id, itemCode: doc.itemCode, name: doc.name });
    } catch (err) {
      failed.push({ row: rowRef(row), message: err.message });
    }
  }

  return { createdCount: created.length, created, failed };
}

async function resolveItem(company_id, itemCode) {
  return ProcurementItem.findOne({ company_id, itemCode, isActive: true });
}

async function importRequisitions(rows, company_id, section, userId) {
  const defaultPurchaseType = purchaseTypeForSection(section);
  const groups = new Map();

  for (const row of rows) {
    const groupKey = row.title || row.department || row.pr_group;
    if (!groupKey) continue;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(row);
  }

  const created = [];
  const failed = [];

  for (const [title, groupRows] of groups) {
    const lineErrors = [];
    const items = [];

    for (const row of groupRows) {
      const itemCode = row.item_code;
      const quantity = num(row.quantity);
      if (!itemCode) {
        lineErrors.push({ row: rowRef(row), message: "item_code is required" });
        continue;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        lineErrors.push({ row: rowRef(row), message: "quantity must be a positive number" });
        continue;
      }

      const catalog = await resolveItem(company_id, itemCode);
      if (!catalog) {
        lineErrors.push({ row: rowRef(row), message: `item not found: ${itemCode}` });
        continue;
      }

      let purchaseType = (row.purchase_type || defaultPurchaseType).toLowerCase();
      if (purchaseType === "import") purchaseType = "foreign";
      if (!["local", "foreign"].includes(purchaseType)) {
        lineErrors.push({ row: rowRef(row), message: "purchase_type must be local or foreign/import" });
        continue;
      }

      items.push({
        item: catalog._id,
        itemCode: catalog.itemCode,
        itemName: catalog.name,
        unit: row.unit || catalog.unit || "EA",
        description: row.description || catalog.description || catalog.name,
        quantity,
        unitPrice: 0,
        purchaseType,
      });
    }

    if (lineErrors.length) {
      failed.push(...lineErrors);
      continue;
    }
    if (!items.length) {
      failed.push({ row: "-", message: `No valid lines for requisition "${title}"` });
      continue;
    }

    const purchaseType = items[0].purchaseType || defaultPurchaseType;
    try {
      const requisitionNumber = await nextDocumentNumber(PurchaseRequisition, company_id, "PR");
      const { items: computedItems, subtotal } = computeLineTotals(items, 1);
      const doc = await PurchaseRequisition.create({
        company_id,
        requisitionNumber,
        title,
        purchaseType,
        currency: purchaseType === "local" ? "PKR" : "USD",
        exchangeRate: 1,
        items: computedItems,
        subtotal,
        taxAmount: 0,
        total: subtotal,
        status: "draft",
        requestedBy: userId,
      });
      created.push({
        row: groupRows.map((r) => rowRef(r)).join(", "),
        id: doc._id,
        requisitionNumber: doc.requisitionNumber,
        title: doc.title,
        lineCount: computedItems.length,
      });
    } catch (err) {
      failed.push({ row: groupRows.map((r) => rowRef(r)).join(", "), message: err.message });
    }
  }

  return { createdCount: created.length, created, failed };
}

/**
 * Build PO groups from spreadsheet rows.
 * - Rows with po_group → grouped by that label (multi-line POs)
 * - Rows without po_group → consecutive rows with the same supplier_code AND
 *   document_date are auto-grouped; a change in supplier or PO date starts a new PO.
 *   Blank document_date on a line inherits the date from the current open group.
 */
function buildPurchaseOrderGroups(rows) {
  const groups = new Map();
  let autoIndex = 0;
  let currentMapKey = null;
  let currentSupplier = null;
  let currentDate = null;

  for (const row of rows) {
    const explicit = String(row.po_group || row.group || "").trim();
    if (explicit) {
      currentMapKey = null;
      currentSupplier = null;
      currentDate = null;
      if (!groups.has(explicit)) groups.set(explicit, []);
      groups.get(explicit).push(row);
      continue;
    }

    const supplierCode = String(row.supplier_code || "").trim();
    if (!supplierCode) {
      currentMapKey = null;
      currentSupplier = null;
      currentDate = null;
      const key = `__auto_missing_supplier_${++autoIndex}`;
      groups.set(key, [row]);
      continue;
    }

    const rowDate = String(row.document_date || "").trim();
    const continuingSameSupplier = Boolean(currentMapKey && currentSupplier === supplierCode);
    const date = rowDate || (continuingSameSupplier ? currentDate : "") || "";

    if (continuingSameSupplier && currentDate === date && currentMapKey) {
      groups.get(currentMapKey).push(row);
    } else {
      currentSupplier = supplierCode;
      currentDate = date;
      currentMapKey = `__auto_${++autoIndex}`;
      groups.set(currentMapKey, [row]);
    }
  }

  return groups;
}

async function resolvePoLineItem(company_id, row, header, purchaseType) {
  const itemCode = String(row.item_code || "").trim();
  const itemName = String(row.item_name || row.name || "").trim();
  const description = String(row.description || "").trim();
  const quantity = num(row.quantity);
  const unitPrice = num(row.unit_price);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "quantity must be a positive number" };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: "unit_price must be a number" };
  }

  const currency = row.currency || header.currency || (purchaseType === "local" ? "PKR" : "USD");

  if (itemCode) {
    const catalog = await resolveItem(company_id, itemCode);
    if (!catalog) {
      return { error: `item not found: ${itemCode}` };
    }
    return {
      item: {
        item: catalog._id,
        itemCode: catalog.itemCode,
        itemName: itemName || catalog.name,
        description: description || catalog.description || catalog.name,
        unit: row.unit || catalog.unit || "EA",
        hsCode: row.hs_code || catalog.hsCode || "",
        quantity,
        unitPrice,
        currency,
      },
    };
  }

  // Free-text line (no catalog item_code)
  if (!itemName && !description) {
    return { error: "item_code or item_name/description is required" };
  }

  return {
    item: {
      itemCode: "",
      itemName: itemName || description,
      description: description || itemName,
      unit: row.unit || "EA",
      hsCode: row.hs_code || "",
      quantity,
      unitPrice,
      currency,
    },
  };
}

async function importPurchaseOrders(rows, company_id, section, userId) {
  const defaultPurchaseType = purchaseTypeForSection(section);
  const groups = buildPurchaseOrderGroups(rows);

  const created = [];
  const failed = [];

  for (const [poGroup, groupRows] of groups) {
    const header = groupRows[0];
    const supplierCode = String(header.supplier_code || "").trim();
    if (!supplierCode) {
      failed.push({
        row: rowRef(header),
        message: "supplier_code is required on the first row of each PO (or set po_group with supplier_code)",
      });
      continue;
    }

    const supplier = await ProcurementSupplier.findOne({ company_id, supplierCode, isActive: true });
    if (!supplier) {
      failed.push({ row: rowRef(header), message: `supplier not found: ${supplierCode}` });
      continue;
    }

    let purchaseType = (header.purchase_type || defaultPurchaseType).toLowerCase();
    if (purchaseType === "import") purchaseType = "foreign";
    if (!["local", "foreign"].includes(purchaseType)) {
      failed.push({ row: rowRef(header), message: "purchase_type must be local or foreign/import" });
      continue;
    }

    const lineErrors = [];
    const items = [];

    for (const row of groupRows) {
      const resolved = await resolvePoLineItem(company_id, row, header, purchaseType);
      if (resolved.error) {
        lineErrors.push({ row: rowRef(row), message: resolved.error });
        continue;
      }
      items.push(resolved.item);
    }

    if (lineErrors.length) {
      failed.push(...lineErrors);
      continue;
    }
    if (!items.length) {
      failed.push({
        row: rowRef(header),
        message: `No valid lines for PO group "${String(poGroup).startsWith("__auto_") ? "(auto)" : poGroup}"`,
      });
      continue;
    }

    try {
      let requisition;
      const prNumber = header.pr_number || header.requisition_number;
      if (prNumber) {
        requisition = await PurchaseRequisition.findOne({ company_id, requisitionNumber: prNumber });
      }

      const body = {
        supplier: supplier._id,
        suppliers: [String(supplier._id)],
        purchaseType,
        currency: header.currency || (purchaseType === "local" ? "PKR" : "USD"),
        exchangeRate: 1,
        documentDate: header.document_date || new Date().toISOString().slice(0, 10),
        paymentTerms: header.payment_terms || supplier.paymentTerms || "",
        placeOfDelivery: header.place_of_delivery || "",
        saleTax: header.sale_tax || "",
        prNumber: prNumber || "",
        requisition: requisition?._id,
        status: "draft",
        items,
      };

      const payload = await prepareCommercialPayload(body);
      const poNumber = await nextDocumentNumber(PurchaseOrder, company_id, "PO");
      const doc = await PurchaseOrder.create({
        ...payload,
        company_id,
        poNumber,
        createdBy: userId,
      });

      created.push({
        row: groupRows.map((r) => rowRef(r)).join(", "),
        id: doc._id,
        poNumber: doc.poNumber,
        poGroup: String(poGroup).startsWith("__auto_") ? "" : poGroup,
        lineCount: items.length,
      });
    } catch (err) {
      failed.push({ row: groupRows.map((r) => rowRef(r)).join(", "), message: err.message });
    }
  }

  return { createdCount: created.length, created, failed };
}

exports.IMPORT_TYPES = IMPORT_TYPES;
exports.PERMISSION_BY_TYPE = PERMISSION_BY_TYPE;

exports.downloadTemplate = (req, res) => {
  const type = req.params.type;
  if (!IMPORT_TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid import type" });
  }
  const format = (req.query.format || "xlsx").toLowerCase() === "csv" ? "csv" : "xlsx";
  const template = getTemplate(type);
  const buffer = buildTemplateBuffer(type, format);
  if (!buffer) return res.status(404).json({ success: false, message: "Template not found" });

  const ext = format === "csv" ? "csv" : "xlsx";
  const mime =
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `attachment; filename="${template.filename}.${ext}"`);
  return res.send(buffer);
};

exports.upload = async (req, res) => {
  try {
    const type = req.params.type;
    if (!IMPORT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid import type" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Upload a CSV or Excel file" });
    }

    const section = req.query.section === "local" ? "local" : "import";
    const company_id = getCompanyId(req);
    const userId = req.user?._id;
    const rows = parseSpreadsheetBuffer(req.file.buffer);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Spreadsheet is empty" });
    }

    let result;
    if (type === "suppliers") {
      result = await importSuppliers(rows, company_id, section, userId);
    } else if (type === "items") {
      result = await importItems(rows, company_id, section, userId);
    } else if (type === "requisitions") {
      result = await importRequisitions(rows, company_id, section, userId);
    } else if (type === "purchase-orders") {
      result = await importPurchaseOrders(rows, company_id, section, userId);
    }

    return res.json({
      success: true,
      type,
      section,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount || 0,
      skippedCount: result.skippedCount || 0,
      failedCount: result.failed.length,
      created: result.created,
      updated: result.updated || [],
      skipped: result.skipped || [],
      failed: result.failed,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
