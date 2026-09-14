"use client";

import { useEffect, useState } from "react";
import { capaApi } from "@/lib/qcApi";

export default function HubCapaPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ priority: "MEDIUM", sourceType: "INTERNAL_AUDIT" });
  const [error, setError] = useState("");

  const load = () => capaApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await capaApi.create(form);
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
          <h1 className="text-2xl font-bold">CAPA</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — Corrective &amp; Preventive Actions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New CAPA</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea required placeholder="Problem description" value={form.problemDescription || ""} onChange={(e) => setForm({ ...form, problemDescription: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Create CAPA</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">CAPA No</th><th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left">Priority</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t"><td className="px-3 py-2">{r.capaNo}</td><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.priority}</td><td className="px-3 py-2">{r.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
