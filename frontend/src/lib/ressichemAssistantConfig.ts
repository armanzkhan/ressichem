import type { AssistantMode } from "./assistantContext";

export type AssistantUiConfig = {
  title: string;
  subtitle: string;
  bannerTitle: string;
  bannerSubtitle: string;
  welcomeMessage: string;
  quickPrompts: string[];
  placeholder: string;
  emptyHint: string;
};

const GUEST_WELCOME = `Welcome to Ressichem Private Limited — adding life and value to your property.

We manufacture construction chemicals, dry mortars, epoxy systems, and building solutions from Pakistan.

Ask me about our products, offices, contact details, or how to sign in to QC, Procurement, or Customer portals.`;

export const ASSISTANT_UI: Record<AssistantMode, AssistantUiConfig> = {
  guest: {
    title: "Ressichem AI",
    subtitle: "Company information & portal guide",
    bannerTitle: "Welcome to Ressichem",
    bannerSubtitle: "Learn about our products, locations, and how to access our systems.",
    welcomeMessage: GUEST_WELCOME,
    quickPrompts: [
      "What products does Ressichem make?",
      "Contact details",
      "Office locations",
      "How do I access QC or Procurement?",
    ],
    placeholder: "Ask about Ressichem…",
    emptyHint: "Ask about products, contact info, or which portal to use.",
  },
  main: {
    title: "Ressichem AI Assistant",
    subtitle: "Dashboard — orders, products & navigation",
    bannerTitle: "Dashboard Assistant",
    bannerSubtitle: "Help with orders, products, customers, invoices, and modules.",
    welcomeMessage:
      "You're signed in to the Ressichem dashboard. I can guide you on orders, products, customers, and where to find QC or Procurement.",
    quickPrompts: [
      "How do I create an order?",
      "Where are products managed?",
      "Open QC portal",
      "Procurement help",
    ],
    placeholder: "Ask about the dashboard…",
    emptyHint: "Try: \"How do I create an order?\" or \"Where is the product catalog?\"",
  },
  customer: {
    title: "Ressichem Customer Assistant",
    subtitle: "Orders & products",
    bannerTitle: "Customer Portal Assistant",
    bannerSubtitle: "Help placing orders and tracking your account.",
    welcomeMessage:
      "Welcome! I can help you find products, place orders, and understand order status in the customer portal.",
    quickPrompts: ["How do I place an order?", "Track my orders", "Browse products", "Contact Ressichem"],
    placeholder: "Ask about your orders…",
    emptyHint: "Try: \"How do I place an order?\"",
  },
  qc: {
    title: "Ressichem QC Assistant",
    subtitle: "Quality control & R&D",
    bannerTitle: "AI Assistant (QC / R&D)",
    bannerSubtitle: "Batches, resin/hardener QC, trials, raw materials & test results.",
    welcomeMessage:
      "Hi! I'm your QC assistant. Ask about resin or hardener batches, R&D trials, QC results, raw materials, or batch trends.",
    quickPrompts: [
      "Summarize recent resin batches",
      "Any hardener deviations?",
      "Show R&D trial highlights",
      "Suggest alternative raw materials",
    ],
    placeholder: "Ask about QC data…",
    emptyHint: 'Example: "Any recent out-of-spec batches?" or "Suggest alternatives for epoxy resin".',
  },
  procurement: {
    title: "Ressichem Procurement Assistant",
    subtitle: "Suppliers, PO, PFI & requisitions",
    bannerTitle: "Procurement Assistant",
    bannerSubtitle: "Local & import purchasing, suppliers, PO, PFI, and export.",
    welcomeMessage:
      "Hello! I can help with suppliers, items, purchase requisitions, purchase orders, PFI, and export documents.",
    quickPrompts: [
      "How do I create a local PO?",
      "What is import PFI received?",
      "Local vs import suppliers",
      "Export shipment documents",
    ],
    placeholder: "Ask about procurement…",
    emptyHint: 'Try: "How do I create a local PO?" or "Explain import PFI".',
  },
};

export function assistantConfig(mode: AssistantMode): AssistantUiConfig {
  return ASSISTANT_UI[mode] ?? ASSISTANT_UI.guest;
}
