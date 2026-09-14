"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { RessichemAssistant } from "@/components/RessichemAssistant";
import { resolveAssistantMode, type AssistantMode } from "@/lib/assistantContext";
import { assistantConfig } from "@/lib/ressichemAssistantConfig";

function RessichemAiAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const outer = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const inner = size === "sm" ? "h-[calc(100%-2px)] w-[calc(100%-2px)]" : "h-[calc(100%-2px)] w-[calc(100%-2px)]";
  const imageClass =
    size === "sm"
      ? "h-auto w-[130%] max-w-none object-cover object-[50%_24%]"
      : "h-auto w-[145%] max-w-none object-cover object-[50%_22%]";

  return (
    <span
      className={`relative flex ${outer} items-center justify-center rounded-full bg-gradient-to-br from-blue-900 via-violet-600 to-indigo-500 p-[2px] shadow-inner`}
    >
      <span
        className={`relative flex ${inner} items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-blue-900/10 dark:bg-gray-50`}
      >
        <Image
          src="/images/logo/logo.png"
          alt=""
          width={160}
          height={50}
          className={imageClass}
          aria-hidden
        />
      </span>
    </span>
  );
}

export default function AIChatbotFloatingButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("guest");

  useEffect(() => {
    setMode(resolveAssistantMode(pathname || ""));
  }, [pathname, open]);

  if (pathname === "/qc/site/ai-assistant") return null;

  const ui = assistantConfig(mode);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        aria-label="Open Ressichem AI Assistant"
        title={ui.title}
      >
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-900 via-violet-600 to-indigo-500 opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-90"
          aria-hidden
        />
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-900/20 via-violet-500/20 to-indigo-500/20 animate-pulse"
          aria-hidden
        />
        <RessichemAiAvatar size="md" />
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 px-1 text-[9px] font-bold tracking-wide text-white shadow-md ring-2 ring-white dark:ring-gray-900">
          AI
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close AI Assistant"
          />
          <div className="relative max-h-[90vh] w-full overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl dark:border-gray-700/50 dark:bg-gray-900 sm:mx-4 sm:max-w-4xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-200/60 bg-gradient-to-r from-blue-50/80 via-white to-violet-50/80 px-6 py-4 dark:border-gray-700/60 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <RessichemAiAvatar size="sm" />
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{ui.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{ui.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-4 sm:p-6">
              <RessichemAssistant mode={mode} compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
