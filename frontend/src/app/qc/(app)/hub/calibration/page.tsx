"use client";

import { useEffect, useState } from "react";
import { calibrationApi } from "@/lib/qcApi";

export default function HubCalibrationPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [dueSoon, setDueSoon] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState("");

  const load = () => {
    calibrationApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
    calibrationApi.getDueSoon().then((r) => setDueSoon(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await calibrationApi.create(form);
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
          <h1 className="text-2xl font-bold">Calibration Records</h1>
          <p className="text-sm text-gray-500">SRS 3.2.1 — equipment calibration tracking</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">+ New Record</button>
      </div>
      {dueSoon.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <strong>{dueSoon.length}</strong> calibration(s) due soon or overdue.
        </div>
      )}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {showForm && (
        <form onSubmit={save} className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-800">
          <input required placeholder="Equipment name" value={form.equipmentName || ""} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Equipment ID" value={form.equipmentId || ""} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={form.calibrationDate || ""} onChange={(e) => setForm({ ...form, calibrationDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="date" placeholder="Next due" value={form.nextDueDate || ""} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Save</button>
        </form>
      )}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">Record No</th><th className="px-3 py-2 text-left">Equipment</th><th className="px-3 py-2 text-left">Calibrated</th><th className="px-3 py-2 text-left">Next Due</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{r.recordNo}</td><td className="px-3 py-2">{r.equipmentName}</td>
                <td className="px-3 py-2">{r.calibrationDate ? new Date(r.calibrationDate).toLocaleDateString() : ""}</td>
                <td className="px-3 py-2">{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : ""}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
