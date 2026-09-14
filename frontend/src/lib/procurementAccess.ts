/** True when the logged-in procurement user may perform admin-only actions (e.g. delete uploads). */
export function isProcurementAdmin(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("procurementIsAdmin") === "1") return true;
  const role = (localStorage.getItem("userRole") || "").toLowerCase().trim();
  return (
    role.includes("procurement admin") ||
    role.includes("super admin") ||
    role.includes("superadmin") ||
    (role.includes("company") && role.includes("admin"))
  );
}

export function setProcurementAdminFlag(user?: {
  role?: string;
  isSuperAdmin?: boolean;
  isCompanyAdmin?: boolean;
}) {
  if (typeof window === "undefined") return;
  const role = String(user?.role || "").toLowerCase();
  const isAdmin =
    user?.isSuperAdmin === true ||
    user?.isCompanyAdmin === true ||
    role.includes("procurement admin") ||
    role.includes("super admin") ||
    role.includes("superadmin") ||
    (role.includes("company") && role.includes("admin"));
  if (isAdmin) localStorage.setItem("procurementIsAdmin", "1");
  else localStorage.removeItem("procurementIsAdmin");
}
