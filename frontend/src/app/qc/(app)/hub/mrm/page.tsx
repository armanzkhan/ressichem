"use client";

import { useEffect, useState } from "react";
import { mrmApi } from "@/lib/qcApi";
import {
  HubBulkDeleteButton,
  HubRowDeleteButton,
  useHubRowSelection,
  useQcHubFullAccess,
} from "@/components/qc-hub/HubDeleteControls";

const REVIEW_PERIODS = ["MONTHLY", "QUARTERLY", "ANNUAL", "AD_HOC"] as const;

function monthBounds(isoDate: string) {
  const d = isoDate ? new Date(isoDate) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const toIso = (x: Date) => x.toISOString().slice(0, 10);
  return { periodStart: toIso(start), periodEnd: toIso(end) };
}

const emptyForm = () => {
  const today = new Date().toISOString().slice(0, 10);
  const bounds = monthBounds(today);
  return {
    title: "",
    reviewPeriod: "MONTHLY" as (typeof REVIEW_PERIODS)[number],
    meetingDate: today,
    periodStart: bounds.periodStart,
    periodEnd: bounds.periodEnd,
    meetingLocation: "",
    notes: "",
  };
};

export default function HubMrmPage() {
  const canDelete = useQcHubFullAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selection = useHubRowSelection(rows);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await mrmApi.getAll();
      setRows(r.data || []);
      selection.clearSelection();
    } catch (e: any) {
      setError(e.message || "Failed to load MRM records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setShowForm(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const chairperson =
        typeof window !== "undefined" ? localStorage.getItem("userId") || undefined : undefined;
      await mrmApi.create({
        ...form,
        chairperson,
        agenda: form.notes ? [form.notes] : [],
      });
      resetForm();
      setMessage("MRM created successfully.");
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create MRM");
    } finally {
      setSaving(false);
    }
  };

  const deleteOne = async (id: string, label?: string) => {
    if (!window.confirm(`Delete MRM ${label || ""}?`.trim())) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await mrmApi.remove(id);
      selection.clearSelection();
      await load();
      setMessage("MRM deleted.");
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const bulkDelete = async () => {
    const ids = selection.selectedList;
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected MRM record(s)?`)) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await mrmApi.bulkRemove(ids);
      selection.clearSelection();
      await load();
      setMessage(`Deleted ${ids.length} MRM record(s).`);
    } catch (err: any) {
      setError(err.message || "Bulk delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700/50 shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Management Review (MRM)</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Periodic QC performance reviews with decisions &amp; action items
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDelete && (
              <HubBulkDeleteButton
                selectedCount={selection.selectedList.length}
                deleting={deleting}
                onBulkDelete={bulkDelete}
              />
            )}
            <button
              type="button"
              onClick={() => (showForm ? resetForm() : setShowForm(true))}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              {showForm ? "Cancel" : "+ New MRM"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={save}
          className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-200 dark:border-blue-800 shadow p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-blue-800 dark:text-blue-300">New Management Review</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Monthly QC Review — September"
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Review Period</label>
              <select
                value={form.reviewPeriod}
                onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value as any })}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              >
                {REVIEW_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Meeting Date</label>
              <input
                type="date"
                required
                value={form.meetingDate}
                onChange={(e) => {
                  const meetingDate = e.target.value;
                  const bounds = monthBounds(meetingDate);
                  setForm({ ...form, meetingDate, ...bounds });
                }}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Period Start</label>
              <input
                type="date"
                required
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Period End</label>
              <input
                type="date"
                required
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Location</label>
              <input
                value={form.meetingLocation}
                onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })}
                placeholder="Meeting room / Teams"
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Notes / Agenda</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Agenda items or opening notes"
                className="w-full rounded-xl border px-4 py-3 text-sm dark:bg-gray-900"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create MRM"}
          </button>
        </form>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-gray-700/50 shadow overflow-x-auto">
        {loading ? (
          <div className="px-4 py-8 text-sm text-gray-500">Loading…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 text-left text-blue-900 dark:text-blue-200">
                {canDelete && (
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selection.allSelected}
                      onChange={selection.toggleAll}
                      disabled={!rows.length || deleting}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="px-3 py-3 font-semibold">MRM No</th>
                <th className="px-3 py-3 font-semibold">Title</th>
                <th className="px-3 py-3 font-semibold">Period</th>
                <th className="px-3 py-3 font-semibold">Meeting Date</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                {canDelete && <th className="px-3 py-3 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-gray-200/60 dark:border-gray-700/60">
                  {canDelete && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selection.selectedIds.has(r._id)}
                        onChange={() => selection.toggleOne(r._id)}
                        disabled={deleting}
                        aria-label={`Select ${r.mrmNo}`}
                      />
                    </td>
                  )}
                  <td className="px-3 py-3 font-mono font-semibold">{r.mrmNo}</td>
                  <td className="px-3 py-3">{r.title}</td>
                  <td className="px-3 py-3">{r.reviewPeriod}</td>
                  <td className="px-3 py-3">
                    {r.meetingDate ? new Date(r.meetingDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3">{r.status}</td>
                  {canDelete && (
                    <td className="px-3 py-3">
                      <HubRowDeleteButton disabled={deleting} onDelete={() => deleteOne(r._id, r.mrmNo)} />
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={canDelete ? 7 : 5} className="px-3 py-8 text-center text-gray-500">
                    No MRM records yet. Click <strong>+ New MRM</strong> to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
