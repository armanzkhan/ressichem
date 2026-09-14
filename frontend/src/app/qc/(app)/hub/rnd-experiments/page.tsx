"use client";

import { useEffect, useState } from "react";
import { rdExperimentApi } from "@/lib/qcApi";

export default function HubRndExperimentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ productType: "TILE_ADHESIVE" });
  const [error, setError] = useState("");

  const load = () => rdExperimentApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rdExperimentApi.create(form);
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
          <h1 className="text-2xl font-bold">R&amp;D Experiments</h1>
          <p className="text-sm text-gray-500">SRS 3.3 — trial batches T0/T1/T2, formulation comparison, cost reduction</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New Experiment</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Experiment name" value={form.experimentName || ""} onChange={(e) => setForm({ ...form, experimentName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea required placeholder="Objective" value={form.objective || ""} onChange={(e) => setForm({ ...form, objective: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Target product" value={form.targetProduct || ""} onChange={(e) => setForm({ ...form, targetProduct: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="TILE_ADHESIVE">Tile Adhesive</option>
            <option value="TILE_GROUT">Tile Grout</option>
            <option value="PREMIX_PLASTER">Premix Plaster</option>
            <option value="REPAIR_PLASTER">Repair Mortar</option>
            <option value="CRACK_FILLER">Crack Filler</option>
            <option value="WATERPROOFING_MEMBRANE">Waterproofing</option>
            <option value="SURFACE_SEALANT">Sealers</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Create</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Trials</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{r.experimentCode}</td>
                <td className="px-3 py-2">{r.experimentName}</td>
                <td className="px-3 py-2">{r.targetProduct || r.productType}</td>
                <td className="px-3 py-2">{(r.trials || []).length}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
