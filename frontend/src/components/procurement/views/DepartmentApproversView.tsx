"use client";

import React, { useCallback, useEffect, useState } from "react";
import { procurementApi } from "@/lib/procurementApi";
import { isProcurementAdmin } from "@/lib/procurementAccess";
import { PR_DEPARTMENTS } from "@/lib/procurementOptions";
import {
  Alert,
  Field,
  FormLabel,
  LoadingText,
  Modal,
  PageShell,
  Table,
  procurementControlClass,
  procurementSecondaryButtonClass,
} from "@/components/procurement/procurement-ui";

type Mapping = {
  _id: string;
  department: string;
  approverEmail: string;
  approverName?: string;
  isActive?: boolean;
};

const emptyForm = () => ({
  department: "",
  approverEmail: "",
  approverName: "",
  isActive: true,
});

export function DepartmentApproversView() {
  const [rows, setRows] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Mapping | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    setCanEdit(isProcurementAdmin());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await procurementApi.listDepartmentApprovers();
      setRows(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load department approvers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setWarning("");
    setShowForm(true);
  };

  const openEdit = (row: Mapping) => {
    setEditing(row);
    setForm({
      department: row.department,
      approverEmail: row.approverEmail,
      approverName: row.approverName || "",
      isActive: row.isActive !== false,
    });
    setWarning("");
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department.trim() || !form.approverEmail.trim()) {
      setError("Department and approver email are required");
      return;
    }
    setSaving(true);
    setError("");
    setWarning("");
    try {
      const body = {
        department: form.department.trim(),
        approverEmail: form.approverEmail.trim().toLowerCase(),
        approverName: form.approverName.trim(),
        isActive: form.isActive,
      };
      if (editing) {
        await procurementApi.updateDepartmentApprover(editing._id, body);
      } else {
        const res = await procurementApi.createDepartmentApprover(body);
        if (res.warning) setWarning(res.warning);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Mapping) => {
    if (!window.confirm(`Remove approver mapping for "${row.department}"?`)) return;
    setError("");
    try {
      await procurementApi.deleteDepartmentApprover(row._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!canEdit) {
    return (
      <PageShell title="PR Approvers">
        <Alert message="Only Procurement Admin can manage department approver mappings." />
      </PageShell>
    );
  }

  return (
    <PageShell title="PR Approvers" onAdd={openCreate} addLabel="Add department">
      {error ? <Alert message={error} /> : null}
      {warning ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {warning}
        </p>
      ) : null}
      <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
        Map each PR department to the manager email that should approve requisitions. The approver account
        must exist and be active in Procurement.
      </p>

      {loading ? (
        <LoadingText>Loading mappings…</LoadingText>
      ) : (
        <Table
          headers={["Department", "Approver email", "Name", "Active", "Actions"]}
          rows={rows.map((r) => [
            r.department,
            r.approverEmail,
            r.approverName || "—",
            r.isActive === false ? "No" : "Yes",
            <span key={`act-${r._id}`} className="flex flex-wrap gap-2">
              <button type="button" className="text-blue-600 text-xs dark:text-blue-300" onClick={() => openEdit(r)}>
                Edit
              </button>
              <button type="button" className="text-red-600 text-xs dark:text-red-300" onClick={() => void remove(r)}>
                Delete
              </button>
            </span>,
          ])}
        />
      )}

      {showForm ? (
        <Modal title={editing ? "Edit department approver" : "Add department approver"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="space-y-3">
            <FormLabel>
              Department *
              <input
                list="pr-department-suggestions"
                className={`mt-1 ${procurementControlClass}`}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. QC, Finance, Store"
                required
              />
              <datalist id="pr-department-suggestions">
                {PR_DEPARTMENTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </FormLabel>
            <Field
              label="Approver email *"
              value={form.approverEmail}
              onChange={(v) => setForm({ ...form, approverEmail: v })}
              type="email"
              required
            />
            <Field
              label="Approver name (optional)"
              value={form.approverName}
              onChange={(v) => setForm({ ...form, approverName: v })}
            />
            <label className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-100">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active (department can be selected and routed on PR submit)
            </label>
            <footer className="flex justify-end gap-2 pt-2">
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Saving…" : editing ? "Update" : "Add"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
