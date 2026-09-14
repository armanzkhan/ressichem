"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

export default function CreateQCHubUserPage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    department: "QC",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/users/create-hub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create QC Hub user");
      setMessage("✅ QC Hub user created");
      setForm((p) => ({ ...p, firstName: "", lastName: "", email: "", password: "", phone: "" }));
    } catch (e: any) {
      setMessage(`❌ ${e?.message || "Failed to create user"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create QC Hub User</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          This creates a user with role <span className="font-semibold">QC Hub User</span> and module tag <span className="font-mono">QC_HUB</span>.
        </p>
      </div>

      {message && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-gray-800 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-200">
          {message}
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">First Name</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Last Name</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <Link href="/qc/users" className="text-sm font-semibold text-sky-700 dark:text-sky-300 hover:underline">
              ← Back to QC Users
            </Link>
            <button
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-semibold shadow disabled:opacity-60"
              type="submit"
            >
              {loading ? "Creating…" : "Create QC Hub User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


