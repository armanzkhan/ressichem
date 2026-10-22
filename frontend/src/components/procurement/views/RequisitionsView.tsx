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
  /** Per PR-line vendor chosen at Create PO time (keyed by line index). */
  const [convertLineVendors, setConvertLineVendors] = useState<Record<number, string>>({});
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
  /**
   * Buyers/admins: any approved PR. Requesters: only their own approved PRs.
   * Hide once a PO already exists (drafting / purchased / delivered). Allow again if the only PO was cancelled.
   */
  const canConvertToPo = (row: PurchaseDocument) => {
    if (row.status !== "approved") return false;
    if (!(canConvertAnyApprovedPo || (canCreate && isOwnPr(row)))) return false;
    const fulfillment = String(row.fulfillmentStatus || row.stockStatus || "awaiting_po").toLowerCase();
    const alreadyHasPo = ["po_draft", "issued", "partial", "received", "closed"].includes(fulfillment);
    return !alreadyHasPo;
  };

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

  /** Table rows only — keep this light so filters feel fast */
  const loadRows = useCallback(async () => {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  }, [section, statusFilter, fulfillmentFilter]);

  /** Catalogs once per section — not on every status/fulfillment filter change */
  const loadCatalogs = useCallback(async () => {
    try {
      const [itemsRes, deptRes] = await Promise.all([
        procurementApi.listItems({ tradeScope: section }).catch(() => ({ data: [] as ProcurementItem[] })),
        procurementApi.listPrDepartments().catch(() => ({ data: [] as string[] })),
      ]);
      setItems(filterItemsBySection(itemsRes.data || [], section));
      const fromApi = Array.isArray(deptRes.data) ? deptRes.data : [];
      const merged = Array.from(new Set([...PR_DEPARTMENTS, ...fromApi])).sort((a, b) =>
        a.localeCompare(b)
      );
      setDepartmentOptions(merged);
    } catch {
      /* non-blocking for the table */
    }
  }, [section]);

  const ensureSuppliersLoaded = useCallback(async () => {
    if (suppliers.length) return;
    try {
      const suplRes = await procurementApi.listSuppliers();
      setSuppliers(filterSuppliersBySection(suplRes.data || [], section));
    } catch {
      setSuppliers([]);
    }
  }, [suppliers.length, section]);

  const load = useCallback(async () => {
    await Promise.all([loadRows(), loadCatalogs()]);
  }, [loadRows, loadCatalogs]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

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

  const openConvertToPo = async (row: PurchaseDocument) => {
    setError("");
    setConvertLineVendors({});
    setConvertPr(row);
    try {
      const [res] = await Promise.all([
        procurementApi.getRequisition(row._id),
        ensureSuppliersLoaded(),
      ]);
      setConvertPr(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition details");
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
            className={`${procurementSecondaryButtonClass} !min-h-0 px-3 py-1.5`}
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
                  "Status",
                  "Delivery",
                  "Assigned",
                  "Actions",
                ]
              : ["PR #", "Departments", "Status", "Delivery", "Assigned", "Actions"]
          }
          rows={rows.map((r) => {
            const actionCell = (
              <span key={`act-${r._id}`} className="flex flex-wrap gap-x-2 gap-y-1 max-w-[14rem]">
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
                      void openConvertToPo(r);
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

            const dept = r.title || "—";
            const baseCells = [
              r.requisitionNumber || "—",
              <span key={`dept-${r._id}`} className="block max-w-[9rem] truncate" title={dept}>
                {dept}
              </span>,
              <StatusBadge key={`st-${r._id}`} status={r.status} />,
              r.stockStatus || r.fulfillmentStatus ? (
                <span key={`ff-${r._id}`} className="inline-flex flex-col gap-0.5">
                  <StatusBadge status={r.stockStatus || r.fulfillmentStatus || "n_a"} />
                  {r.status === "approved" && (r.linesTotal || 0) > 0 ? (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {r.linesProcessed || 0}/{r.linesTotal} processed
                    </span>
                  ) : null}
                </span>
              ) : (
                "—"
              ),
              <span
                key={`asg-${r._id}`}
                className="block max-w-[7rem] truncate"
                title={r.assignedApprover ? procurementUserLabel(r.assignedApprover) : ""}
              >
                {r.assignedApprover ? procurementUserLabel(r.assignedApprover) : "—"}
              </span>,
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
                {(viewingRow.items || []).map((item, i) => {
                  const lineStatus = item.lineFulfillmentStatus || "n_a";
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <span>
                        {item.department ? `[${item.department}] ` : ""}
                        {item.itemName || item.itemCode || "Item"} — {item.quantity} {item.unit}
                        {item.description ? ` (${item.description})` : ""}
                      </span>
                      {viewingRow.status === "approved" ? (
                        <StatusBadge
                          status={lineStatus}
                          label={item.lineFulfillmentLabel || undefined}
                        />
                      ) : null}
                      {item.processed && (item.qtyReceived || 0) > 0 ? (
                        <span className="text-[11px] text-slate-500 dark:text-slate-300">
                          recv {item.qtyReceived}/{item.qtyOrdered || item.quantity}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
                {viewingRow.status === "approved" && (viewingRow.linesTotal || 0) > 0 ? (
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Processed lines: {viewingRow.linesProcessed || 0}/{viewingRow.linesTotal}
                    {viewingRow.poNumber ? ` · PO ${viewingRow.poNumber}` : ""}
                  </p>
                ) : null}
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
          onClose={() => {
            setConvertPr(null);
            setConvertLineVendors({});
          }}
          wide
        >
          {(() => {
            const prLines = convertPr.items || [];
            const scopedSuppliers = filterSuppliersBySection(suppliers, section);
            const allLinesHaveVendor =
              prLines.length > 0 && prLines.every((_, i) => Boolean(convertLineVendors[i]));
            const uniqueVendors = [
              ...new Set(Object.values(convertLineVendors).filter(Boolean)),
            ];
            const applyVendorToAll = (supplierId: string) => {
              const next: Record<number, string> = {};
              prLines.forEach((_, i) => {
                next[i] = supplierId;
              });
              setConvertLineVendors(next);
            };
            return (
              <div className="space-y-4">
                <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-blue-900 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-100">
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        PR #
                      </dt>
                      <dd className="font-semibold">{convertPr.requisitionNumber || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Status
                      </dt>
                      <dd>
                        <StatusBadge status={convertPr.status} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Departments
                      </dt>
                      <dd>{convertPr.title || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Location
                      </dt>
                      <dd>{convertPr.location || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Requested by
                      </dt>
                      <dd>{procurementUserLabel(convertPr.requestedBy)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Submitted
                      </dt>
                      <dd>{procurementDateTime(convertPr.submittedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Type / currency
                      </dt>
                      <dd>
                        {convertPr.purchaseType || "—"} · {convertPr.currency || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-blue-500 dark:text-blue-400">
                        Lines
                      </dt>
                      <dd>{prLines.length}</dd>
                    </div>
                  </dl>
                  {convertPr.notes ? (
                    <p className="mt-3 border-t border-blue-100 pt-2 text-xs dark:border-slate-700">
                      <span className="font-medium">Notes:</span> {convertPr.notes}
                    </p>
                  ) : null}
                </section>

                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Assign a vendor on each line below, then create <strong>one draft PO</strong>. Different
                  vendors stay on the same PO.
                </p>

                {prLines.length > 1 ? (
                  <div>
                    <FormLabel>Apply one vendor to all lines</FormLabel>
                    <SupplierSelect
                      section={section}
                      suppliers={scopedSuppliers}
                      value=""
                      onChange={applyVendorToAll}
                      onSupplierCreated={(supplier) => {
                        setSuppliers((prev) =>
                          prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]
                        );
                        applyVendorToAll(supplier._id);
                      }}
                      placeholder="Optional shortcut…"
                    />
                  </div>
                ) : null}

                <section className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                  {prLines.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-200 px-3 py-4 text-sm text-amber-800 dark:border-amber-900 dark:text-amber-200">
                      This PR has no line items — cannot create a PO.
                    </p>
                  ) : (
                    prLines.map((item, i) => (
                      <article
                        key={item._id || i}
                        className="rounded-xl border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-blue-950 dark:text-blue-50">
                              Line {i + 1}: {item.itemName || item.itemCode || "Item"}
                            </p>
                            <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-300">
                              {[
                                item.itemCode ? `Code ${item.itemCode}` : null,
                                `${item.quantity ?? 0} ${item.unit || ""}`.trim(),
                                item.department ? `Dept: ${item.department}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </header>
                        {item.description ? (
                          <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                            {item.description}
                          </p>
                        ) : null}
                        <FormLabel>
                          Vendor <span className="text-red-600">*</span>
                          <div className="mt-1">
                            <SupplierSelect
                              required
                              section={section}
                              suppliers={scopedSuppliers}
                              value={convertLineVendors[i] || ""}
                              onChange={(supplierId) =>
                                setConvertLineVendors((prev) => ({ ...prev, [i]: supplierId }))
                              }
                              onSupplierCreated={(supplier) => {
                                setSuppliers((prev) =>
                                  prev.some((s) => s._id === supplier._id) ? prev : [...prev, supplier]
                                );
                                setConvertLineVendors((prev) => ({ ...prev, [i]: supplier._id }));
                              }}
                              placeholder="Select vendor for this line…"
                            />
                          </div>
                        </FormLabel>
                      </article>
                    ))
                  )}
                </section>

                {uniqueVendors.length > 1 ? (
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    {uniqueVendors.length} vendors selected — all will appear on the draft PO.
                  </p>
                ) : null}

                <footer className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className={procurementSecondaryButtonClass}
                    onClick={() => {
                      setConvertPr(null);
                      setConvertLineVendors({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={converting || !allLinesHaveVendor}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50"
                    onClick={async () => {
                      setConverting(true);
                      setError("");
                      try {
                        const lineSuppliers = prLines.map((_, i) => convertLineVendors[i]);
                        await procurementApi.convertRequisitionToPO(convertPr._id, {
                          supplier: lineSuppliers[0],
                          lineSuppliers,
                        });
                        setConvertPr(null);
                        setConvertLineVendors({});
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
            );
          })()}
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
