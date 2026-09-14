import { getAuthHeaders, getAuthToken } from "@/lib/auth";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { jwtDecode } from "jwt-decode";

export type ChatContact = {
  userId: string;
  mongoId?: string | null;
  email: string;
  name: string;
  role?: string;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  isAiBot?: boolean;
};

export type ChatConversation = {
  _id: string;
  type: "direct" | "group" | "ai_bot";
  name: string;
  description?: string;
  participants: {
    userId: string;
    name?: string;
    email?: string;
    role?: string;
  }[];
  participantUserIds: string[];
  lastMessage?: {
    text?: string;
    senderUserId?: string;
    senderName?: string;
    at?: string;
  } | null;
  unreadCount?: number;
  updatedAt?: string;
  createdAt?: string;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  messageType?: "text" | "system" | "ai";
  replyTo?: string | null;
  replyQuote?: {
    _id: string;
    senderUserId: string;
    senderName: string;
    text: string;
  } | null;
  mentions?: { userId: string; name: string }[];
  deliveredTo?: { userId: string; deliveredAt?: string }[];
  readBy?: { userId: string; readAt?: string }[];
  receiptStatus?: "sent" | "delivered" | "read" | null;
  createdAt: string;
};

export function getChatViewerIds(): string[] {
  if (typeof window === "undefined") return [];
  const ids = new Set<string>();
  const stored = localStorage.getItem("userId");
  if (stored) ids.add(stored);
  const token = getAuthToken();
  if (token) {
    try {
      const decoded = jwtDecode<{ user_id?: string; _id?: string }>(token);
      if (decoded.user_id) ids.add(String(decoded.user_id));
      if (decoded._id) ids.add(String(decoded._id));
    } catch {
      /* ignore */
    }
  }
  return [...ids];
}

export function isOwnChatMessage(message: ChatMessage): boolean {
  const ids = getChatViewerIds();
  return ids.includes(message.senderUserId);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiBase = getBackendUrl();
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      "x-company-id":
        (typeof window !== "undefined" && localStorage.getItem("company_id")) || "RESSICHEM",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string })?.message || `Request failed (${res.status})`);
  }
  return json as T;
}

export const chatApi = {
  listContacts: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<{ success: boolean; data: ChatContact[] }>(`/api/chat/contacts${q}`);
  },
  listConversations: () =>
    request<{ success: boolean; data: ChatConversation[] }>("/api/chat/conversations"),
  openDirect: (userId: string) =>
    request<{ success: boolean; data: ChatConversation }>("/api/chat/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  createGroup: (body: { name: string; userIds: string[]; description?: string }) =>
    request<{ success: boolean; data: ChatConversation }>("/api/chat/conversations/group", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listMessages: (conversationId: string) =>
    request<{ success: boolean; data: ChatMessage[]; conversation: ChatConversation }>(
      `/api/chat/conversations/${conversationId}/messages`
    ),
  sendMessage: (conversationId: string, text: string, options?: { replyTo?: string }) =>
    request<{ success: boolean; data: ChatMessage }>(
      `/api/chat/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ text, replyTo: options?.replyTo || null }) }
    ),
  markDelivered: (conversationId: string, messageId: string, options?: { read?: boolean }) =>
    request<{ success: boolean; data: ChatMessage }>(
      `/api/chat/conversations/${conversationId}/messages/${messageId}/delivered`,
      { method: "POST", body: JSON.stringify({ read: !!options?.read }) }
    ),
  markRead: (conversationId: string) =>
    request<{ success: boolean; data: ChatConversation }>(
      `/api/chat/conversations/${conversationId}/read`,
      { method: "POST", body: JSON.stringify({}) }
    ),
};
