import type { TradeSection } from "./procurementScope";
import type { ProcurementAccessLevel } from "./procurementRoles";

export type SectionStats = {
  suppliers?: number;
  items?: number;
  pfiOpen?: number;
  pfiIssuedOpen?: number;
  pfiReceivedOpen?: number;
  documents?: number;
  shipments?: number;
  requisitions?: {
    draft: number;
    pending: number;
    submitted?: number;
    held?: number;
    rejected?: number;
    approved: number;
    total?: number;
  };
  purchaseOrders?: { draft: number; issued: number; total?: number };
};

export type DashboardStatsBySection = {
  local?: SectionStats;
  import?: SectionStats;
  export?: SectionStats;
};

export type DashboardCard = {
  id: string;
  section: TradeSection;
  title: string;
  value: number;
  href: string;
  emphasis?: "approval" | "draft";
};

function prCardsForSection(
  section: TradeSection,
  stats: SectionStats,
  emphasis: "requester" | "approver"
): DashboardCard[] {
  const prefix = section === "local" ? "Local" : "Import";
  const href = `/procurement/${section}/pr`;

  if (emphasis === "approver") {
    return [
      {
        id: `${section}-pr-pending`,
        section,
        title: `${prefix} PRs awaiting review`,
        value: stats.requisitions?.pending ?? 0,
        href,
        emphasis: "approval",
      },
      {
        id: `${section}-pr-held`,
        section,
        title: `${prefix} PRs on hold`,
        value: stats.requisitions?.held ?? 0,
        href,
        emphasis: "approval",
      },
      {
        id: `${section}-pr-rejected`,
        section,
        title: `${prefix} PRs rejected`,
        value: stats.requisitions?.rejected ?? 0,
        href,
      },
      {
        id: `${section}-pr-approved`,
        section,
        title: `${prefix} PRs approved`,
        value: stats.requisitions?.approved ?? 0,
        href,
      },
    ];
  }

  return [
    {
      id: `${section}-pr-draft`,
      section,
      title: `${prefix} PR drafts`,
      value: stats.requisitions?.draft ?? 0,
      href,
      emphasis: "draft",
    },
    {
      id: `${section}-pr-pending`,
      section,
      title: `${prefix} PRs awaiting approval`,
      value: stats.requisitions?.pending ?? 0,
      href,
      emphasis: "approval",
    },
    {
      id: `${section}-pr-approved`,
      section,
      title: `${prefix} PRs approved`,
      value: stats.requisitions?.approved ?? 0,
      href,
    },
  ];
}

function localCards(stats: SectionStats, accessLevel: ProcurementAccessLevel): DashboardCard[] {
  if (accessLevel === "user") {
    return prCardsForSection("local", stats, "requester");
  }
  if (accessLevel === "approver") {
    return prCardsForSection("local", stats, "approver");
  }

  const cards: DashboardCard[] = [
    {
      id: "local-suppliers",
      section: "local",
      title: "Local suppliers",
      value: stats.suppliers ?? 0,
      href: "/procurement/local/suppliers",
    },
    {
      id: "local-items",
      section: "local",
      title: "Local items",
      value: stats.items ?? 0,
      href: "/procurement/local/items",
    },
  ];

  if (accessLevel === "admin") {
    cards.push({
      id: "local-pr-pending",
      section: "local",
      title: "Local PRs awaiting approval",
      value: stats.requisitions?.pending ?? 0,
      href: "/procurement/local/pr",
      emphasis: "approval",
    });
  }

  if (accessLevel !== "viewer") {
    cards.push({
      id: "local-pr-draft",
      section: "local",
      title: "Local PR drafts",
      value: stats.requisitions?.draft ?? 0,
      href: "/procurement/local/pr",
      emphasis: "draft",
    });
  }

  cards.push({
    id: "local-po-issued",
    section: "local",
    title: "Local POs issued",
    value: stats.purchaseOrders?.issued ?? 0,
    href: "/procurement/local/po",
  });

  if (accessLevel !== "viewer") {
    cards.push({
      id: "local-po-draft",
      section: "local",
      title: "Local PO drafts",
      value: stats.purchaseOrders?.draft ?? 0,
      href: "/procurement/local/po",
      emphasis: "draft",
    });
  }

  return cards;
}

function importCards(stats: SectionStats, accessLevel: ProcurementAccessLevel): DashboardCard[] {
  if (accessLevel === "user") {
    return prCardsForSection("import", stats, "requester");
  }
  if (accessLevel === "approver") {
    return prCardsForSection("import", stats, "approver");
  }

  const cards: DashboardCard[] = [
    {
      id: "import-suppliers",
      section: "import",
      title: "Import suppliers",
      value: stats.suppliers ?? 0,
      href: "/procurement/import/suppliers",
    },
    {
      id: "import-items",
      section: "import",
      title: "Import items",
      value: stats.items ?? 0,
      href: "/procurement/import/items",
    },
    {
      id: "import-pfi",
      section: "import",
      title: "Open import PFI",
      value: stats.pfiOpen ?? 0,
      href: "/procurement/import/pfi-received",
    },
  ];

  if (accessLevel === "admin") {
    cards.push({
      id: "import-pr-pending",
      section: "import",
      title: "Import PRs awaiting approval",
      value: stats.requisitions?.pending ?? 0,
      href: "/procurement/import/pr",
      emphasis: "approval",
    });
  }

  if (accessLevel !== "viewer") {
    cards.push({
      id: "import-pr-draft",
      section: "import",
      title: "Import PR drafts",
      value: stats.requisitions?.draft ?? 0,
      href: "/procurement/import/pr",
      emphasis: "draft",
    });
  }

  cards.push({
    id: "import-po-issued",
    section: "import",
    title: "Import POs issued",
    value: stats.purchaseOrders?.issued ?? 0,
    href: "/procurement/import/po",
  });

  if (accessLevel !== "viewer") {
    cards.push({
      id: "import-po-draft",
      section: "import",
      title: "Import PO drafts",
      value: stats.purchaseOrders?.draft ?? 0,
      href: "/procurement/import/po",
      emphasis: "draft",
    });
  }

  return cards;
}

function exportCards(stats: SectionStats): DashboardCard[] {
  return [
    {
      id: "export-pfi",
      section: "export",
      title: "Export PFI open",
      value: stats.pfiIssuedOpen ?? 0,
      href: "/procurement/export/pfi",
    },
    {
      id: "export-pfi-received",
      section: "export",
      title: "Received PFI open",
      value: stats.pfiReceivedOpen ?? 0,
      href: "/procurement/export/pfi-received",
    },
    {
      id: "export-documents",
      section: "export",
      title: "Export documents",
      value: stats.documents ?? 0,
      href: "/procurement/export/documents",
    },
    {
      id: "export-shipments",
      section: "export",
      title: "Shipment records",
      value: stats.shipments ?? 0,
      href: "/procurement/export/shipment-details",
    },
  ];
}

export function buildDashboardCards(
  allowedSections: TradeSection[],
  statsBySection: DashboardStatsBySection,
  accessLevel: ProcurementAccessLevel
): DashboardCard[] {
  const cards: DashboardCard[] = [];

  if (allowedSections.includes("local")) {
    cards.push(...localCards(statsBySection.local ?? {}, accessLevel));
  }
  if (allowedSections.includes("import")) {
    cards.push(...importCards(statsBySection.import ?? {}, accessLevel));
  }
  if (allowedSections.includes("export")) {
    cards.push(...exportCards(statsBySection.export ?? {}));
  }

  return cards;
}
