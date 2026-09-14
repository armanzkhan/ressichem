"use client";

import { useEffect, useState } from "react";
import { packagingMaterialApi } from "@/lib/qcApi";
import { PACKAGING_MATERIAL_TYPES } from "@/lib/qcHubDryMortarSrs";

export default function HubPackagingMaterialsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ materialType: PACKAGING_MATERIAL_TYPES[0] });
  const [error, setError] = useState("");

  const load = () => packagingMaterialApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await packagingMaterialApi.create(form);
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
          <h1 className="text-2xl font-bold">Packaging Material QC</h1>
          <p className="text-sm text-gray-500">SRS 3.1.10 — printed bags, labels, cartons, pallets, stretch film</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New Inspection</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            {PACKAGING_MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input required placeholder="Material name" value={form.materialName || ""} onChange={(e) => setForm({ ...form, materialName: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Batch no" value={form.batchNo || ""} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Supplier" value={form.supplier || ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Remarks" value={form.remarks || ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm md:col-span-2">Save</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Batch</th><th className="px-3 py-2 text-left">Supplier</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{r.materialType}</td><td className="px-3 py-2">{r.materialName}</td>
                <td className="px-3 py-2">{r.batchNo}</td><td className="px-3 py-2">{r.supplier}</td><td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
