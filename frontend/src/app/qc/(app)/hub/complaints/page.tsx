"use client";

import { useEffect, useState } from "react";
import { complaintApi } from "@/lib/qcApi";

export default function HubComplaintsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ severity: "MINOR", status: "OPEN" });
  const [error, setError] = useState("");

  const load = () => complaintApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await complaintApi.create(form);
      setShowForm(false);
      setForm({ severity: "MINOR", status: "OPEN" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customer Complaints</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — customer complaint records</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New Complaint</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Batch No" value={form.batchNo || ""} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Save</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">No</th><th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left">Batch</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t"><td className="px-3 py-2">{r.complaintNo}</td><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.batchNo}</td><td className="px-3 py-2">{r.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
