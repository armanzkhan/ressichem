import {
  hasQcPortalSession,
  hasValidProcurementSession,
  isJwtValid,
} from "@/lib/portalSession";

export type AssistantMode = "guest" | "qc" | "procurement" | "main" | "customer";

export function resolveAssistantMode(pathname: string): AssistantMode {
  if (typeof window === "undefined") return "guest";

  const path = pathname || "";
  const userType = (localStorage.getItem("userType") || "").trim().toLowerCase();
  const token = localStorage.getItem("token");
  const tokenValid = isJwtValid(token);

  if (path.startsWith("/procurement")) {
    if (hasValidProcurementSession() || (userType === "procurement" && tokenValid)) {
      return "procurement";
    }
    return "guest";
  }

  if (path.startsWith("/qc")) {
    if (hasQcPortalSession() || (userType === "qc" && tokenValid)) {
      return "qc";
    }
    return "guest";
  }

  if (path.startsWith("/customer") || userType === "customer") {
    if (tokenValid) return "customer";
    return "guest";
  }

  if (userType === "procurement" && tokenValid) return "procurement";
  if (userType === "qc" && tokenValid) return "qc";
  if (userType === "customer" && tokenValid) return "customer";
  if (tokenValid) return "main";

  return "guest";
}
