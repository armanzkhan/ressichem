import type { TradeModule, TradeSection } from "./procurementScope";
import { MODULE_LABELS, SECTION_MODULES } from "./procurementScope";

export type NavLink = { name: string; href: string; icon: string };

export type NavGroup = {
  id: TradeSection;
  label: string;
  icon: string;
  items: NavLink[];
};

const MODULE_ICONS: Record<TradeModule, string> = {
  suppliers: "🏢",
  items: "📦",
  po: "🛒",
  pr: "📋",
  reports: "📊",
  costing: "💹",
  grn: "📥",
  invoices: "🧾",
  payments: "💳",
  "pfi-received": "📥",
  pfi: "📤",
  documents: "📎",
  "shipment-details": "🚢",
};

function moduleHref(section: TradeSection, tradeModule: TradeModule): string {
  return `/procurement/${section}/${tradeModule}`;
}

export const PROCUREMENT_NAV_GROUPS: NavGroup[] = (["local", "import", "export"] as TradeSection[]).map(
  (section) => ({
    id: section,
    label: section === "local" ? "Local" : section === "import" ? "Import" : "Export",
    icon: section === "local" ? "🇵🇰" : section === "import" ? "🌐" : "📦",
    items: SECTION_MODULES[section].map((tradeModule) => ({
      name:
        section === "export" && tradeModule === "pfi"
          ? "Create PFI"
          : section === "export" && tradeModule === "pfi-received"
            ? "Received PFI"
            : section === "export" && tradeModule === "documents"
              ? "Documents Upload"
            : section === "export" && tradeModule === "shipment-details"
              ? "Shipment Details"
              : tradeModule === "pfi-received"
                ? "Upload PFI & Document"
                : MODULE_LABELS[tradeModule],
      href: moduleHref(section, tradeModule),
      icon: MODULE_ICONS[tradeModule],
    })),
  })
);

export const DASHBOARD_LINK: NavLink = { name: "Dashboard", href: "/procurement", icon: "🏠" };
export const USERS_LINK: NavLink = { name: "Users", href: "/procurement/users", icon: "👥" };
export const DEPARTMENT_APPROVERS_LINK: NavLink = {
  name: "PR Approvers",
  href: "/procurement/department-approvers",
  icon: "🗂️",
};

export function findActiveNavLabel(pathname: string): string {
  const crumbs = findProcurementBreadcrumbs(pathname);
  return crumbs[crumbs.length - 1]?.label || "Procurement";
}

export function findProcurementBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: "Procurement", href: "/procurement" }];

  if (pathname === "/procurement" || pathname === "/procurement/") {
    crumbs.push({ label: "Dashboard" });
    return crumbs;
  }

  if (pathname === "/procurement/users") {
    crumbs.push({ label: "Users" });
    return crumbs;
  }

  if (pathname === "/procurement/department-approvers") {
    crumbs.push({ label: "PR Approvers" });
    return crumbs;
  }

  const parts = pathname.replace(/\/$/, "").split("/");
  if (parts.length >= 4 && parts[1] === "procurement") {
    const section = parts[2] as TradeSection;
    const moduleKey = parts[3];
    const group = PROCUREMENT_NAV_GROUPS.find((g) => g.id === section);
    const item = group?.items.find((i) => i.href === pathname || i.href.endsWith(`/${moduleKey}`));

    if (group) {
      crumbs.push({ label: group.label });
    }
    if (item) {
      crumbs.push({ label: item.name });
    } else if (moduleKey) {
      crumbs.push({ label: moduleKey });
    }
  }

  return crumbs;
}
