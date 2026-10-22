"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { procurementApi, type ProcurementItem, type ProcurementSupplier, type PurchaseDocument } from "@/lib/procurementApi";
import {
  RequisitionLineEditor,
  type RequisitionLine,
} from "@/components/procurement/RequisitionLineEditor";
import { Alert, Field, FormLabel, LoadingText, Modal, PageShell, StatusBadge, Table, procurementDateTime, procurementFieldClass, procurementSecondaryButtonClass, procurementUserLabel } from "@/components/procurement/procurement-ui";
import { BulkImportModal } from "@/components/procurement/BulkImportModal";
import { SupplierSelect } from "@/components/procurement/SupplierSelect";
import { TermSelect } from "@/components/procurement/TermSelect";
import { DEFAULT_ITEM_UNIT, PR_DEPARTMENTS } from "@/lib/procurementOptions";
import {
  filterItemsBySection,
  filterRequisitionsBySection,
  filterSuppliersBySection,
  pageTitle,
  purchaseTypeForSection,
} from "@/lib/procurementScope";
import { recordTotalLabel } from "@/lib/procurementRecordSummary";
import {
  accessLevelFromRole,
} from "@/lib/procurementRoles";
import { canProcurementSoftDelete } from "@/lib/procurementAccess";

const emptyForm = () => ({
  title: "",
  location: "",
  lines: [] as RequisitionLine[],
});

const PR_STATUS_FILTERS = [
  { value: "", label: "All approval statuses" },
  { value: "submitted", label: "Pending (submitted)" },
  { value: "partially_approved", label: "Partially approved" },
  { value: "approved", label: "Approved" },
  { value: "held", label: "On hold" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

const FULFILLMENT_FILTERS = [
  { value: "", label: "All purchase / delivery" },
  { value: "awaiting_po", label: "Awaiting purchase" },
  { value: "issued", label: "Purchased" },
  { value: "partial", label: "Partially delivered" },
  { value: "received", label: "Completed" },
  { value: "closed", label: "Completed (closed)" },
];

function linesToPayload(lines: RequisitionLine[], items: ProcurementItem[]) {
  return lines.map((line) => {
    const catalog = items.find((x) => x._id === line.item);
    return {
      item: line.item,
      itemCode: catalog?.itemCode || "",
      itemName: catalog?.name || "",
      unit: line.unit,
      description: line.description,
      department: line.department.trim(),
      quantity: Number(line.quantity) || 0,
      unitPrice: 0,
    };
  });
}

function departmentsFromLines(lines: RequisitionLine[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const dept = line.department.trim();
    if (!dept) continue;
    const key = dept.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dept);
  }
  return out;
}

function approvalStageLabel(stage?: string) {
  const s = String(stage || "department").toLowerCase();
  if (s === "finance") return "Finance";
  if (s === "boss") return "Boss";
  return "Dept";
}

function approvalProgressLabel(row: PurchaseDocument) {
  const approvals = row.approvals || [];
  if (!approvals.length) {
    if (row.status === "approved") return "1/1";
    if (row.status === "submitted" || row.status === "held") return "0/1";
    return "—";
  }
  const done = approvals.filter((a) => a.status === "approved").length;
  // Expected full chain = current rows, or at least depts + finance + boss once stages unlock
  const hasFinance = approvals.some((a) => String(a.stage || "").toLowerCase() === "finance");
  const hasBoss = approvals.some((a) => String(a.stage || "").toLowerCase() === "boss");
  const expected =
    hasFinance && hasBoss
      ? approvals.length
      : hasFinance
        ? approvals.length + 1
        : approvals.length + 2;
  return `${done}/${expected}`;
}

function requisitionToForm(row: PurchaseDocument): {
  title: string;
  location: string;
  lines: RequisitionLine[];
} {
  return {
    title: row.title || "",
    location: row.location || "",
    lines: (row.items || []).map((item) => ({
      item: typeof item.item === "string" ? item.item : "",
      quantity: String(item.quantity ?? 0),
      unit: item.unit || DEFAULT_ITEM_UNIT,
      description: item.description || item.itemName || "",
      department: item.department || (row.title || "").split(",")[0]?.trim() || "",
    })),
  };
}

type Props = { section: "local" | "import" };

export function RequisitionsView({ section }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PurchaseDocument[]>([]);
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertPr, setConvertPr] = useState<PurchaseDocument | null>(null);
  const [convertSupplier, setConvertSupplier] = useState("");
  const [converting, setConverting] = useState(false);
  const [accessLevel, setAccessLevel] = useState(() =>
    typeof window !== "undefined" ? accessLevelFromRole(localStorage.getItem("userRole")) : "user"
  );
  const [currentUserId, setCurrentUserId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("userId") || "" : ""
  );

  useEffect(() => {
    setAccessLevel(accessLevelFromRole(localStorage.getItem("userRole") || ""));
    setCurrentUserId(localStorage.getItem("userId") || "");
  }, []);

  const canApprove =
    accessLevel === "approver" || accessLevel === "creator_approver" || accessLevel === "admin";
  const canBulkImport =
    accessLevel !== "user" &&
    accessLevel !== "viewer" &&
    accessLevel !== "approver" &&
    accessLevel !== "creator_approver";
  const canCreate = accessLevel !== "viewer" && accessLevel !== "approver";
  // Requesters (and Requester & Approver) may create catalog items while raising a PR
  const canQuickAddItem =
    accessLevel === "user" ||
    accessLevel === "creator_approver" ||
    accessLevel === "buyer" ||
    accessLevel === "admin";
  const isOwnPr = (row: PurchaseDocument) => {
    if (!currentUserId) return false;
    const owner = row.requestedBy;
    const ownerId = typeof owner === "string" ? owner : owner?._id;
    return Boolean(ownerId && String(ownerId) === String(currentUserId));
  };

  const canConvertAnyApprovedPo = accessLevel === "buyer" || accessLevel === "admin";
  /** Buyers/admins: any approved PR. Requesters: only their own approved PRs. */
  const canConvertToPo = (row: PurchaseDocument) =>
    row.status === "approved" &&
    (canConvertAnyApprovedPo || (canCreate && isOwnPr(row)));

  /** Only the requester (or admin) may edit / submit / resubmit draft or rejected PRs */
  const canEditOrSubmitPr = (row: PurchaseDocument) => {
    if (!canCreate) return false;
    if (row.status !== "draft" && row.status !== "rejected") return false;
    if (accessLevel === "admin") return true;
    return isOwnPr(row);
  };

  /** Assigned approver (or admin) may amend content before approve / hold / reject */
  const canApproverAmendPr = (row: PurchaseDocument) =>
    canApprove &&
    (row.status === "submitted" || row.status === "held" || row.status === "partially_approved");

  const canOpenEditForm = (row: PurchaseDocument) => canEditOrSubmitPr(row) || canApproverAmendPr(row);
  const [viewingRow, setViewingRow] = useState<PurchaseDocument | null>(null);
  const [reviewAction, setReviewAction] = useState<{
    id: string;
    type: "reject" | "hold";
    label: string;
  } | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([...PR_DEPARTMENTS]);
  const [canDelete, setCanDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState<{
    id: string;
    status: string;
    note: string;
    location: string;
  } | null>(null);
  const [followUpSaving, setFollowUpSaving] = useState(false);

  useEffect(() => {
    setCanDelete(canProcurementSoftDelete());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await procurementApi.listRequisitions({
        purchaseType: purchaseTypeForSection(section),
        status: statusFilter || undefined,
        fulfillmentStatus: fulfillmentFilter || undefined,
      });
      setRows(filterRequisitionsBySection(res.data || [], section));
      setSelectedIds([]);

      const level = accessLevelFromRole(localStorage.getItem("userRole") || "");
      // Buyers/admins + requesters (who convert own approved PRs) need supplier picker
      const needSuppliers =
        level === "buyer" || level === "admin" || level === "user" || level === "creator_approver";

      const [itemsRes, deptRes, suplRes] = await Promise.all([
        procurementApi.listItems({ tradeScope: section }).catch(() => ({ data: [] as ProcurementItem[] })),
        procurementApi.listPrDepartments().catch(() => ({ data: [] as string[] })),
        needSuppliers
          ? procurementApi.listSuppliers().catch(() => ({ data: [] as ProcurementSupplier[] }))
          : Promise.resolve({ data: [] as ProcurementSupplier[] }),
      ]);
      setItems(filterItemsBySection(itemsRes.data || [], section));
      setSuppliers(filterSuppliersBySection(suplRes.data || [], section));
      const fromApi = Array.isArray(deptRes.data) ? deptRes.data : [];
      const merged = Array.from(new Set([...PR_DEPARTMENTS, ...fromApi])).sort((a, b) =>
        a.localeCompare(b)
      );
      setDepartmentOptions(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  }, [section, statusFilter, fulfillmentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || loading || !rows.length) return;
    const row = rows.find((r) => r._id === openId);
    if (!row) return;
    setViewingRow(row);
    router.replace(pathname, { scroll: false });
  }, [searchParams, rows, loading, pathname, router]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const deletePr = async (id: string, label: string) => {
    if (!window.confirm(`Delete requisition ${label}? It will be hidden from lists (soft delete).`)) return;
    setError("");
    try {
      await procurementApi.deleteRequisition(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const bulkDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected requisition(s)? They will be hidden from lists (soft delete).`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError("");
    try {
      await procurementApi.bulkDeleteRequisitions(selectedIds);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : rows.map((r) => r._id));
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openRequisition = async (row: PurchaseDocument) => {
    setError("");
    const editable = canOpenEditForm(row);
    if (!editable) {
      try {
        const res = await procurementApi.getRequisition(row._id);
        setViewingRow(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load requisition");
      }
      return;
    }
    try {
      const res = await procurementApi.getRequisition(row._id);
      setEditingId(row._id);
      setForm(requisitionToForm(res.data));
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition");
    }
  };

  const openApproverEditFromView = async () => {
    if (!viewingRow) return;
    setError("");
    try {
      const res = await procurementApi.getRequisition(viewingRow._id);
      setEditingId(viewingRow._id);
      setForm(requisitionToForm(res.data));
      setViewingRow(null);
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition");
    }
  };

  const runReviewAction = async () => {
    if (!reviewAction) return;
    const reason = reviewReason.trim();
    if (!reason) {
      setError(`${reviewAction.type === "reject" ? "Rejection" : "Hold"} reason is required`);
      return;
    }
    setReviewSaving(true);
    setError("");
    try {
      if (reviewAction.type === "reject") {
        await procurementApi.rejectRequisition(reviewAction.id, reason);
      } else {
        await procurementApi.holdRequisition(reviewAction.id, reason);
      }
      setReviewAction(null);
      setReviewReason("");
      if (viewingRow?._id === reviewAction.id) setViewingRow(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setReviewSaving(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lines.length === 0) {
      setError("Add at least one line item");
      return;
    }
    if (form.lines.some((l) => !l.item)) {
      setError("Select an item on every line");
      return;
    }
    if (form.lines.some((l) => !l.department.trim())) {
      setError("Select a department on every line");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const purchaseType = purchaseTypeForSection(section);
      const depts = departmentsFromLines(form.lines);
      const body = {
        title: depts.join(", ") || form.title.trim(),
        purchaseType,
        currency: purchaseType === "local" ? "PKR" : "USD",
        exchangeRate: 1,
        taxAmount: 0,
        location: form.location.trim(),
        items: linesToPayload(form.lines, items),
        ...(editingId ? {} : { status: "draft" }),
      };
      if (editingId) await procurementApi.updateRequisition(editingId, body);
      else await procurementApi.createRequisition(body);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const lineCount = (row: PurchaseDocument) => row.items?.length ?? 0;

  const auditRows = (row: PurchaseDocument) => {
    const rows: Array<{ label: string; by?: string; at?: string }> = [
      { label: "Created", by: procurementUserLabel(row.requestedBy), at: row.createdAt },
    ];
    if (row.submittedAt || row.submittedBy) {
      rows.push({ label: "Submitted", by: procurementUserLabel(row.submittedBy), at: row.submittedAt });
    }
    if (row.assignedApprover) {
      rows.push({ label: "Assigned to", by: procurementUserLabel(row.assignedApprover) });
    }
    if (row.approvals?.length) {
      for (const a of row.approvals) {
        rows.push({
          label: `${a.department} (${a.status})`,
          by: procurementUserLabel(a.approver),
          at: a.actedAt,
        });
      }
    }
    if (row.status === "approved" || row.approvedAt || row.approvedBy) {
      rows.push({ label: "Fully approved", by: procurementUserLabel(row.approvedBy), at: row.approvedAt });
    }
    if (row.status === "rejected" || row.rejectedAt || row.rejectedBy) {
      rows.push({ label: "Rejected", by: procurementUserLabel(row.rejectedBy), at: row.rejectedAt });
    }
    if (row.status === "held" || row.heldAt || row.heldBy) {
      rows.push({ label: "Held", by: procurementUserLabel(row.heldBy), at: row.heldAt });
    }
    if (row.updatedAt && row.updatedAt !== row.createdAt) {
      rows.push({ label: "Last updated", at: row.updatedAt });
    }
    return rows;
  };

  return (
    <PageShell
      title={pageTitle(section, "pr")}
      summary={loading ? undefined : recordTotalLabel(rows.length, "requisition", "requisitions")}
      onBulkImport={canBulkImport ? () => setShowBulkImport(true) : undefined}
      onAdd={canCreate ? openCreate : undefined}
    >
      {error ? <Alert message={error} /> : null}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 mb-3">
        <label className="text-xs text-blue-800 dark:text-blue-200 w-full sm:w-auto">
          Approval status
          <select
            className={`${procurementFieldClass} mt-1 w-full sm:min-w-[11rem]`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {PR_STATUS_FILTERS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-blue-800 dark:text-blue-200 w-full sm:w-auto">
          Purchase / delivery
          <select
            className={`${procurementFieldClass} mt-1 w-full sm:min-w-[12rem]`}
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
          >
            {FULFILLMENT_FILTERS.map((o) => (
              <option key={o.value || "all-f"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {canDelete && selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">{selectedIds.length} selected</p>
          <button
            type="button"
            disabled={bulkDeleting}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
            onClick={bulkDeleteSelected}
          >
            {bulkDeleting ? "Deleting..." : "Bulk delete"}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-sm hover:bg-blue-50"
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </button>
        </div>
      ) : null}
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          onRowClick={(index) => openRequisition(rows[index])}
          headers={
            canDelete
              ? [
                  <input
                    key="select-all"
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all requisitions"
                    className="h-4 w-4 accent-blue-600"
                    onChange={toggleSelectAll}
                  />,
                  "PR #",
                  "Departments",
                  "Location",
                  "Created",
                  "Created by",
                  "Submitted at",
                  "Approvals",
                  "Assigned to",
                  "Status",
                  "Purchase / delivery",
                  "Follow-up",
                  "Actions",
                ]
              : [
                  "PR #",
                  "Departments",
                  "Location",
                  "Created",
                  "Created by",
                  "Submitted at",
                  "Approvals",
                  "Assigned to",
                  "Status",
                  "Purchase / delivery",
                  "Follow-up",
                  "Actions",
                ]
          }
          rows={rows.map((r) => {
            const actionCell = (
              <span key={`act-${r._id}`} className="flex flex-wrap gap-2">
                {canEditOrSubmitPr(r) ? (
                  <button
                    type="button"
                    className="text-blue-600 text-xs dark:text-blue-300"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setError("");
                      try {
                        await procurementApi.submitRequisition(r._id);
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Submit failed");
                      }
                    }}
                  >
                    {r.status === "rejected" ? "Resubmit" : "Submit"}
                  </button>
                ) : null}
                {canConvertToPo(r) ? (
                  <button
                    type="button"
                    className="text-indigo-600 text-xs dark:text-indigo-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvertSupplier("");
                      setConvertPr(r);
                    }}
                  >
                    Create PO
                  </button>
                ) : null}
                {canApproverAmendPr(r) ? (
                  <button
                    type="button"
                    className="text-blue-600 text-xs dark:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openRequisition(r);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {canApprove &&
                (r.status === "submitted" || r.status === "partially_approved") ? (
                  <>
                    <button
                      type="button"
                      className="text-green-700 text-xs dark:text-green-300"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await procurementApi.approveRequisition(r._id);
                        await load();
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="text-amber-700 text-xs dark:text-amber-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewReason("");
                        setReviewAction({ id: r._id, type: "hold", label: r.requisitionNumber || r._id });
                      }}
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      className="text-red-700 text-xs dark:text-red-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewReason("");
                        setReviewAction({ id: r._id, type: "reject", label: r.requisitionNumber || r._id });
                      }}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {canApprove && r.status === "held" ? (
                  <>
                    <button
                      type="button"
                      className="text-green-700 text-xs dark:text-green-300"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await procurementApi.approveRequisition(r._id);
                        await load();
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="text-blue-700 text-xs dark:text-blue-300"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await procurementApi.releaseRequisitionHold(r._id);
                        await load();
                      }}
                    >
                      Release
                    </button>
                    <button
                      type="button"
                      className="text-red-700 text-xs dark:text-red-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewReason("");
                        setReviewAction({ id: r._id, type: "reject", label: r.requisitionNumber || r._id });
                      }}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="text-slate-700 text-xs dark:text-slate-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFollowUpDraft({
                      id: r._id,
                      status: r.followUpStatus || (r.status === "held" || r.status === "submitted" ? "open" : ""),
                      note: r.followUpNote || "",
                      location: r.location || "",
                    });
                  }}
                >
                  Follow-up
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    className="text-red-600 text-xs dark:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deletePr(r._id, r.requisitionNumber || "this PR");
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </span>
            );

            const baseCells = [
              r.requisitionNumber || "—",
              r.title || "—",
              r.location || "—",
              procurementDateTime(r.createdAt),
              procurementUserLabel(r.requestedBy),
              procurementDateTime(r.submittedAt),
              approvalProgressLabel(r),
              r.assignedApprover ? procurementUserLabel(r.assignedApprover) : "—",
              <StatusBadge key={`st-${r._id}`} status={r.status} />,
              r.fulfillmentLabel || r.stockStatus ? (
                <StatusBadge
                  key={`ff-${r._id}`}
                  status={r.stockStatus || r.fulfillmentStatus || "n_a"}
                  label={r.fulfillmentLabel || undefined}
                />
              ) : (
                "—"
              ),
              r.followUpStatus ? <StatusBadge key={`fu-${r._id}`} status={r.followUpStatus} /> : "—",
              actionCell,
            ];

            if (!canDelete) return baseCells;

            return [
              <input
                key={`chk-${r._id}`}
                type="checkbox"
                checked={selectedIds.includes(r._id)}
                aria-label={`Select ${r.requisitionNumber || r._id}`}
                className="h-4 w-4 accent-blue-600"
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelectOne(r._id)}
              />,
              ...baseCells,
            ];
          })}
        />
      )}
      {showForm ? (
        <Modal
          title={
            editingId
              ? (() => {
                  const row = rows.find((r) => r._id === editingId);
                  return row && canApproverAmendPr(row)
                    ? "Edit requisition (before decision)"
                    : "Edit requisition";
                })()
              : "New requisition"
          }
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={save} className="space-y-4">
            <Field
              label="Location / site (optional)"
              value={form.location}
              onChange={(location) => setForm({ ...form, location })}
              placeholder="e.g. Lahore plant, Karachi store"
            />
            <FormLabel>
              Default department (for new lines)
              <div className="mt-1">
                <TermSelect
                  value={form.title}
                  onChange={(title) => setForm({ ...form, title })}
                  options={departmentOptions}
                  placeholder="Optional — pre-fills new lines"
                  allowAdd
                  addLabel="+ Add department…"
                  onCustomAdd={async (department) => {
                    await procurementApi.ensureDepartmentMappedToMe(department);
                    setDepartmentOptions((prev) =>
                      prev.includes(department) ? prev : [...prev, department].sort((a, b) => a.localeCompare(b))
                    );
                  }}
                />
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                  Set a department on <strong>each line</strong>. New departments you add are mapped to
                  you as approver automatically.
                </p>
              </div>
            </FormLabel>
            <RequisitionLineEditor
              lines={form.lines}
              items={items}
              tradeScope={section}
              departmentOptions={departmentOptions}
              defaultDepartment={form.title}
              allowQuickAdd={canQuickAddItem}
              onItemCreated={(item) => setItems((prev) => [...prev, item])}
              onDepartmentCreated={async (department) => {
                await procurementApi.ensureDepartmentMappedToMe(department);
                setDepartmentOptions((prev) =>
                  prev.includes(department) ? prev : [...prev, department].sort((a, b) => a.localeCompare(b))
                );
              }}
              onChange={(lines) => setForm({ ...form, lines })}
            />
            <footer className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={procurementSecondaryButtonClass}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
      {viewingRow ? (
        <Modal title={`Requisition ${viewingRow.requisitionNumber || ""}`} onClose={() => setViewingRow(null)}>
          <div className="space-y-3 text-sm text-blue-800 dark:text-blue-100">
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Departments:</span>{" "}
              {viewingRow.title || "—"}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Location:</span>{" "}
              {viewingRow.location || "—"}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Status:</span>{" "}
              <StatusBadge status={viewingRow.status} />
              {viewingRow.approvals?.length ? (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
                  Approvals {approvalProgressLabel(viewingRow)}
                </span>
              ) : null}
            </p>
            {viewingRow.fulfillmentLabel || viewingRow.stockStatus ? (
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-blue-900 dark:text-blue-200">Purchase / delivery:</span>
                <StatusBadge
                  status={viewingRow.stockStatus || viewingRow.fulfillmentStatus || "n_a"}
                  label={viewingRow.fulfillmentLabel || undefined}
                />
                {viewingRow.poNumber ? (
                  <span className="text-xs">PO {viewingRow.poNumber}</span>
                ) : null}
              </p>
            ) : null}
            {(viewingRow.followUpStatus || viewingRow.followUpNote) && (
              <p>
                <span className="font-medium text-blue-900 dark:text-blue-200">Follow-up:</span>{" "}
                {viewingRow.followUpStatus ? <StatusBadge status={viewingRow.followUpStatus} /> : null}{" "}
                {viewingRow.followUpNote || ""}
                {viewingRow.followUpBy ? (
                  <span className="text-xs"> · {procurementUserLabel(viewingRow.followUpBy)}</span>
                ) : null}
              </p>
            )}
            {viewingRow.approvals?.length ? (
              <div>
                <p className="font-medium mb-2 text-blue-900 dark:text-blue-200">
                  Approval chain (departments → finance → boss)
                </p>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                  {viewingRow.approvals.map((a, i) => (
                    <li key={a._id || `${a.department}-${i}`} className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                        {approvalStageLabel(a.stage)}
                      </span>
                      <span className="font-medium">{a.department}</span>
                      <StatusBadge status={a.status} />
                      <span>{procurementUserLabel(a.approver)}</span>
                      {a.actedAt ? <span className="text-xs">{procurementDateTime(a.actedAt)}</span> : null}
                      {a.reason ? <span className="text-xs">({a.reason})</span> : null}
                    </li>
                  ))}
                </ul>
                {!viewingRow.approvals.some((a) => String(a.stage || "").toLowerCase() === "finance") ? (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                    After all departments approve → Finance Manager, then Boss.
                  </p>
                ) : !viewingRow.approvals.some((a) => String(a.stage || "").toLowerCase() === "boss") ? (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                    After Finance Manager approves → Boss for final approval.
                  </p>
                ) : null}
              </div>
            ) : null}
            {viewingRow.rejectionReason ? (
              <p>
                <span className="font-medium text-blue-900 dark:text-blue-200">Rejection reason:</span>{" "}
                {viewingRow.rejectionReason}
              </p>
            ) : null}
            {viewingRow.holdReason ? (
              <p>
                <span className="font-medium text-blue-900 dark:text-blue-200">Hold reason:</span>{" "}
                {viewingRow.holdReason}
              </p>
            ) : null}
            <div>
              <p className="font-medium mb-2 text-blue-900 dark:text-blue-200">History</p>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                {auditRows(viewingRow).map((entry) => (
                  <li key={entry.label}>
                    <span className="font-medium text-blue-900 dark:text-blue-200">{entry.label}:</span>{" "}
                    {entry.by ? `${entry.by}` : ""}
                    {entry.by && entry.at ? " · " : ""}
                    {entry.at ? procurementDateTime(entry.at) : !entry.by ? "—" : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2 text-blue-900 dark:text-blue-200">Line items ({lineCount(viewingRow)})</p>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                {(viewingRow.items || []).map((item, i) => (
                  <li key={i}>
                    {item.department ? `[${item.department}] ` : ""}
                    {item.itemName || item.itemCode || "Item"} — {item.quantity} {item.unit}
                    {item.description ? ` (${item.description})` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <footer className="flex justify-end gap-2 pt-2">
              {canApproverAmendPr(viewingRow) ? (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                  onClick={() => void openApproverEditFromView()}
                >
                  Edit before decision
                </button>
              ) : null}
              {canApprove &&
              (viewingRow.status === "submitted" || viewingRow.status === "partially_approved") ? (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm"
                    onClick={async () => {
                      await procurementApi.approveRequisition(viewingRow._id);
                      setViewingRow(null);
                      await load();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm"
                    onClick={() => {
                      setReviewReason("");
                      setReviewAction({
                        id: viewingRow._id,
                        type: "hold",
                        label: viewingRow.requisitionNumber || viewingRow._id,
                      });
                    }}
                  >
                    Hold
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                    onClick={() => {
                      setReviewReason("");
                      setReviewAction({
                        id: viewingRow._id,
                        type: "reject",
                        label: viewingRow.requisitionNumber || viewingRow._id,
                      });
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : null}
              {canApprove && viewingRow.status === "held" ? (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm"
                    onClick={async () => {
                      await procurementApi.approveRequisition(viewingRow._id);
                      setViewingRow(null);
                      await load();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                    onClick={async () => {
                      await procurementApi.releaseRequisitionHold(viewingRow._id);
                      setViewingRow(null);
                      await load();
                    }}
                  >
                    Release hold
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                    onClick={() => {
                      setReviewReason("");
                      setReviewAction({
                        id: viewingRow._id,
                        type: "reject",
                        label: viewingRow.requisitionNumber || viewingRow._id,
                      });
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={procurementSecondaryButtonClass}
                onClick={() => setViewingRow(null)}
              >
                Close
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}
      {reviewAction ? (
        <Modal
          title={reviewAction.type === "reject" ? "Reject requisition" : "Hold requisition"}
          onClose={() => {
            setReviewAction(null);
            setReviewReason("");
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-blue-800 dark:text-blue-100">
              {reviewAction.type === "reject"
                ? `Provide a reason for rejecting ${reviewAction.label}. The requester can edit and resubmit.`
                : `Provide a reason for holding ${reviewAction.label}. You can release, approve, or reject later.`}
            </p>
            <Field
              label="Reason"
              value={reviewReason}
              onChange={setReviewReason}
              required
              placeholder={reviewAction.type === "reject" ? "e.g. Budget not approved" : "e.g. Need vendor quote"}
            />
            <footer className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={procurementSecondaryButtonClass}
                onClick={() => {
                  setReviewAction(null);
                  setReviewReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewSaving}
                className={`px-4 py-2 rounded-lg text-white ${
                  reviewAction.type === "reject" ? "bg-red-600" : "bg-amber-600"
                }`}
                onClick={runReviewAction}
              >
                {reviewSaving ? "Saving..." : reviewAction.type === "reject" ? "Reject" : "Hold"}
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}
      {convertPr ? (
        <Modal
          title={`Create PO from ${convertPr.requisitionNumber || "PR"}`}
          onClose={() => setConvertPr(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Select the supplier for this purchase order. A draft PO will be created from the approved PR lines.
            </p>
            <div>
              <FormLabel>Supplier</FormLabel>
              <SupplierSelect
                section={section}
                suppliers={suppliers}
                value={convertSupplier}
                onChange={setConvertSupplier}
              />
            </div>
            <footer className="flex justify-end gap-2 pt-2">
              <button type="button" className={procurementSecondaryButtonClass} onClick={() => setConvertPr(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={converting || !convertSupplier}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50"
                onClick={async () => {
                  setConverting(true);
                  setError("");
                  try {
                    await procurementApi.convertRequisitionToPO(convertPr._id, { supplier: convertSupplier });
                    setConvertPr(null);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Convert failed");
                  } finally {
                    setConverting(false);
                  }
                }}
              >
                {converting ? "Creating…" : "Create draft PO"}
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}
      {followUpDraft ? (
        <Modal
          title="PR follow-up"
          onClose={() => {
            setFollowUpDraft(null);
          }}
        >
          <div className="space-y-3">
            <p className="text-sm text-blue-800 dark:text-blue-100">
              Track pending / on-hold follow-up without changing approval status.
            </p>
            <FormLabel>
              Follow-up status
              <select
                className={`${procurementFieldClass} mt-1`}
                value={followUpDraft.status}
                onChange={(e) => setFollowUpDraft({ ...followUpDraft, status: e.target.value })}
              >
                <option value="">None</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </FormLabel>
            <Field
              label="Follow-up note"
              value={followUpDraft.note}
              onChange={(note) => setFollowUpDraft({ ...followUpDraft, note })}
              placeholder="Next action, owner context, deadline…"
            />
            <Field
              label="Location / site"
              value={followUpDraft.location}
              onChange={(location) => setFollowUpDraft({ ...followUpDraft, location })}
              placeholder="Optional location"
            />
            <footer className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={procurementSecondaryButtonClass}
                onClick={() => setFollowUpDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={followUpSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={async () => {
                  setFollowUpSaving(true);
                  setError("");
                  try {
                    await procurementApi.updateRequisitionFollowUp(followUpDraft.id, {
                      followUpStatus: followUpDraft.status,
                      followUpNote: followUpDraft.note,
                      location: followUpDraft.location,
                    });
                    setFollowUpDraft(null);
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Follow-up update failed");
                  } finally {
                    setFollowUpSaving(false);
                  }
                }}
              >
                {followUpSaving ? "Saving…" : "Save follow-up"}
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}
      {canBulkImport ? (
        <BulkImportModal
          entity="requisitions"
          section={section}
          open={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onSuccess={load}
        />
      ) : null}
    </PageShell>
  );
}
