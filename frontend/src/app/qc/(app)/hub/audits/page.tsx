"use client";

import { useEffect, useState } from "react";
import { internalAuditApi } from "@/lib/qcApi";

export default function HubAuditsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ auditType: "INTERNAL" });
  const [error, setError] = useState("");

  const load = () => internalAuditApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await internalAuditApi.create(form);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Internal Audit Reports</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — internal audit reports with findings</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New Audit</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Auditor" value={form.auditor || ""} onChange={(e) => setForm({ ...form, auditor: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Scope" value={form.scope || ""} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={form.auditDate || ""} onChange={(e) => setForm({ ...form, auditDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Create Audit</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">Audit No</th><th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Findings</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{r.auditNo}</td><td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.auditDate ? new Date(r.auditDate).toLocaleDateString() : ""}</td>
                <td className="px-3 py-2">{(r.findings || []).length}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
