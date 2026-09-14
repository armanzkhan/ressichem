"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Plus, Search, Send, Users, X, ArrowLeft, Bot, CornerUpLeft, Check, CheckCheck } from "lucide-react";
import {
  chatApi,
  isOwnChatMessage,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/chatApi";
import { getAuthToken } from "@/lib/auth";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { assistantConfig } from "@/lib/ressichemAssistantConfig";
import realtimeNotificationService from "@/services/realtimeNotificationService";

type View = "list" | "chat" | "new" | "group";

const GUEST_AI_ID = "guest_ai";
const GUEST_USER_ID = "guest";

const guestAiConversation = (): ChatConversation => ({
  _id: GUEST_AI_ID,
  type: "ai_bot",
  name: "Ressichem AI",
  description: "Ask about Ressichem — sign in to message people",
  participants: [],
  participantUserIds: [GUEST_USER_ID, "ressichem_ai_bot"],
  lastMessage: null,
  unreadCount: 0,
});

function guestWelcomeMessage(): ChatMessage {
  return {
    _id: `welcome_${Date.now()}`,
    conversationId: GUEST_AI_ID,
    senderUserId: "ressichem_ai_bot",
    senderName: "Ressichem AI",
    senderEmail: "ai@ressichem.local",
    text: assistantConfig("guest").welcomeMessage,
    messageType: "ai",
    createdAt: new Date().toISOString(),
  };
}

function formatTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";
}

function MessageReceipt({ status }: { status?: ChatMessage["receiptStatus"] }) {
  if (!status) return null;
  const label = status === "read" ? "Read" : status === "delivered" ? "Delivered" : "Sent";
  const color =
    status === "read"
      ? "text-sky-400"
      : status === "delivered"
        ? "text-slate-300/90"
        : "text-slate-400/80";
  return (
    <span className={`inline-flex items-center ml-1 align-middle ${color}`} title={label}>
      {status === "sent" ? (
        <Check className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}
    </span>
  );
}

function renderMessageBody(text: string, mentions: ChatMessage["mentions"] = []) {
  if (!mentions?.length) return text;
  const names = [...mentions]
    .map((m) => m.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const pattern = names.map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).join("|");
  const rx = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(rx);
  return parts.map((part, i) => {
    if (names.some((n) => part.toLowerCase() === `@${n.toLowerCase()}`)) {
      return (
        <span key={i} className="font-semibold text-sky-300">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function WhatsAppMessenger() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [active, setActive] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionCandidates = useMemo(() => {
    if (!active || active.type !== "group") return [];
    return (active.participants || [])
      .filter((p) => p.userId && (p.name || p.email))
      .map((p) => ({ userId: p.userId, name: p.name || p.email || p.userId }));
  }, [active]);

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.trim().toLowerCase();
    return mentionCandidates.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionCandidates, mentionQuery]);

  const totalUnread = useMemo(
    () => (authed ? conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) : 0),
    [conversations, authed]
  );

  const openGuestAi = useCallback(() => {
    setError("");
    setActive(guestAiConversation());
    setMessages([guestWelcomeMessage()]);
    setView("chat");
  }, []);

  useEffect(() => {
    setAuthed(!!getAuthToken());
    const onStorage = () => setAuthed(!!getAuthToken());
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(() => setAuthed(!!getAuthToken()), 4000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, []);

  const loadConversations = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const res = await chatApi.listConversations();
      setConversations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadContacts = useCallback(async (q = "") => {
    if (!getAuthToken()) return;
    try {
      const res = await chatApi.listContacts(q);
      setContacts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const openConversation = useCallback(async (conv: ChatConversation) => {
    setLoading(true);
    setError("");
    setActive(conv);
    setView("chat");
    try {
      const res = await chatApi.listMessages(conv._id);
      setMessages(res.data || []);
      if (res.conversation) setActive(res.conversation);
      await chatApi.markRead(conv._id).catch(() => null);
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) {
      setConversations([]);
      return;
    }
    void loadConversations();
    const onFocus = () => void loadConversations();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void loadConversations(), 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [authed, loadConversations]);

  useEffect(() => {
    if (!open || !authed) return;
    if (view === "new" || view === "group") void loadContacts(search);
  }, [open, authed, view, search, loadContacts]);

  useEffect(() => {
    const openFromNotify = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      setOpen(true);
      setView("list");
      try {
        const res = await chatApi.listConversations();
        const rows = res.data || [];
        setConversations(rows);
        const convId = detail.conversationId;
        if (!convId) return;
        const found = rows.find((c) => c._id === convId);
        if (found) await openConversation(found);
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener("open-whatsapp-messenger", openFromNotify as EventListener);
    return () => window.removeEventListener("open-whatsapp-messenger", openFromNotify as EventListener);
  }, [openConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, view]);

  useEffect(() => {
    if (!authed) return;
    const onChatEvent = (payload: any) => {
      if (payload?.type === "chat_message_status" && payload.message) {
        const msg = payload.message as ChatMessage;
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m))
        );
        return;
      }
      if (payload?.type === "chat_message" && payload.message) {
        const msg = payload.message as ChatMessage;
        if (!isOwnChatMessage(msg)) {
          const inActiveChat =
            active &&
            String(active._id) === String(msg.conversationId) &&
            view === "chat";
          void chatApi
            .markDelivered(msg.conversationId, msg._id, { read: !!inActiveChat })
            .catch(() => null);
        }
        setMessages((prev) => {
          if (!active || String(active._id) !== String(msg.conversationId)) return prev;
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c._id === msg.conversationId);
          if (idx < 0) {
            void loadConversations();
            return prev;
          }
          const next = [...prev];
          const current = next[idx];
          const isActiveChat = active && active._id === msg.conversationId;
          next[idx] = {
            ...current,
            lastMessage: {
              text: msg.text,
              senderUserId: msg.senderUserId,
              senderName: msg.senderName,
              at: msg.createdAt,
            },
            unreadCount: isActiveChat || isOwnChatMessage(msg) ? 0 : (current.unreadCount || 0) + 1,
          };
          next.sort(
            (a, b) =>
              new Date(b.lastMessage?.at || b.updatedAt || 0).getTime() -
              new Date(a.lastMessage?.at || a.updatedAt || 0).getTime()
          );
          return next;
        });
      }
      if (payload?.type === "chat_conversation_updated" && payload.conversation) {
        const conv = payload.conversation as ChatConversation;
        setConversations((prev) => {
          const others = prev.filter((c) => c._id !== conv._id);
          return [conv, ...others];
        });
        if (active && active._id === conv._id) setActive(conv);
      }
    };
    realtimeNotificationService.addChatListener(onChatEvent);
    return () => realtimeNotificationService.removeChatListener(onChatEvent);
  }, [authed, active, loadConversations, view]);

  const sendGuestAi = async (pending: string) => {
    const userMsg: ChatMessage = {
      _id: `g_${Date.now()}`,
      conversationId: GUEST_AI_ID,
      senderUserId: GUEST_USER_ID,
      senderName: "You",
      text: pending,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const apiBase = getBackendUrl();
    const res = await fetch(`${apiBase}/api/ai/public/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-company-id": "RESSICHEM" },
      body: JSON.stringify({ message: pending, context: "guest" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "AI failed to respond");
    const reply = data?.data?.reply || "No response.";
    setMessages((prev) => [
      ...prev,
      {
        _id: `ai_${Date.now()}`,
        conversationId: GUEST_AI_ID,
        senderUserId: "ressichem_ai_bot",
        senderName: "Ressichem AI",
        senderEmail: "ai@ressichem.local",
        text: reply,
        messageType: "ai",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (active?.type !== "group") {
      setMentionQuery(null);
      return;
    }
    const match = value.match(/@([\w\s.]*)$/);
    setMentionQuery(match ? match[1].toLowerCase() : null);
  };

  const insertMention = (name: string) => {
    setText((prev) => prev.replace(/@[\w\s.]*$/, `@${name} `));
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!active || !text.trim() || sending) return;
    setSending(true);
    setError("");
    const pending = text.trim();
    const replyId = replyTarget?._id;
    setText("");
    setReplyTarget(null);
    setMentionQuery(null);
    try {
      if (!authed || active._id === GUEST_AI_ID) {
        await sendGuestAi(pending);
        return;
      }
      const res = await chatApi.sendMessage(active._id, pending, { replyTo: replyId });
      setMessages((prev) => (prev.some((m) => m._id === res.data._id) ? prev : [...prev, res.data]));
      setConversations((prev) => {
        const others = prev.filter((c) => c._id !== active._id);
        return [
          {
            ...active,
            lastMessage: {
              text: res.data.text,
              senderUserId: res.data.senderUserId,
              senderName: res.data.senderName,
              at: res.data.createdAt,
            },
            unreadCount: 0,
          },
          ...others,
        ];
      });
    } catch (err) {
      setText(pending);
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const startDirect = async (contact: ChatContact) => {
    setLoading(true);
    setError("");
    try {
      const res = await chatApi.openDirect(contact.userId);
      await openConversation(res.data);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open chat");
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      setError("Enter a group name and select members");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await chatApi.createGroup({
        name: groupName.trim(),
        userIds: selectedMembers,
      });
      setGroupName("");
      setSelectedMembers([]);
      await openConversation(res.data);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (!authed) {
            openGuestAi();
            return;
          }
          setView("list");
          void loadConversations();
        }}
        className="fixed bottom-6 right-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#1ebe57] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Open messages"
        title={authed ? "Messages" : "Chat with Ressichem AI"}
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-[11px] font-bold flex items-center justify-center">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-50 w-[min(100vw-1.5rem,26rem)] h-[min(100vh-8rem,36rem)] rounded-2xl overflow-hidden shadow-2xl border border-emerald-900/20 bg-[#0b141a] text-slate-100 flex flex-col min-w-0">
          <header className="bg-[#202c33] px-3 py-3 flex items-center gap-2 shrink-0 min-w-0">
            {view !== "list" && authed ? (
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-white/10"
                onClick={() => {
                  setView("list");
                  setActive(null);
                  setMessages([]);
                  setError("");
                }}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {view === "list"
                  ? "Messages"
                  : view === "new"
                    ? "New chat"
                    : view === "group"
                      ? "New group"
                      : active?.name || "Chat"}
              </p>
              {view === "chat" && active?.type === "group" ? (
                <p className="text-[11px] text-slate-400 truncate">
                  {(active.participants || []).map((p) => p.name || p.email).join(", ")}
                </p>
              ) : null}
              {!authed ? (
                <p className="text-[11px] text-amber-300/90 truncate">
                  Guest mode — sign in for team chat & notifications
                </p>
              ) : null}
            </div>
            {view === "list" && authed ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="New chat"
                  className="p-2 rounded-full hover:bg-white/10"
                  onClick={() => {
                    setView("new");
                    setSearch("");
                    void loadContacts();
                  }}
                >
                  <Plus className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="New group"
                  className="p-2 rounded-full hover:bg-white/10"
                  onClick={() => {
                    setView("group");
                    setSearch("");
                    setSelectedMembers([]);
                    setGroupName("");
                    void loadContacts();
                  }}
                >
                  <Users className="h-5 w-5" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="p-2 rounded-full hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {error ? (
            <div className="px-3 py-2 text-xs bg-red-950/60 text-red-200 border-b border-red-900">{error}</div>
          ) : null}

          {view === "list" ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111b21] min-w-0">
              {conversations.length === 0 ? (
                <p className="p-6 text-sm text-slate-400 text-center">
                  No chats yet. Tap + to message someone or create a group.
                </p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => void openConversation(c)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#202c33] border-b border-white/5 text-left"
                  >
                    <span
                      className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        c.type === "ai_bot"
                          ? "bg-violet-600"
                          : c.type === "group"
                            ? "bg-emerald-700"
                            : "bg-sky-700"
                      }`}
                    >
                      {c.type === "ai_bot" ? <Bot className="h-5 w-5" /> : initials(c.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTime(c.lastMessage?.at || c.updatedAt)}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 truncate">
                          {c.lastMessage?.text || "No messages yet"}
                        </span>
                        {(c.unreadCount || 0) > 0 ? (
                          <span className="min-w-[1.15rem] h-5 px-1 rounded-full bg-[#25D366] text-[10px] font-bold text-[#111] flex items-center justify-center">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {(view === "new" || view === "group") && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111b21] flex flex-col min-w-0">
              {view === "group" ? (
                <div className="p-3 border-b border-white/5 space-y-2">
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full rounded-lg bg-[#202c33] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void createGroup()}
                    className="w-full rounded-lg bg-[#25D366] text-[#111] font-semibold py-2 text-sm disabled:opacity-50"
                  >
                    Create group
                  </button>
                </div>
              ) : null}
              <div className="px-3 py-2 flex items-center gap-2 bg-[#202c33]">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {contacts.map((c) => {
                  const selected = selectedMembers.includes(c.userId);
                  return (
                    <button
                      key={c.userId}
                      type="button"
                      onClick={() => {
                        if (view === "new") {
                          void startDirect(c);
                          return;
                        }
                        setSelectedMembers((prev) =>
                          selected ? prev.filter((id) => id !== c.userId) : [...prev, c.userId]
                        );
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#202c33] border-b border-white/5 text-left"
                    >
                      <span
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          c.isAiBot ? "bg-violet-600" : "bg-sky-700"
                        }`}
                      >
                        {c.isAiBot ? <Bot className="h-5 w-5" /> : initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium truncate">{c.name}</span>
                        <span className="block text-xs text-slate-400 truncate">
                          {[c.role, c.department, c.email].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {view === "group" && !c.isAiBot ? (
                        <span
                          className={`h-5 w-5 rounded border ${
                            selected ? "bg-[#25D366] border-[#25D366]" : "border-slate-500"
                          }`}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "chat" && active ? (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2 min-w-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] bg-[#0b141a]">
                {loading ? <p className="text-center text-sm text-slate-400 py-8">Loading…</p> : null}
                {!loading && messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">Say hello 👋</p>
                ) : null}
                {messages.map((m) => {
                  const mine =
                    !authed || active?._id === GUEST_AI_ID
                      ? m.senderUserId === GUEST_USER_ID
                      : isOwnChatMessage(m);
                  const system = m.messageType === "system";
                  if (system) {
                    return (
                      <div key={m._id} className="flex justify-center">
                        <span className="text-[11px] bg-[#182229] text-slate-300 px-3 py-1 rounded-full max-w-[90%] text-center">
                          {m.text}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={m._id} className={`group flex w-full min-w-0 ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="relative max-w-[82%] min-w-0">
                        <div
                          className={`relative rounded-lg px-3 py-2 shadow ${
                            mine ? "bg-[#005c4b]" : m.messageType === "ai" ? "bg-[#2a2540]" : "bg-[#202c33]"
                          }`}
                        >
                          {authed && active?._id !== GUEST_AI_ID ? (
                            <button
                              type="button"
                              title="Reply"
                              onClick={() => setReplyTarget(m)}
                              className={`absolute top-1 opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-black/20 text-slate-300 transition-opacity ${
                                mine ? "left-1" : "right-1"
                              }`}
                            >
                              <CornerUpLeft className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {!mine ? (
                            <p className="text-[11px] font-semibold text-emerald-300 mb-0.5 pr-6">{m.senderName}</p>
                          ) : null}
                          {m.replyQuote ? (
                            <div className="mb-2 border-l-2 border-emerald-400/80 pl-2 text-[11px] text-slate-300/90 min-w-0">
                              <p className="font-semibold text-emerald-300 truncate">{m.replyQuote.senderName}</p>
                              <p className="truncate opacity-90">{m.replyQuote.text}</p>
                            </div>
                          ) : null}
                          <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {renderMessageBody(m.text, m.mentions)}
                          </p>
                          <p className="text-[10px] text-slate-300/80 text-right mt-1 flex items-center justify-end gap-0.5 flex-wrap">
                            {formatTime(m.createdAt)}
                            {mine ? <MessageReceipt status={m.receiptStatus} /> : null}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="bg-[#202c33] p-2 flex flex-col gap-2 shrink-0 min-w-0 overflow-hidden">
                {replyTarget ? (
                  <div className="flex items-start gap-2 rounded-lg bg-[#182229] px-3 py-2 border-l-4 border-emerald-500">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-emerald-400">
                        Replying to {replyTarget.senderName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{replyTarget.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(null)}
                      className="p-1 rounded-full hover:bg-white/10 text-slate-400"
                      aria-label="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {filteredMentions.length > 0 ? (
                  <div className="rounded-lg bg-[#182229] border border-white/10 overflow-hidden max-h-36 overflow-y-auto">
                    {filteredMentions.map((p) => (
                      <button
                        key={p.userId}
                        type="button"
                        onClick={() => insertMention(p.name)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#202c33] flex items-center gap-2"
                      >
                        <span className="text-emerald-400">@</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-end gap-2 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  rows={1}
                  placeholder={
                    active?.type === "group" ? "Type a message — use @ to mention" : "Type a message"
                  }
                  className="flex-1 min-w-0 resize-none rounded-xl bg-[#2a3942] px-3 py-2.5 text-sm outline-none max-h-28"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="h-11 w-11 rounded-full bg-[#25D366] text-[#111] flex items-center justify-center disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-5 w-5" />
                </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
