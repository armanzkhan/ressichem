"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ShieldCheck, Snowflake, Send } from "lucide-react";

type Formulation = {
  _id: string;
  formulationCode: string;
  formulationName: string;
  productType: string;
  productName?: string;
  grade?: string;
  status?: string;
  version?: string;
};

const PRODUCT_TYPES = [
  "TILE_ADHESIVE",
  "TILE_GROUT",
  "PREMIX_PLASTER",
  "REPAIR_PLASTER",
  "CRACK_FILLER",
  "WATERPROOFING_MEMBRANE",
  "SURFACE_SEALANT",
  "OTHER",
];

export default function FormulationsPage() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", []);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaInfo, setTwoFaInfo] = useState<{ code?: string; expiresAt?: string } | null>(null);

  const [formData, setFormData] = useState({
    formulationCode: "",
    formulationName: "",
    productType: "TILE_ADHESIVE",
    productName: "",
    grade: "",
    description: "",
  });

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    if (twoFaCode) h["x-formulation-2fa"] = twoFaCode;
    return h;
  }, [token, twoFaCode]);

  const loadFormulations = async () => {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load formulations");
      setFormulations(data.data || []);
    } catch (err: any) {
      setMessage(err.message || "Failed to load formulations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const request2FA = async () => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/2fa/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to request code");
      setTwoFaInfo({ code: data.code, expiresAt: data.expiresAt });
      setMessage("2FA code generated. Use it within 10 minutes.");
    } catch (err: any) {
      setMessage(err.message || "Failed to request code");
    }
  };

  const createFormulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations`, {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create formulation");
      setShowForm(false);
      setFormData({
        formulationCode: "",
        formulationName: "",
        productType: "TILE_ADHESIVE",
        productName: "",
        grade: "",
        description: "",
      });
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to create formulation");
    }
  };

  const submitToQC = async (id: string) => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/${id}/submit-to-qc`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to submit");
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to submit");
    }
  };

  const approveForQC = async (id: string) => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/${id}/approve-for-qc`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to approve");
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to approve");
    }
  };

  const freeze = async (id: string) => {
    if (!token) return;
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/qc/formulations/${id}/freeze`, {
        method: "POST",
        headers,
        body: JSON.stringify({ freezeReason: "Locked after QA approval" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to freeze");
      await loadFormulations();
    } catch (err: any) {
      setMessage(err.message || "Failed to freeze");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Formulations</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              R&D formulation control with required 2‑step verification.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadFormulations} className="px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={() => setShowForm((p) => !p)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 text-white text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {showForm ? "Cancel" : "New Formulation"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={request2FA}
            className="px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Request 2FA Code
          </button>
          <input
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value)}
            placeholder="Enter 2FA code"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-2 text-sm"
          />
          {twoFaInfo?.code && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Code (dev): <strong>{twoFaInfo.code}</strong>
            </span>
          )}
        </div>
        {message && <div className="text-sm text-blue-700 dark:text-blue-300">{message}</div>}
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <form onSubmit={createFormulation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Formulation Code</label>
              <input
                required
                value={formData.formulationCode}
                onChange={(e) => setFormData((p) => ({ ...p, formulationCode: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Formulation Name</label>
              <input
                required
                value={formData.formulationName}
                onChange={(e) => setFormData((p) => ({ ...p, formulationName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Product Type</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData((p) => ({ ...p, productType: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              >
                {PRODUCT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Product Name</label>
              <input
                value={formData.productName}
                onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Grade</label>
              <input
                value={formData.grade}
                onChange={(e) => setFormData((p) => ({ ...p, grade: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="px-5 py-3 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Create Formulation (2FA required)
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading…</div>
      ) : (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formulations.map((f) => (
                  <tr key={f._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                    <td className="py-3 pr-4 font-mono font-semibold">{f.formulationCode}</td>
                    <td className="py-3 pr-4">{f.formulationName}</td>
                    <td className="py-3 pr-4">{f.productType}</td>
                    <td className="py-3 pr-4">{f.status || "—"}</td>
                    <td className="py-3 pr-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => submitToQC(f._id)}
                          className="px-3 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => approveForQC(f._id)}
                          className="px-3 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => freeze(f._id)}
                          className="px-3 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 flex items-center gap-1"
                        >
                          <Snowflake className="h-3 w-3" />
                          Freeze
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!formulations.length && (
                  <tr>
                    <td className="py-6 text-gray-600 dark:text-gray-400" colSpan={5}>
                      No formulations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
