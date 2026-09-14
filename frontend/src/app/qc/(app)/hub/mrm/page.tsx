"use client";

import { useEffect, useState } from "react";
import { mrmApi } from "@/lib/qcApi";

export default function HubMrmPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    mrmApi.getAll().then((r) => setRows(r.data || [])).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Management Review (MRM)</h1>
        <p className="text-sm text-gray-500">Periodic QC performance reviews with decisions &amp; action items</p>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">MRM No</th><th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left">Period</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-t"><td className="px-3 py-2">{r.mrmNo}</td><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2">{r.reviewPeriod}</td><td className="px-3 py-2">{r.status}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No MRM records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
