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
  notificationHref,
  type ProcurementNotification,
} from "@/lib/procurementNotifications";

const POLL_MS = 45000;

export function ProcurementNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProcurementNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const userId = getNotificationUserId();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { items: list, unreadCount: count } = await fetchProcurementNotifications();
      setItems(list);
      setUnreadCount(count);
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
        setUnreadCount((count) => Math.max(0, count - 1));
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
          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-16 z-[80] max-h-[min(70dvh,28rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">PR notifications</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-[min(62dvh,24rem)] overflow-y-auto bg-white dark:bg-slate-950">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-700 dark:text-slate-200">Loading…</p>
            ) : error ? (
              <p className="px-4 py-6 text-sm text-red-700 dark:text-red-300">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-700 dark:text-slate-200">No PR notifications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((n) => {
                  const unread = isNotificationUnread(n, userId);
                  const href = notificationHref(n);
                  return (
                    <li key={n._id}>
                      <Link
                        href={href}
                        onClick={() => void handleClick(n)}
                        className={[
                          "block px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                          unread ? "bg-amber-50 dark:bg-slate-800" : "bg-white dark:bg-slate-950",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                          {unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden /> : null}
                        </div>
                        <p className="mt-1 text-sm leading-snug text-slate-700 dark:text-slate-200 line-clamp-4">{n.message}</p>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{formatNotificationTime(n.createdAt)}</p>
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
