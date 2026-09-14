import { clearAuthSession, redirectToProcurementLogin, redirectToQcLogin } from "./portalSession";

// Authentication utilities
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const userType = (localStorage.getItem("userType") || "").trim().toLowerCase();
  if (userType === "qc") {
    return localStorage.getItem("qc_token") || localStorage.getItem("token");
  }
  return localStorage.getItem("token");
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const handleAuthError = (status: number, message: string = "Authentication required"): boolean => {
  // 401 = not logged in / expired session. 403 = logged in but not allowed — do not wipe session.
  if (status === 401) {
    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      if (path.startsWith("/procurement")) {
        redirectToProcurementLogin(`${path}${window.location.search || ""}`);
      } else if (path.startsWith("/qc")) {
        redirectToQcLogin(path);
      } else {
        clearAuthSession();
        window.location.href = "/auth/sign-in";
      }
    }
    return true;
  }
  return false;
};
