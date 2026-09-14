import { jwtDecode } from "jwt-decode";

/** Treat tokens expired more than this many seconds ago as invalid (clock-skew tolerance). */
const EXPIRY_SKEW_SECONDS = 60;

const QC_TOKEN_KEY = "qc_token";
const QC_AUTH_BOOTSTRAP_KEY = "qc_auth_ready";

/** Returns true if token exists, decodes, and is not expired. */
export function isJwtValid(token: string | null | undefined): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return false;
  try {
    const decoded = jwtDecode<{ exp?: number }>(trimmed);
    const now = Date.now() / 1000;
    // Only reject if expired beyond skew window (do not reject fresh short-lived tokens).
    if (decoded.exp && decoded.exp < now - EXPIRY_SKEW_SECONDS) return false;
    return true;
  } catch {
    return false;
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem(QC_TOKEN_KEY);
  localStorage.removeItem("userType");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
  localStorage.removeItem("procurementDepartment");
  localStorage.removeItem("procurementIsAdmin");
  localStorage.removeItem("qcPortal");
  sessionStorage.removeItem(QC_AUTH_BOOTSTRAP_KEY);
}

function normalizedUserType(): string {
  return (localStorage.getItem("userType") || "").trim().toLowerCase();
}

export function isPortalUserType(userType?: string | null): boolean {
  const t = (userType ?? normalizedUserType()).trim().toLowerCase();
  return t === "qc" || t === "procurement";
}

export function getStoredQcToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromQcKey = localStorage.getItem(QC_TOKEN_KEY);
  const fromShared = localStorage.getItem("token");
  const token = (fromQcKey || fromShared || "").trim();
  return token || null;
}

/** Restore QC markers if token exists but userType/qcPortal were cleared by a race. */
export function repairQcSessionIfNeeded(): void {
  if (typeof window === "undefined") return;
  const token = getStoredQcToken();
  if (!token) return;

  const qcPortal = (localStorage.getItem("qcPortal") || "").trim().toLowerCase();
  const hasQcMarkers =
    qcPortal === "site" ||
    qcPortal === "hub" ||
    !!localStorage.getItem(QC_TOKEN_KEY) ||
    sessionStorage.getItem(QC_AUTH_BOOTSTRAP_KEY) === "1";

  if (normalizedUserType() !== "qc" && hasQcMarkers) {
    localStorage.setItem("userType", "qc");
    localStorage.setItem("userRole", "qc");
  }
  if (!localStorage.getItem("token")) {
    localStorage.setItem("token", token);
  }
  if (!localStorage.getItem(QC_TOKEN_KEY)) {
    localStorage.setItem(QC_TOKEN_KEY, token);
  }
}

/** Layout gate: QC portal token present (no JWT decode — avoids false logout loops). */
export function hasQcPortalSession(): boolean {
  if (typeof window === "undefined") return false;
  repairQcSessionIfNeeded();
  const token = getStoredQcToken();
  if (!token) return false;
  if (normalizedUserType() === "qc") return true;
  const qcPortal = (localStorage.getItem("qcPortal") || "").trim().toLowerCase();
  if (qcPortal === "site" || qcPortal === "hub") return true;
  return sessionStorage.getItem(QC_AUTH_BOOTSTRAP_KEY) === "1";
}

export function hasValidQcSession(): boolean {
  if (!hasQcPortalSession()) return false;
  return isJwtValid(getStoredQcToken());
}

/** Clear QC session and redirect to the correct portal login page. */
export function expireQcSessionAndRedirect(pathname?: string): void {
  if (typeof window === "undefined") return;
  clearAuthSession();
  redirectToQcLogin(pathname);
}

/** Return a valid access token, or redirect to login when expired. */
export async function ensureQcAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  repairQcSessionIfNeeded();
  const existing = getStoredQcToken();
  if (existing && isJwtValid(existing)) return existing;

  expireQcSessionAndRedirect();
  return null;
}

export function hasValidProcurementSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  return normalizedUserType() === "procurement" && isJwtValid(token);
}

export function persistQcSession({
  token,
  refreshToken,
  portal,
  user,
}: {
  token: string;
  refreshToken?: string;
  portal: "site" | "hub";
  user?: { _id?: string; company_id?: string };
}): void {
  const cleanToken = String(token).trim();
  if (!cleanToken) throw new Error("Cannot persist empty QC token");

  localStorage.setItem(QC_TOKEN_KEY, cleanToken);
  localStorage.setItem("token", cleanToken);
  if (refreshToken) localStorage.setItem("refreshToken", String(refreshToken).trim());
  localStorage.setItem("userType", "qc");
  localStorage.setItem("userRole", "qc");
  localStorage.setItem("qcPortal", portal);
  if (user?._id) localStorage.setItem("userId", String(user._id));
  if (user?.company_id) localStorage.setItem("company_id", String(user.company_id));
  sessionStorage.setItem(QC_AUTH_BOOTSTRAP_KEY, "1");
}

export function isQcAuthPath(path: string): boolean {
  return (
    path.startsWith("/qc/site-login") ||
    path.startsWith("/qc/hub-login") ||
    path.startsWith("/qc/login") ||
    path.startsWith("/qc/site-signup") ||
    path.startsWith("/qc/hub-signup")
  );
}

export function isProcurementAuthPath(path: string): boolean {
  return path.startsWith("/procurement/login");
}

export function redirectToProcurementLogin(nextPath?: string): void {
  if (typeof window === "undefined") return;
  clearAuthSession();
  const path = nextPath || `${window.location.pathname}${window.location.search || ""}`;
  const safeNext =
    path.startsWith("/procurement") && !path.startsWith("/procurement/login") ? path : "/procurement";
  window.location.replace(`/procurement/login?next=${encodeURIComponent(safeNext)}`);
}

export function redirectToQcLogin(pathname?: string): void {
  if (typeof window === "undefined") return;
  const path = pathname || window.location.pathname || "/qc";
  const nextParam = `?next=${encodeURIComponent(`${path}${window.location.search || ""}`)}`;
  if (path.startsWith("/qc/hub")) {
    window.location.replace(`/qc/hub-login${nextParam}`);
  } else {
    window.location.replace(`/qc/site-login${nextParam}`);
  }
}
