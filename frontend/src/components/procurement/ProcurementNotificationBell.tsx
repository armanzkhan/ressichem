"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  fetchProcurementNotifications,
  formatNotificationTime,
  getNotificationUserId,
  isNotificationUnread,
  markNotificationRead,
  type ProcurementNotification,
} from "@/lib/procurementNotifications";

const POLL_MS = 45000;

export function ProcurementNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProcurementNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const userId = getNotificationUserId();

  const unreadCount = items.filter((n) => isNotificationUnread(n, userId)).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchProcurementNotifications();
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) void load();
  };

  const handleClick = async (n: ProcurementNotification) => {
    if (isNotificationUnread(n, userId)) {
      try {
        await markNotificationRead(n._id);
        setItems((prev) =>
          prev.map((item) =>
            item._id === n._id
              ? {
                  ...item,
                  read_by: [...(item.read_by || []), { user_id: userId || "", read_at: new Date().toISOString() }],
                }
              : item
          )
        );
      } catch {
        /* non-blocking */
      }
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        title="Notifications"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="relative p-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-blue-100 bg-white shadow-lg z-50 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">PR notifications</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-300"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-blue-600 dark:text-blue-300">Loading…</p>
            ) : error ? (
              <p className="px-4 py-6 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-blue-600 dark:text-blue-300">No PR notifications yet.</p>
            ) : (
              <ul className="divide-y divide-blue-50 dark:divide-slate-800">
                {items.map((n) => {
                  const unread = isNotificationUnread(n, userId);
                  const href = n.data?.url || "/procurement/local/pr";
                  return (
                    <li key={n._id}>
                      <Link
                        href={href}
                        onClick={() => void handleClick(n)}
                        className={[
                          "block px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors",
                          unread ? "bg-blue-50/60 dark:bg-slate-800/60" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{n.title}</p>
                          {unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden /> : null}
                        </div>
                        <p className="mt-1 text-xs text-blue-700 dark:text-blue-300 line-clamp-3">{n.message}</p>
                        <p className="mt-1 text-[11px] text-blue-500 dark:text-slate-400">{formatNotificationTime(n.createdAt)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
