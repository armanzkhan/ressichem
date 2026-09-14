"use client";

import { useEffect, useState } from "react";
import { ncrApi } from "@/lib/qcApi";

export default function HubNcrPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ severity: "MINOR", sourceType: "QC_BATCH" });
  const [error, setError] = useState("");

  const load = () => ncrApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ncrApi.create(form);
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
          <h1 className="text-2xl font-bold">Non-Conformance Reports (NCR)</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — NCR records linked to batches &amp; CAPA</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New NCR</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Related batch no" value={form.relatedBatchNo || ""} onChange={(e) => setForm({ ...form, relatedBatchNo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Create NCR</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">NCR No</th><th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left">Severity</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Actions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{r.ncrNo}</td><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.severity}</td><td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.status !== "CLOSED" && <button onClick={() => ncrApi.close(r._id).then(load)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Close</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
