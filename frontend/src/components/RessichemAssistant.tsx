"use client";

import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { getBackendUrl } from "@/lib/getBackendUrl";
import { resolveAssistantMode, type AssistantMode } from "@/lib/assistantContext";
import { assistantConfig } from "@/lib/ressichemAssistantConfig";
import { getStoredQcToken } from "@/lib/portalSession";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  /** Force a mode instead of auto-detecting from route/session */
  mode?: AssistantMode;
  compact?: boolean;
};

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

async function postAssistant(mode: AssistantMode, message: string): Promise<string> {
  const apiBase = getBackendUrl();
  const token =
    typeof window !== "undefined"
      ? getStoredQcToken() || localStorage.getItem("token")
      : null;
  const companyId =
    (typeof window !== "undefined" && localStorage.getItem("company_id")) || "RESSICHEM";

  if (mode === "qc") {
    if (!token) throw new Error("Please sign in to the QC portal to use the QC assistant.");
    const res = await fetch(`${apiBase}/api/qc/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-company-id": companyId,
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "QC assistant failed to respond");
    return data?.data?.reply || "No response.";
  }

  if (mode === "procurement") {
    if (!token) throw new Error("Please sign in to Procurement to use this assistant.");
    const res = await fetch(`${apiBase}/api/procurement/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-company-id": companyId,
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Procurement assistant failed to respond");
    return data?.data?.reply || "No response.";
  }

  const context = mode === "guest" ? "guest" : mode;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (companyId) headers["x-company-id"] = companyId;

  const res = await fetch(`${apiBase}/api/ai/public/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, context }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Assistant failed to respond");
  return data?.data?.reply || "No response.";
}

export function RessichemAssistant({ mode: forcedMode, compact = false }: Props) {
  const [mode, setMode] = useState<AssistantMode>(forcedMode || "guest");
  const config = assistantConfig(mode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (forcedMode) {
      setMode(forcedMode);
      return;
    }
    const resolved = resolveAssistantMode(window.location.pathname);
    setMode(resolved);
  }, [forcedMode]);

  useEffect(() => {
    setMessages([{ role: "assistant", content: assistantConfig(mode).welcomeMessage }]);
    setBootstrapped(true);
  }, [mode]);

  const sendMessage = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await postAssistant(mode, trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Server error";
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  };

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  if (!bootstrapped) {
    return <p className="text-sm text-gray-500 p-4">Loading assistant…</p>;
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div
        className={`rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-lg flex items-center justify-between ${
          compact ? "p-4" : "p-6"
        }`}
      >
        <div>
          <h3 className={`font-bold ${compact ? "text-base" : "text-xl"}`}>{config.bannerTitle}</h3>
          <p className="text-xs text-white/80">{config.bannerSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-full shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {config.quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-900 text-xs font-semibold hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className={`space-y-4 overflow-y-auto pr-1 ${compact ? "max-h-[360px]" : "max-h-[520px]"}`}>
          {messages.map((m, idx) => (
            <div key={`${m.role}-${idx}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    m.role === "user" ? "bg-blue-900 text-white" : "bg-emerald-500 text-white"
                  }`}
                >
                  {m.role === "user" ? "You" : "AI"}
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-900 text-white"
                      : "bg-white text-gray-800 dark:bg-gray-900/60 dark:text-gray-100 border border-gray-200/60 dark:border-gray-700/60"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans leading-relaxed">{renderContent(m.content)}</div>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm bg-white text-gray-600 dark:bg-gray-900/60 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:120ms]" />
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/50 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) sendMessage();
              }
            }}
            placeholder={config.placeholder}
            className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!canSend}
            className="h-10 w-10 rounded-xl bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center transition"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
