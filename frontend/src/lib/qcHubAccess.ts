import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { getStoredQcToken } from "./portalSession";

const FULL_ACCESS_ROLES = new Set([
  "QC Manager",
  "QC Admin",
  "Super Admin",
  "SuperAdmin",
  "Company Admin",
]);

export function setQcHubAccessFlags(user?: {
  role?: string;
  isSuperAdmin?: boolean;
  isCompanyAdmin?: boolean;
  isManager?: boolean;
}) {
  if (typeof window === "undefined") return;

  const role = String(user?.role || "").trim();
  if (role) localStorage.setItem("qcUserRole", role);
  else localStorage.removeItem("qcUserRole");

  if (user?.isSuperAdmin) localStorage.setItem("qcIsSuperAdmin", "1");
  else localStorage.removeItem("qcIsSuperAdmin");

  if (user?.isCompanyAdmin || user?.isManager) localStorage.setItem("qcIsCompanyAdmin", "1");
  else localStorage.removeItem("qcIsCompanyAdmin");

  const full =
    user?.isSuperAdmin === true ||
    user?.isCompanyAdmin === true ||
    user?.isManager === true ||
    (role && FULL_ACCESS_ROLES.has(role));

  if (full) localStorage.setItem("qcHubFullAccess", "1");
  else localStorage.removeItem("qcHubFullAccess");
}

export function clearQcHubAccessFlags() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("qcUserRole");
  localStorage.removeItem("qcHubFullAccess");
  localStorage.removeItem("qcIsSuperAdmin");
  localStorage.removeItem("qcIsCompanyAdmin");
}

/** Hub users with management / admin privileges (delete UI). */
export function isQcHubFullAccessUser(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("qcHubFullAccess") === "1") return true;
  if (localStorage.getItem("qcIsSuperAdmin") === "1") return true;
  if (localStorage.getItem("qcIsCompanyAdmin") === "1") return true;

  const role = (localStorage.getItem("qcUserRole") || "").trim();
  if (role && FULL_ACCESS_ROLES.has(role)) return true;

  const token = getStoredQcToken();
  if (token) {
    try {
      const decoded = jwtDecode<{
        isSuperAdmin?: boolean;
        isCompanyAdmin?: boolean;
        isManager?: boolean;
        role?: string;
      }>(token);
      if (decoded.isSuperAdmin || decoded.isCompanyAdmin || decoded.isManager) return true;
      const tokenRole = String(decoded.role || "").trim();
      if (tokenRole && FULL_ACCESS_ROLES.has(tokenRole)) return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}

export function useQcHubFullAccess(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    setAllowed(isQcHubFullAccessUser());
  }, []);
  return allowed;
}
