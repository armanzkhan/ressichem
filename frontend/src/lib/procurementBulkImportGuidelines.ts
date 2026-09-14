import type { ProcurementImportEntity } from "@/lib/procurementApi";

export type ImportColumnGuide = {
  column: string;
  required?: boolean;
  description: string;
  example?: string;
};

export type ImportExample = {
  title: string;
  description: string;
  rows: string;
};

export type ImportGuidelines = {
  summary: string;
  steps: string[];
  columns: ImportColumnGuide[];
  notes: string[];
  warnings?: string[];
  examples?: ImportExample[];
};

function sectionLabel(section: "local" | "import") {
  return section === "local" ? "Local" : "Import";
}

export function getImportGuidelines(
  entity: ProcurementImportEntity,
  section: "local" | "import"
): ImportGuidelines {
  const scope = sectionLabel(section);

  if (entity === "suppliers") {
    const isLocal = section === "local";
    return {
      summary: `Upload one supplier per row. Records are created in the ${scope} suppliers list. Supplier codes (e.g. SUP-2026-00001) are assigned automatically.`,
      steps: [
        "Download the Excel or CSV template and keep the header row unchanged.",
        "Add one row per supplier. Only name is required; fill other columns as needed.",
        isLocal
          ? "For local suppliers, set country to Pakistan (or leave blank — Pakistan is assumed)."
          : "For import suppliers, country must be outside Pakistan.",
        "Save the file and upload it here. Review any row errors, fix the sheet, and re-import failed rows if needed.",
      ],
      columns: [
        { column: "name", required: true, description: "Short supplier name", example: "ABC Chemicals" },
        {
          column: "country",
          required: isLocal ? false : true,
          description: isLocal ? "Must be Pakistan for local suppliers" : "Non-Pakistan country required",
          example: isLocal ? "Pakistan" : "China",
        },
        { column: "company_name", description: "Registered / legal company name" },
        { column: "contact_name", description: "Primary contact person" },
        { column: "email", description: "Contact email" },
        { column: "mobile", description: "Mobile number" },
        { column: "phone", description: "Landline / alternate phone" },
        { column: "street", description: "Street or industrial area" },
        { column: "city", description: "City" },
        { column: "address", description: "Full address (if not using street/city)" },
        {
          column: "default_currency",
          description: "Default trading currency",
          example: isLocal ? "PKR" : "USD",
        },
        { column: "payment_terms", description: "Standard payment terms", example: "30 days" },
        { column: "lead_time_days", description: "Typical lead time in days", example: "14" },
        { column: "inco_term", description: "Incoterm (import suppliers)", example: "FOB" },
        { column: "tax_id", description: "NTN / tax ID (local suppliers)" },
        { column: "strn", description: "Sales tax registration number" },
        { column: "income_tax_exemption", description: "Income tax exemption status or certificate ref" },
        { column: "srb", description: "SRB rate or status (e.g. 3% or Exempt)" },
        { column: "notes", description: "Internal notes" },
      ],
      notes: [
        "Duplicate supplier names are not allowed. The same name in the file twice is skipped after the first row.",
        "If the supplier name already exists in the system, the row updates that record instead of creating a duplicate.",
        "Column headers are flexible — spaces and capitals are normalized (e.g. Company Name → company_name).",
        "Accepted file types: .xlsx, .xls, .csv (first sheet only).",
      ],
      warnings: isLocal
        ? ["Local import rejects suppliers with a non-Pakistan country."]
        : ["Import section rejects suppliers with Pakistan as country."],
    };
  }

  if (entity === "items") {
    const isLocal = section === "local";
    return {
      summary: `Upload one catalog item per row for the ${scope} items list. Item codes (e.g. ITM-2026-00001) are assigned automatically.`,
      steps: [
        "Download the template and add one row per item.",
        "Enter name (required). Unit defaults to EA if omitted.",
        isLocal
          ? "trade_scope must be local (or leave blank — local is assumed on this page)."
          : "trade_scope must be import (or leave blank — import is assumed on this page).",
        "Use preferred_supplier_code only if the supplier already exists in the system.",
        "Upload the file. Items appear in the catalog immediately after a successful import.",
      ],
      columns: [
        { column: "name", required: true, description: "Item / material name", example: "Portland Cement" },
        { column: "unit", description: "Unit of measure", example: "MT" },
        { column: "category", description: "Item category", example: "Raw material" },
        {
          column: "hs_code",
          description: isLocal ? "HS code (optional for local)" : "HS code (recommended for import items)",
          example: "252329",
        },
        {
          column: "trade_scope",
          description: "local or import — must match this page",
          example: isLocal ? "local" : "import",
        },
        { column: "description", description: "Short description or grade" },
        {
          column: "preferred_supplier_code",
          description: "Existing supplier code (SUP-…); leave blank if none",
          example: "SUP-2026-00001",
        },
      ],
      notes: [
        "Import suppliers and items before requisitions or POs that reference item codes.",
        "preferred_supplier_code must match an active supplier already in the database.",
      ],
      warnings: [
        isLocal
          ? "Rows with trade_scope = import are rejected on the Local items page."
          : "Rows with trade_scope = local are rejected on the Import items page.",
      ],
    };
  }

  if (entity === "requisitions") {
    const isLocal = section === "local";
    return {
      summary: `Create draft purchase requisitions (PR) from line rows. Rows that share the same title are combined into one PR.`,
      steps: [
        "Ensure items already exist in the catalog — each row references an item_code.",
        "Download the template. Use the same title on multiple rows to build one PR with several lines.",
        "Enter quantity as a positive number. Unit can match the catalog or override per line.",
        isLocal
          ? "purchase_type should be local (or leave blank on the Local PR page)."
          : "purchase_type should be foreign or import (or leave blank on the Import PR page).",
        "Upload the file. Each group becomes a draft PR you can edit or submit from the list.",
      ],
      columns: [
        {
          column: "title",
          required: true,
          description: "Groups rows into one PR — repeat the same title for each line",
          example: "Production - June",
        },
        {
          column: "item_code",
          required: true,
          description: "Must match an existing catalog item code",
          example: "ITM-2026-00001",
        },
        { column: "quantity", required: true, description: "Requested quantity (> 0)", example: "100" },
        { column: "unit", description: "Unit of measure", example: "KG" },
        { column: "description", description: "Line note (optional; defaults to item name)" },
        {
          column: "purchase_type",
          description: "local or foreign/import",
          example: isLocal ? "local" : "foreign",
        },
      ],
      notes: [
        "All imported PRs are created in draft status.",
        "PR numbers (PR-2026-…) are generated automatically per group.",
        "You can also use department or pr_group as the group column — they are treated like title.",
      ],
      warnings: [
        "If item_code is not found, that row fails — import items first.",
        "Empty title rows are skipped silently.",
      ],
    };
  }

  // purchase-orders
  const isLocal = section === "local";
  return {
    summary: `Create draft purchase orders (PO) from spreadsheet rows. Use po_group for multi-line POs, or leave it blank to auto-group consecutive rows with the same supplier and PO date.`,
    steps: [
      "Suppliers must already exist (supplier_code). Catalog items are optional — use item_code when linking to the catalog, or item_name/description for free-text lines.",
      "Optional: set the same po_group on all lines of one PO. If po_group is blank, consecutive rows with the same supplier_code and document_date become one PO.",
      "Put header fields (supplier, currency, dates, terms) on the first row of each group; line rows can repeat supplier_code and document_date.",
      "Enter quantity and unit_price for every line. unit_price must be zero or positive.",
      "Upload the file. Each group becomes a draft PO ready to review and issue.",
    ],
    columns: [
      {
        column: "po_group",
        description: "Optional — same label groups rows into one multi-line PO",
        example: "PO-IMPORT-001",
      },
      {
        column: "supplier_code",
        required: true,
        description: "Active supplier code on the first row of each PO",
        example: "SUP-2026-00001",
      },
      {
        column: "purchase_type",
        description: "local or foreign/import",
        example: isLocal ? "local" : "foreign",
      },
      {
        column: "currency",
        description: "PO currency",
        example: isLocal ? "PKR" : "USD",
      },
      { column: "document_date", description: "PO date (YYYY-MM-DD)", example: "2026-06-08" },
      { column: "payment_terms", description: "Payment terms", example: "LC at sight" },
      { column: "place_of_delivery", description: "Delivery location", example: "Karachi" },
      { column: "sale_tax", description: "Sales tax label or rate (local POs)" },
      {
        column: "pr_number",
        description: "Optional link to an existing PR number",
        example: "PR-2026-00001",
      },
      {
        column: "item_code",
        description: "Optional catalog item code — if set, item must already exist",
        example: "ITM-2026-00001",
      },
      {
        column: "item_name",
        description: "Free-text item name when not using item_code",
        example: "Epoxy resin drums",
      },
      { column: "quantity", required: true, description: "Ordered quantity (> 0)", example: "50" },
      { column: "unit_price", required: true, description: "Price per unit", example: "12.5" },
      { column: "unit", description: "Unit of measure", example: "MT" },
      { column: "description", description: "Line description (also used as free-text name if item_name is empty)" },
    ],
    notes: [
      "PO numbers (PO-2026-…) are generated automatically.",
      "pr_number is optional; if provided it must match an existing requisition.",
      "Commercial fields (bill-to, ship-to) are prefilled from the supplier when the PO is created.",
      "Provide either item_code (catalog) or item_name/description (free-text) on each line.",
    ],
    warnings: [
      "Import PO screen: ensure HS codes exist on items or lines before issuing.",
      "Invalid supplier_code fails the whole group. Without po_group, changing supplier_code or document_date starts a new PO.",
    ],
    examples: [
      {
        title: "Example A: one supplier, multiple items (using po_group)",
        description:
          "All three rows share po_group PO-001 and supplier_code SUP-2026-00001. Result: 1 draft PO with 3 line items.",
        rows: `po_group,supplier_code,item_code,item_name,quantity,unit_price,unit
PO-001,SUP-2026-00001,ITM-2026-00001,,10,100,KG
PO-001,SUP-2026-00001,ITM-2026-00002,,20,200,KG
PO-001,SUP-2026-00001,,Epoxy resin drums,5,290.12345,DRUM`,
      },
      {
        title: "Example B: one supplier, multiple items (no po_group)",
        description:
          "Leave po_group blank. Consecutive rows with the same supplier_code and document_date are grouped automatically. A different supplier or PO date starts a separate PO.",
        rows: `supplier_code,document_date,item_code,item_name,quantity,unit_price,unit
SUP-2026-00001,2026-04-01,ITM-2026-00001,,10,100,KG
SUP-2026-00001,2026-04-01,ITM-2026-00002,,20,200,KG
SUP-2026-00001,2026-04-01,,Epoxy resin drums,5,290.12345,DRUM
SUP-2026-00001,2026-04-15,ITM-2026-00010,,7,50,KG
SUP-2026-00002,2026-04-15,ITM-2026-00010,,7,50,KG`,
      },
    ],
  };
}
