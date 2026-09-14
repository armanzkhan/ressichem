"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type QcUser = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
  modules?: string[];
  isActive?: boolean;
  createdAt?: string;
};

export default function QCUsersPage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [portal, setPortal] = useState<"all" | "site" | "hub">("all");
  const [users, setUsers] = useState<QcUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const qs = new URLSearchParams();
      qs.set("portal", portal);
      const res = await fetch(`${apiUrl}/api/qc/users?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load QC users");
      setUsers(data.data || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load QC users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QC Users</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dedicated QC user management (separate from the main Users module).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/qc/users/create-site"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 text-white text-sm font-semibold shadow hover:from-emerald-700 hover:to-sky-700"
            >
              Create QC Site User
            </Link>
            <Link
              href="/qc/users/create-hub"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-semibold shadow hover:from-sky-700 hover:to-indigo-700"
            >
              Create QC Hub User
            </Link>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter</span>
            <select
              value={portal}
              onChange={(e) => setPortal(e.target.value as any)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-sm"
            >
              <option value="all">All QC users</option>
              <option value="site">QC Site only</option>
              <option value="hub">QC Hub only</option>
            </select>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Modules</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                  <td className="py-3 pr-4 font-semibold">{u.email}</td>
                  <td className="py-3 pr-4">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="py-3 pr-4">{u.role || "—"}</td>
                  <td className="py-3 pr-4 text-xs">{(u.modules || []).length ? (u.modules || []).join(", ") : "—"}</td>
                  <td className="py-3 pr-4">{u.department || "—"}</td>
                  <td className="py-3 pr-4">{u.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
              {!users.length && !loading && (
                <tr>
                  <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={6}>
                    No QC users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


