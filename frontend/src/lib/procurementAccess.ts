import { jwtDecode } from "jwt-decode";

const SOFT_DELETE_EMAILS = new Set(["arman@ressichem.com"]);
/** View / edit / delete / reject any PR (approved or not). */
const PR_FULL_ACCESS_EMAILS = new Set(["salim@gmail.com"]);

function storedEmail(): string {
  if (typeof window === "undefined") return "";
  const fromStorage = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
  if (fromStorage) return fromStorage;
  const token = localStorage.getItem("token");
  if (!token) return "";
  try {
    const decoded = jwtDecode<{ email?: string }>(token);
    return String(decoded.email || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

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

/** Full access to all purchase requisitions (view/edit/delete/reject including approved). */
export function hasPrFullAccess(): boolean {
  if (typeof window === "undefined") return false;
  return PR_FULL_ACCESS_EMAILS.has(storedEmail());
}

/** Soft-delete UI — allow-listed emails (arman + PR full-access). */
export function canProcurementSoftDelete(): boolean {
  if (typeof window === "undefined") return false;
  const email = storedEmail();
  return SOFT_DELETE_EMAILS.has(email) || PR_FULL_ACCESS_EMAILS.has(email);
}

export function setProcurementAdminFlag(user?: {
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
  isCompanyAdmin?: boolean;
}) {
  if (typeof window === "undefined") return;

  const email = String(user?.email || "")
    .trim()
    .toLowerCase();
  if (email) localStorage.setItem("userEmail", email);
  else localStorage.removeItem("userEmail");

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
