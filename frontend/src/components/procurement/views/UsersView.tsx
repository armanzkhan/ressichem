"use client";

import React, { useCallback, useEffect, useState } from "react";
import { procurementApi, type ProcurementUser } from "@/lib/procurementApi";
import { isProcurementAdmin } from "@/lib/procurementAccess";
import {
  PROCUREMENT_ACCESS_LEVELS,
  PROCUREMENT_AREAS,
  accessLevelFromRole,
  accessLevelLabel,
  areaLabel,
  areasForAccessLevel,
  userProcurementArea,
  type ProcurementAccessLevel,
  type ProcurementArea,
} from "@/lib/procurementRoles";
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
import { recordTotalLabel } from "@/lib/procurementRecordSummary";

const emptyUser = () => ({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  area: "local" as ProcurementArea,
  accessLevel: "user" as ProcurementAccessLevel,
});

function userName(u: ProcurementUser) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

function userRole(u: ProcurementUser) {
  return u.role || u.roles?.[0]?.name || "—";
}

function userToEditForm(u: ProcurementUser) {
  const areaKey = userProcurementArea(userRole(u), u.department);
  return {
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    phone: u.phone || "",
    area: (areaKey === "all" ? "local" : areaKey) as ProcurementArea,
    accessLevel: accessLevelFromRole(userRole(u)),
    password: "",
    isActive: u.isActive !== false,
  };
}

function AreaAccessFields({
  area,
  accessLevel,
  onAreaChange,
  onAccessLevelChange,
}: {
  area: ProcurementArea;
  accessLevel: ProcurementAccessLevel;
  onAreaChange: (area: ProcurementArea) => void;
  onAccessLevelChange: (level: ProcurementAccessLevel) => void;
}) {
  const areas = areasForAccessLevel(accessLevel);
  return (
    <>
      <FormLabel className="sm:col-span-2">
        Access level
        <select
          className={`mt-1 ${procurementControlClass}`}
          value={accessLevel}
          onChange={(e) => {
            const next = e.target.value as ProcurementAccessLevel;
            onAccessLevelChange(next);
            const nextAreas = areasForAccessLevel(next);
            if (!nextAreas.includes(area) && nextAreas[0]) onAreaChange(nextAreas[0]);
          }}
        >
          {PROCUREMENT_ACCESS_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label} — {level.description}
            </option>
          ))}
        </select>
      </FormLabel>
      {accessLevel !== "admin" ? (
        <FormLabel className="sm:col-span-2">
          Procurement area
          <select
            className={`mt-1 ${procurementControlClass}`}
            value={areas.includes(area) ? area : areas[0]}
            onChange={(e) => onAreaChange(e.target.value as ProcurementArea)}
          >
            {PROCUREMENT_AREAS.filter((item) => areas.includes(item.value)).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} — {item.description}
              </option>
            ))}
          </select>
        </FormLabel>
      ) : (
        <p className="sm:col-span-2 text-xs text-blue-700 dark:text-blue-300">
          Admin accounts have access to Local, Import, and Export.
        </p>
      )}
    </>
  );
}

export function UsersView() {
  const [rows, setRows] = useState<ProcurementUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [viewingUser, setViewingUser] = useState<ProcurementUser | null>(null);
  const [editingUser, setEditingUser] = useState<ProcurementUser | null>(null);
  const [editForm, setEditForm] = useState(userToEditForm({ _id: "", email: "" }));
  const [detailLoading, setDetailLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    setCanEdit(isProcurementAdmin());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await procurementApi.listUsers();
      setRows(res.users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openUser = async (user: ProcurementUser) => {
    setDetailLoading(true);
    setError("");
    try {
      const res = await procurementApi.getUser(user._id);
      setViewingUser(res.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setDetailLoading(false);
    }
  };

  const startEdit = (user: ProcurementUser) => {
    setEditingUser(user);
    setEditForm({
      ...userToEditForm(user),
      password: "",
    });
    setViewingUser(null);
  };

  const saveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await procurementApi.createUser({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        area: form.accessLevel === "admin" ? undefined : form.area,
        accessLevel: form.accessLevel,
      });
      setShowForm(false);
      setForm(emptyUser());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setError("");
    try {
      const body: Parameters<typeof procurementApi.updateUser>[1] = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        accessLevel: editForm.accessLevel,
        area: editForm.accessLevel === "admin" ? undefined : editForm.area,
        isActive: editForm.isActive,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      await procurementApi.updateUser(editingUser._id, body);
      setEditingUser(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Users"
      summary={loading ? undefined : recordTotalLabel(rows.length, "user", "users")}
      onAdd={() => setShowForm(true)}
    >
      {error ? <Alert message={error} /> : null}
      {loading || detailLoading ? (
        <LoadingText />
      ) : (
        <Table
          onRowClick={(index) => openUser(rows[index])}
          headers={["Name", "Email", "Area", "Access level", "Status"]}
          rows={rows.map((u) => [
            userName(u),
            u.email,
            areaLabel(userProcurementArea(userRole(u), u.department)),
            accessLevelLabel(accessLevelFromRole(userRole(u))),
            u.isActive === false ? "Inactive" : "Active",
          ])}
        />
      )}

      {showForm ? (
        <Modal title="New procurement user" onClose={() => setShowForm(false)}>
          <form onSubmit={saveCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field
              label="Password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              type="password"
              required
            />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <AreaAccessFields
              area={form.area}
              accessLevel={form.accessLevel}
              onAreaChange={(area) => setForm({ ...form, area })}
              onAccessLevelChange={(accessLevel) => setForm({ ...form, accessLevel })}
            />
            <footer className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Creating..." : "Create user"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}

      {viewingUser ? (
        <Modal title={userName(viewingUser)} onClose={() => setViewingUser(null)}>
          <div className="space-y-3 text-sm text-blue-800 dark:text-blue-100">
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Email:</span> {viewingUser.email}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Area:</span>{" "}
              {areaLabel(userProcurementArea(userRole(viewingUser), viewingUser.department))}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Access level:</span>{" "}
              {accessLevelLabel(accessLevelFromRole(userRole(viewingUser)))} ({userRole(viewingUser)})
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Phone:</span> {viewingUser.phone || "—"}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">User ID:</span>{" "}
              {viewingUser.user_id || "—"}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Status:</span>{" "}
              {viewingUser.isActive === false ? "Inactive" : "Active"}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Password:</span>{" "}
              <span className="text-blue-700 dark:text-blue-300">
                Hidden for security. Use Edit user to set a new password.
              </span>
            </p>
            {viewingUser.permissions?.length ? (
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Permissions</p>
                <p className="text-blue-700 dark:text-blue-300">
                  {viewingUser.permissions.map((p) => p.key).join(", ")}
                </p>
              </div>
            ) : null}
            <footer className="flex flex-wrap justify-end gap-2 pt-2">
              {canEdit ? (
                <button
                  type="button"
                  className={procurementSecondaryButtonClass}
                  onClick={() => startEdit(viewingUser)}
                >
                  Edit user
                </button>
              ) : null}
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setViewingUser(null)}>
                Close
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}

      {editingUser ? (
        <Modal title={`Edit — ${userName(editingUser)}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={saveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="First name"
              value={editForm.firstName}
              onChange={(v) => setEditForm({ ...editForm, firstName: v })}
            />
            <Field
              label="Last name"
              value={editForm.lastName}
              onChange={(v) => setEditForm({ ...editForm, lastName: v })}
            />
            <Field label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
            <AreaAccessFields
              area={editForm.area}
              accessLevel={editForm.accessLevel}
              onAreaChange={(area) => setEditForm({ ...editForm, area })}
              onAccessLevelChange={(accessLevel) => setEditForm({ ...editForm, accessLevel })}
            />
            <Field
              label="New password"
              value={editForm.password}
              onChange={(v) => setEditForm({ ...editForm, password: v })}
              type="password"
              placeholder="Leave blank to keep current password"
            />
            <FormLabel>
              Status
              <select
                className={`mt-1 ${procurementControlClass}`}
                value={editForm.isActive ? "active" : "inactive"}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormLabel>
            <footer className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
