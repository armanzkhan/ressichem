"use client";

import { useEffect, useState } from "react";
import { getBackendUrl } from "@/lib/getBackendUrl";

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const companyId = localStorage.getItem("company_id");
    if (companyId) headers["x-company-id"] = companyId;
  }
  return headers;
}

export default function HubDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = (q?: string) => {
    const api = getBackendUrl();
    const qs = q ? `?keyword=${encodeURIComponent(q)}&limit=100` : "?limit=100";
    fetch(`${api}/api/qc/hub/document-index/search${qs}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((j) => setDocs(j.data || []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Document Index</h1>
        <p className="text-sm text-gray-500">SRS 3.5 — auto-indexed by batch, product, grade &amp; test date on upload</p>
      </div>
      <div className="flex gap-2">
        <input placeholder="Search batch, product, file…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => load(search)} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm">Search</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="px-3 py-2 text-left">File</th><th className="px-3 py-2 text-left">Batch</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Module</th><th className="px-3 py-2 text-left">Date</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d._id} className="border-t">
                <td className="px-3 py-2">{d.fileName}</td><td className="px-3 py-2">{d.batchNumber}</td>
                <td className="px-3 py-2">{d.productName}</td><td className="px-3 py-2">{d.module}</td>
                <td className="px-3 py-2">{d.date ? new Date(d.date).toLocaleDateString() : ""}</td>
              </tr>
            ))}
            {!docs.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No indexed documents yet — upload attachments on batch records or forms.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
