/** Shared rule-based replies for Ressichem assistants (no external LLM required). */

const COMPANY = {
  name: "Ressichem Private Limited",
  tagline: "adding life and value to your property",
  products: [
    "Dry mix mortar & tile adhesives",
    "Epoxy flooring & coatings",
    "Construction chemicals & waterproofing",
    "Epoxy adhesives and sealants",
  ],
  hq: "Plot # D-83, S.I.T.E, Industrial Area, Manghopir Road, Karachi, Pakistan",
  hub: "Plot # 19–23, Phase 2, Marble City, Gaddani Road, Hub, Balochistan",
  lahore: "47-A, 2nd Floor, Sector XX, DHA Phase III, Lahore",
  uan: "021-111-737-742",
  mobile: "0321-2431666",
  email: "info@ressichem.com",
  website: "www.ressichem.com",
};

function msgLower(message) {
  return String(message || "").toLowerCase();
}

function guestReply(message) {
  const m = msgLower(message);
  const greeting = /^(hi|hello|hey|good (morning|afternoon|evening)|salam|assalam)\b/.test(m);

  if (greeting || /welcome|who are you|what is ressichem/.test(m)) {
    return `Welcome to **${COMPANY.name}** — ${COMPANY.tagline}.

We manufacture construction chemicals, dry mortars, epoxy systems, and related building solutions from Pakistan.

How can I help you today? Ask about our products, locations, contact details, or which portal to use (QC, Procurement, Customer ordering).`;
  }

  if (/product|mortar|epoxy|tile|waterproof|flooring|chemical/.test(m)) {
    return `**Ressichem products** include:\n${COMPANY.products.map((p) => `• ${p}`).join("\n")}\n\nFor technical datasheets or orders, please sign in to the customer portal or contact our team at ${COMPANY.email}.`;
  }

  if (/contact|phone|email|uan|call|reach/.test(m)) {
    return `**Contact Ressichem**\n• UAN: ${COMPANY.uan}\n• Mobile: ${COMPANY.mobile}\n• Email: ${COMPANY.email}\n• Website: ${COMPANY.website}`;
  }

  if (/location|office|factory|address|karachi|lahore|hub|where/.test(m)) {
    return `**Ressichem locations**\n• Head office / factory: ${COMPANY.hq}\n• Hub factory: ${COMPANY.hub}\n• Lahore office: ${COMPANY.lahore}`;
  }

  if (/qc|quality|lab|batch|test/.test(m)) {
    return `**Quality Control (QC)** at Ressichem covers site testing, R&D trials, formulations, and compliance records. After you sign in to the **QC portal**, I can help with batches, resin/hardener QC, and test results.`;
  }

  if (/procurement|purchase|supplier|po\b|pfi|vendor|import|export/.test(m)) {
    return `**Procurement** manages local & import suppliers, items, purchase requisitions, purchase orders, and proforma invoices (PFI). Sign in to the **Procurement portal** for module-specific help.`;
  }

  if (/login|sign in|account|portal|access/.test(m)) {
    return `Ressichem portals:\n• **Main dashboard** — sales, orders, products (sign in at /auth/sign-in)\n• **QC** — quality & R&D (/qc/site-login or /qc/hub-login)\n• **Procurement** — purchasing (/procurement/login)\n• **Customer** — place orders (/customer-login)\n\nSign in to unlock module-specific assistance.`;
  }

  if (/order|customer|invoice|price/.test(m)) {
    return `For **orders, pricing, and invoices**, customers and sales teams use the main or customer portal after login. I can give general company information here; sign in for live order help.`;
  }

  return `I'm the Ressichem welcome assistant. I can share information about our company, products, locations, and portals.

Try asking: "What products does Ressichem make?", "Contact details", or "How do I access QC or Procurement?"`;
}

function mainAppReply(message) {
  const m = msgLower(message);
  if (/^(hi|hello|hey)\b/.test(m)) {
    return "Hello! You're signed in to the Ressichem dashboard. I can help with orders, products, customers, invoices, and navigation. What do you need?";
  }
  if (/order/.test(m)) return "Use **Orders** to create, track, and update customer orders. Managers can approve and dispatch based on their role permissions.";
  if (/product|catalog|price/.test(m)) return "Open **Products** to browse the catalog, categories, and pricing. Company admins can maintain product records.";
  if (/customer|client/.test(m)) return "**Customers** are managed under the admin area. Customer users can sign in to the customer portal to place orders.";
  if (/invoice/.test(m)) return "**Invoices** are available from the orders workflow. Open an order or invoice list from your role-based menu.";
  if (/qc|quality/.test(m)) return "For QC & laboratory work, open the **QC portal** (/qc/site-login). The QC assistant can summarize batches and test data after you sign in there.";
  if (/procurement|purchase|supplier/.test(m)) return "For purchasing, use the **Procurement portal** (/procurement/login) — local/import POs, PFI, and suppliers.";
  if (/role|permission|access/.test(m)) return "Your menu items depend on your **role and permissions**. Contact your company administrator if a module is missing.";
  return guestReply(message).replace(
    "Sign in to unlock module-specific assistance.",
    "You're already signed in — use the sidebar to open the module you need."
  );
}

function customerReply(message) {
  const m = msgLower(message);
  if (/^(hi|hello|hey)\b/.test(m)) {
    return "Welcome back! I can help you place orders, find products, and understand your order status in the customer portal.";
  }
  if (/order|track|status/.test(m)) return "View **My Orders** to see status, history, and details. Create a new order from the order page if your account has permission.";
  if (/product/.test(m)) return "Browse **Products** to search by category and add items to your order.";
  if (/invoice/.test(m)) return "Invoices linked to your orders appear in your account when issued by Ressichem.";
  return guestReply(message);
}

function procurementReply(message) {
  const m = msgLower(message);
  if (/^(hi|hello|hey)\b/.test(m)) {
    return "Hello! I'm your Procurement assistant. Ask about suppliers, items, requisitions, purchase orders, PFI, or export documents.";
  }
  if (/local/.test(m) && /supplier|po|item/.test(m)) {
    return "**Local procurement** (Pakistan): manage local suppliers, items, PRs, and PKR purchase orders under Procurement → Local.";
  }
  if (/import/.test(m) && /supplier|po|pfi|item/.test(m)) {
    return "**Import procurement**: foreign suppliers, USD POs, received PFI uploads, and import items under Procurement → Import.";
  }
  if (/export/.test(m)) {
    return "**Export**: create export PFI, upload customer documents, and track shipment details under Procurement → Export.";
  }
  if (/supplier|vendor/.test(m)) return "Add and maintain suppliers under **Local** or **Import → Suppliers**. Payment terms and incoterms are scoped to local vs import.";
  if (/item|catalog/.test(m)) return "Maintain the item catalog under **Items** with category, unit, and HS code (import).";
  if (/requisition|\bpr\b/.test(m)) return "Create a **Purchase Requisition (PR)** before converting to a PO when your workflow requires approval.";
  if (/\bpo\b|purchase order/.test(m)) return "**Purchase Orders** can be created for local (PKR) or import (USD) suppliers. Use Print to generate the official PO layout.";
  if (/\bpfi\b|proforma/.test(m)) return "**PFI**: upload received import PFIs, or issue export PFIs to customers. Import received PFIs can be converted to PO.";
  if (/price|currency|exchange/.test(m)) return "Item **prices** support multiple currencies. Check exchange rates on the procurement dashboard tools.";
  if (/user|admin/.test(m)) return "Procurement **admins** manage users and can delete certain uploaded records. Contact your Procurement Admin for access changes.";
  return "I can help with procurement modules: suppliers, items, PR, PO, PFI, and export documents. Try: \"How do I create a local PO?\" or \"What is import PFI received?\"";
}

module.exports = {
  COMPANY,
  guestReply,
  mainAppReply,
  customerReply,
  procurementReply,
};
