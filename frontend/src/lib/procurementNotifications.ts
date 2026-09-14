import { jwtDecode } from "jwt-decode";
import { getBackendUrl } from "./getBackendUrl";

export type ProcurementNotification = {
  _id: string;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  createdAt?: string;
  targetType?: string;
  targetIds?: string[];
  data?: {
    module?: string;
    entityType?: string;
    entityId?: string;
    requisitionNumber?: string;
    action?: string;
    audience?: "approver" | "requester";
    url?: string;
  };
  read_by?: { user_id: string; read_at?: string }[];
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  headers["x-company-id"] = localStorage.getItem("company_id") || "RESSICHEM";
  return headers;
}

export function getNotificationUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode<{ user_id?: string }>(token);
    return decoded.user_id || null;
  } catch {
    return null;
  }
}

export function isNotificationForCurrentUser(n: ProcurementNotification, userId: string | null): boolean {
  if (!userId) return false;
  if (n.targetType !== "user") return false;
  return (n.targetIds || []).includes(userId);
}

export function isNotificationUnread(n: ProcurementNotification, userId: string | null): boolean {
  if (!userId) return false;
  return !(n.read_by || []).some((r) => r.user_id === userId);
}

export async function fetchProcurementNotifications(limit = 20): Promise<ProcurementNotification[]> {
  const apiBase = getBackendUrl();
  const response = await fetch(`${apiBase}/api/procurement/notifications?limit=${limit}`, {
    headers: getHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load notifications (${response.status})`);
  }
  const json = (await response.json()) as { success?: boolean; data?: ProcurementNotification[] };
  const list = json.data || [];
  const userId = getNotificationUserId();
  return list.filter((n) => isNotificationForCurrentUser(n, userId));
}

export async function fetchUnreadProcurementNotificationCount(): Promise<number> {
  const apiBase = getBackendUrl();
  const response = await fetch(`${apiBase}/api/procurement/notifications?limit=50&unreadOnly=true`, {
    headers: getHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return 0;
  const json = (await response.json()) as { data?: ProcurementNotification[] };
  const userId = getNotificationUserId();
  return (json.data || []).filter((n) => isNotificationForCurrentUser(n, userId)).length;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const apiBase = getBackendUrl();
  const response = await fetch(`${apiBase}/api/procurement/notifications/${notificationId}/read`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to mark notification read (${response.status})`);
  }
}

export function formatNotificationTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
