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
import { canProcurementSoftDelete, hasPrFullAccess } from "@/lib/procurementAccess";

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
  if (s === "lab") return "Lab";
  if (s === "finance") return "Finance";
  if (s === "boss") return "Final";
  return "Dept";
}

function slaBadge(row: PurchaseDocument) {
  const status = String(row.slaStatus || "").toLowerCase();
  if (!status || status === "n_a" || status === "disabled") return null;
  const label = row.slaLabel || status;
  if (status === "overdue" || status === "closed_by_sla") {
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800 dark:bg-red-950/50 dark:text-red-200">
        {label}
      </span>
    );
  }
  if (status === "due_24h" || status === "due_today_urgent") {
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {label}
      </span>
    );
  }
  if (status === "on_hold") {
    return (
      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
        {label}
      </span>
    );
  }
  if (status === "due_48h" || status === "due_today" || status === "on_track") {
    return (
      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
        {label}
      </span>
    );
  }
  return null;
}

function approvalChainKey(row: PurchaseDocument) {
  const key = String(row.approvalChain || "").toLowerCase();
  if (key === "lab_then_finance" || key === "skip_finance" || key === "standard") return key;
  if (row.skipFinanceApproval) return "skip_finance";
  return "standard";
}

/** Lahore may be sticky flag, location, title, or department (e.g. "Administration (Lahore)"). */
function isLahorePr(row?: {
  location?: string;
  title?: string;
  lahoreFinalApproval?: boolean;
  items?: { department?: string }[];
}) {
  const hasLahore = (value?: string) => {
    const s = String(value || "").trim();
    return /\blahore\b/i.test(s) || /\blhr\b/i.test(s);
  };
  if (!row) return false;
  if (row.lahoreFinalApproval) return true;
  if (hasLahore(row.location) || hasLahore(row.title)) return true;
  return (row.items || []).some((line) => hasLahore(line.department));
}

/** Corporate steps that unlock after departments (shown even before rows exist). */
function plannedCorporateStages(row: PurchaseDocument): Array<{
  stage: string;
  department: string;
  email: string;
}> {
  const chain = approvalChainKey(row);
  const lahore = isLahorePr(row);
  const finance = lahore
    ? {
        stage: "finance",
        department: "Finance Manager (Lahore)",
        email: "tahira@ressichem.com",
      }
    : {
        stage: "finance",
        department: "Finance Manager",
        email: "finance@ressichem.com",
      };
  if (chain === "lab_then_finance") {
    return [{ stage: "lab", department: "Lab", email: "lab@ressichem.com" }, finance];
  }
  if (chain === "skip_finance") {
    return lahore
      ? [{ stage: "boss", department: "Lahore Final Approver", email: "tahira@ressichem.com" }]
      : [{ stage: "boss", department: "Final Approver", email: "khuzema@ressichem.com" }];
  }
  return [finance];
}

function approvalProgressLabel(row: PurchaseDocument) {
  const approvals = row.approvals || [];
  if (!approvals.length) {
    if (row.status === "approved") return "1/1";
    if (row.status === "submitted" || row.status === "held") return "0/1";
    return "—";
  }
  const done = approvals.filter((a) => a.status === "approved").length;
  const planned = plannedCorporateStages(row);
  const present = new Set(
    approvals.map((a) => String(a.stage || "department").toLowerCase())
  );
  const missing = planned.filter((p) => !present.has(p.stage)).length;
  const expected = approvals.length + missing;
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
  const [editingMeta, setEditingMeta] = useState<{
    requisitionNumber: string;
    createdBy: string;
  } | null>(null);
  const [convertPr, setConvertPr] = useState<PurchaseDocument | null>(null);
  /** Per PR-line unit price at Create PO time (keyed by line index). */
  const [convertLinePrices, setConvertLinePrices] = useState<Record<number, string>>({});
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

  const prFullAccess = typeof window !== "undefined" ? hasPrFullAccess() : false;
  const canBulkImport =
    accessLevel !== "user" &&
    accessLevel !== "viewer" &&
    accessLevel !== "approver" &&
    accessLevel !== "creator_approver";
  const canCreate = prFullAccess || (accessLevel !== "viewer" && accessLevel !== "approver");
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

  const approvalActorId = (approver: PurchaseDocument["assignedApprover"]) =>
    typeof approver === "string" ? approver : approver?._id;

  /**
   * Approve / Hold / Reject when this user has a pending row on the same stage as
   * the current assignee. Several departments can be pending together; Assigned
   * only stores the first person, so the others must still be able to act.
   * A later stage (finance / lab / final) stays locked until that stage is current.
   */
  const isPendingApproverOnPr = (row: PurchaseDocument) => {
    if (!currentUserId) return false;
    const open = ["submitted", "held", "partially_approved"].includes(String(row.status || ""));
    if (!open) return false;
    const approvals = row.approvals || [];
    const isOpenStatus = (status?: string) => status === "pending" || status === "held";
    const mine = approvals.filter((a) => {
      const id = approvalActorId(a.approver);
      return Boolean(id && String(id) === String(currentUserId) && isOpenStatus(a.status));
    });
    const assigned = approvalActorId(row.assignedApprover);
    if (assigned && String(assigned) === String(currentUserId)) return true;
    if (!mine.length) return false;
    if (!assigned) return true;
    const assignedOpen = approvals.find((a) => {
      const id = approvalActorId(a.approver);
      return Boolean(id && String(id) === String(assigned) && isOpenStatus(a.status));
    });
    const stage = String(assignedOpen?.stage || "department").toLowerCase();
    return mine.some((a) => String(a.stage || "department").toLowerCase() === stage);
  };

  const currentStageAssigneeLabel = (row: PurchaseDocument) => {
    const approvals = row.approvals || [];
    const isOpenStatus = (status?: string) => status === "pending" || status === "held";
    const openRows = approvals.filter((a) => isOpenStatus(a.status));
    if (!openRows.length) return row.assignedApprover ? procurementUserLabel(row.assignedApprover) : "—";
    const assigned = approvalActorId(row.assignedApprover);
    const assignedOpen = openRows.find((a) => {
      const id = approvalActorId(a.approver);
      return Boolean(assigned && id && String(id) === String(assigned));
    });
    const stage = String(assignedOpen?.stage || openRows[0]?.stage || "department").toLowerCase();
    const names: string[] = [];
    const seen = new Set<string>();
    for (const rowApproval of openRows) {
      if (String(rowApproval.stage || "department").toLowerCase() !== stage) continue;
      const label = procurementUserLabel(rowApproval.approver);
      const key = label.toLowerCase();
      if (!label || label === "—" || seen.has(key)) continue;
      seen.add(key);
      names.push(label);
    }
    if (names.length) return names.join(", ");
    return row.assignedApprover ? procurementUserLabel(row.assignedApprover) : "—";
  };

  /**
   * Approve / Hold / Reject only when THIS user is the pending approver
   * (or PR full-access). Do not unlock every open PR for Company Admin /
   * Approver roles (that flooded tahira@ / finance@ with Moiz/others' PRs).
   */
  const canActAsApproverOnPr = (row: PurchaseDocument) =>
    prFullAccess || isPendingApproverOnPr(row);

  /** Buyers/admins only — requesters do not create or open Purchase Orders. */
  const canConvertAnyApprovedPo = accessLevel === "buyer" || prFullAccess;
  /**
   * Buyers/admins: any approved PR they can see.
   * Hide once a PO already exists (drafting / purchased / delivered). Allow again if the only PO was cancelled.
   */
  const canConvertToPo = (row: PurchaseDocument) => {
    if (row.status !== "approved") return false;
    if (!canConvertAnyApprovedPo) return false;
    const fulfillment = String(row.fulfillmentStatus || row.stockStatus || "awaiting_po").toLowerCase();
    const alreadyHasPo = ["po_draft", "issued", "partial", "received", "closed"].includes(fulfillment);
    return !alreadyHasPo;
  };

  /** Only the requester (or PR full-access) may edit / submit / resubmit draft or rejected PRs */
  const canEditOrSubmitPr = (row: PurchaseDocument) => {
    if (prFullAccess) return true;
    if (!canCreate) return false;
    if (row.status !== "draft" && row.status !== "rejected") return false;
    return isOwnPr(row);
  };

  /** Assigned approver (or admin / PR full-access) may amend content before approve / hold / reject */
  const canApproverAmendPr = (row: PurchaseDocument) => {
    if (prFullAccess) return true;
    return (
      canActAsApproverOnPr(row) &&
      (row.status === "submitted" || row.status === "held" || row.status === "partially_approved")
    );
  };

  const canRejectPr = (row: PurchaseDocument) => {
    if (prFullAccess) {
      return ["submitted", "held", "partially_approved", "approved"].includes(String(row.status || ""));
    }
    return (
      canActAsApproverOnPr(row) &&
      (row.status === "submitted" ||
        row.status === "held" ||
        row.status === "partially_approved")
    );
  };

  const canOpenEditForm = (row: PurchaseDocument) => canEditOrSubmitPr(row) || canApproverAmendPr(row);
  const [viewingRow, setViewingRow] = useState<PurchaseDocument | null>(null);
  const [reviewAction, setReviewAction] = useState<{
    id: string;
    type: "reject" | "hold" | "approve";
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

  // Deep-link from PR notification bell: /procurement/.../pr?open=<id>
  // Always fetch by id — do not require the PR to already be in the filtered table.
  useEffect(() => {
    const openId = String(searchParams.get("open") || "").trim();
    if (!openId || loading) return;

    let cancelled = false;
    (async () => {
      try {
        const fromList = rows.find(
          (r) => String(r._id) === openId || String(r.requisitionNumber || "") === openId
        );
        const res = await procurementApi.getRequisition(fromList?._id || openId);
        if (cancelled) return;
        setViewingRow(res.data);
        setShowForm(false);
        setEditingId(null);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not open that purchase requisition from the notification"
        );
      } finally {
        if (!cancelled) {
          router.replace(pathname, { scroll: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally omit `rows` identity churn — only react to open= / loading / route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, pathname, router]);

  const openCreate = () => {
    setEditingId(null);
    setEditingMeta(null);
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

  /** Row click always opens the detail view (approval history). Edit is via the Edit button only. */
  const openRequisition = async (row: PurchaseDocument) => {
    setError("");
    try {
      const res = await procurementApi.getRequisition(row._id);
      setViewingRow(res.data);
      setShowForm(false);
      setEditingId(null);
      setEditingMeta(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition");
    }
  };

  const openEditForm = async (row: PurchaseDocument) => {
    if (!canOpenEditForm(row)) return;
    setError("");
    try {
      const res = await procurementApi.getRequisition(row._id);
      setViewingRow(null);
      setEditingId(row._id);
      setEditingMeta({
        requisitionNumber: res.data.requisitionNumber || row.requisitionNumber || "",
        createdBy: procurementUserLabel(res.data.requestedBy || row.requestedBy),
      });
      setForm(requisitionToForm(res.data));
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition");
    }
  };

  const openApproverEditFromView = async () => {
    if (!viewingRow) return;
    await openEditForm(viewingRow);
  };

  const openConvertToPo = async (row: PurchaseDocument) => {
    setError("");
    setConvertLineVendors({});
    const seedPrices = (items?: PurchaseDocument["items"]) => {
      const next: Record<number, string> = {};
      (items || []).forEach((item, i) => {
        if (Number(item.unitPrice) > 0) next[i] = String(item.unitPrice);
      });
      setConvertLinePrices(next);
    };
    seedPrices(row.items);
    setConvertPr(row);
    try {
      const [res] = await Promise.all([
        procurementApi.getRequisition(row._id),
        ensureSuppliersLoaded(),
      ]);
      seedPrices(res.data?.items);
      setConvertPr(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition details");
    }
  };

  const runReviewAction = async () => {
    if (!reviewAction) return;
    const reason = reviewReason.trim();
    if (reviewAction.type !== "approve" && !reason) {
      setError(`${reviewAction.type === "reject" ? "Rejection" : "Hold"} reason is required`);
      return;
    }
    setReviewSaving(true);
    setError("");
    try {
      if (reviewAction.type === "reject") {
        await procurementApi.rejectRequisition(reviewAction.id, reason);
      } else if (reviewAction.type === "hold") {
        await procurementApi.holdRequisition(reviewAction.id, reason);
      } else {
        await procurementApi.approveRequisition(reviewAction.id, reason);
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

  const openApproveModal = (row: PurchaseDocument) => {
    setError("");
    setReviewReason("");
    setReviewAction({
      id: row._id,
      type: "approve",
      label: row.requisitionNumber || row._id,
    });
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
      setEditingMeta(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const lineCount = (row: PurchaseDocument) => row.items?.length ?? 0;

  const auditRows = (row: PurchaseDocument) => {
    const rows: Array<{ label: string; by?: string; at?: string; note?: string }> = [
      { label: "Created by", by: procurementUserLabel(row.requestedBy), at: row.createdAt },
    ];
    if (row.submittedAt || row.submittedBy) {
      rows.push({ label: "Submitted", by: procurementUserLabel(row.submittedBy), at: row.submittedAt });
    }
    if (row.status === "rejected" || row.rejectedAt || row.rejectedBy) {
      rows.push({
        label: "Rejected by",
        by: row.slaClosedByDeadline
          ? "System (72-hour SLA)"
          : procurementUserLabel(row.rejectedBy),
        at: row.rejectedAt,
        note: row.rejectionReason || undefined,
      });
    }
    if (row.status === "approved") {
      rows.push({
        label: "Fully approved by",
        by: procurementUserLabel(row.approvedBy),
        at: row.approvedAt,
      });
    }
    if (row.status === "held" || row.heldAt || row.heldBy) {
      rows.push({
        label: "Held by",
        by: procurementUserLabel(row.heldBy),
        at: row.heldAt,
        note: row.holdReason || undefined,
      });
    }
    if (row.approvals?.length) {
      for (const a of row.approvals) {
        const st = String(a.status || "").toLowerCase();
        const stage = approvalStageLabel(a.stage);
        let label = `${stage} · ${a.department}`;
        if (st === "approved") label = `Approved — ${label}`;
        else if (st === "rejected") label = `Rejected — ${label}`;
        else if (st === "cancelled") label = `Not reached — ${label}`;
        else if (st === "held") label = `Held — ${label}`;
        else label = `Pending — ${label}`;
        rows.push({
          label,
          by: st === "cancelled" ? undefined : procurementUserLabel(a.approver),
          at: a.actedAt,
          note: a.reason || undefined,
        });
      }
    }
    if (row.status !== "rejected" && row.assignedApprover) {
      rows.push({ label: "Assigned to", by: procurementUserLabel(row.assignedApprover) });
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
                  "Created",
                  "Created by",
                  "Departments",
                  "Status",
                  "Delivery",
                  "Assigned",
                  "Actions",
                ]
              : [
                  "PR #",
                  "Created",
                  "Created by",
                  "Departments",
                  "Status",
                  "Delivery",
                  "Assigned",
                  "Actions",
                ]
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
                {canOpenEditForm(r) ? (
                  <button
                    type="button"
                    className="text-blue-600 text-xs dark:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openEditForm(r);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {canActAsApproverOnPr(r) &&
                (r.status === "submitted" || r.status === "partially_approved") ? (
                  <>
                    <button
                      type="button"
                      className="text-green-700 text-xs dark:text-green-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        openApproveModal(r);
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
                    {canRejectPr(r) ? (
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
                    ) : null}
                  </>
                ) : null}
                {canActAsApproverOnPr(r) && r.status === "held" ? (
                  <>
                    <button
                      type="button"
                      className="text-green-700 text-xs dark:text-green-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        openApproveModal(r);
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
                    {canRejectPr(r) ? (
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
                    ) : null}
                  </>
                ) : null}
                {prFullAccess && r.status === "approved" && canRejectPr(r) ? (
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
            const createdAt = r.createdAt || r.submittedAt || "";
            const submittedAt = r.submittedAt || "";
            const dateTitle =
              submittedAt && submittedAt !== createdAt
                ? `Created ${procurementDateTime(createdAt)} · Submitted ${procurementDateTime(submittedAt)}`
                : procurementDateTime(createdAt);
            const createdByLabel = procurementUserLabel(r.requestedBy);
            const baseCells = [
              r.requisitionNumber || "—",
              <span
                key={`dt-${r._id}`}
                className="block max-w-[8.5rem] text-xs leading-snug text-blue-900 dark:text-slate-100"
                title={dateTitle}
              >
                {createdAt ? (
                  <>
                    <span className="whitespace-nowrap">{procurementDateTime(createdAt)}</span>
                    {submittedAt && submittedAt !== createdAt ? (
                      <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">
                        Sub {procurementDateTime(submittedAt)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </span>,
              <span
                key={`by-${r._id}`}
                className="block max-w-[8rem] truncate text-xs text-blue-900 dark:text-slate-100"
                title={createdByLabel}
              >
                {createdByLabel}
              </span>,
              <span key={`dept-${r._id}`} className="block max-w-[9rem] truncate" title={dept}>
                {dept}
              </span>,
              <span key={`st-${r._id}`} className="inline-flex flex-col gap-0.5">
                <StatusBadge status={r.status} />
                {slaBadge(r)}
              </span>,
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
                className="block max-w-[10rem] text-xs font-semibold text-slate-900 dark:text-white"
                title={currentStageAssigneeLabel(r)}
              >
                {currentStageAssigneeLabel(r)}
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
              ? editingMeta?.requisitionNumber
                ? `Edit ${editingMeta.requisitionNumber}`
                : "Edit requisition"
              : "New requisition"
          }
          onClose={() => {
            setShowForm(false);
            setEditingMeta(null);
          }}
        >
          <form onSubmit={save} className="space-y-4">
            {editingId && editingMeta ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-blue-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                <p>
                  <span className="font-medium">PR #:</span>{" "}
                  {editingMeta.requisitionNumber || "—"}
                </p>
                <p className="mt-0.5">
                  <span className="font-medium">Created by:</span>{" "}
                  {editingMeta.createdBy || "—"}
                </p>
              </div>
            ) : null}
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
                onClick={() => {
                  setShowForm(false);
                  setEditingMeta(null);
                }}
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
              <span className="font-medium text-blue-900 dark:text-blue-200">Created by:</span>{" "}
              {procurementUserLabel(viewingRow.requestedBy)}
              {viewingRow.createdAt ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {" "}
                  · {procurementDateTime(viewingRow.createdAt)}
                </span>
              ) : null}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Departments:</span>{" "}
              {viewingRow.title || "—"}
            </p>
            <p>
              <span className="font-medium text-blue-900 dark:text-blue-200">Location:</span>{" "}
              {viewingRow.location || "—"}
            </p>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-slate-600 dark:bg-slate-800">
              <p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-950 dark:text-white">
                Line items ({lineCount(viewingRow)})
              </p>
              <ul className="space-y-2">
                {(viewingRow.items || []).map((item, i) => {
                  const lineStatus = item.lineFulfillmentStatus || "n_a";
                  return (
                    <li key={i} className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                      <p className="text-base font-bold leading-snug text-slate-950 dark:text-white">
                        {item.itemName || item.itemCode || "Item"}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-blue-900 dark:text-blue-100">
                        {item.quantity} {item.unit}
                        {item.department ? (
                          <span className="ml-2 font-semibold text-slate-700 dark:text-slate-200">
                            · {item.department}
                          </span>
                        ) : null}
                      </p>
                      {item.description ? (
                        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {viewingRow.status === "approved" ? (
                          <StatusBadge
                            status={lineStatus}
                            label={item.lineFulfillmentLabel || undefined}
                          />
                        ) : null}
                        {item.processed && (item.qtyReceived || 0) > 0 ? (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            recv {item.qtyReceived}/{item.qtyOrdered || item.quantity}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {viewingRow.status === "approved" && (viewingRow.linesTotal || 0) > 0 ? (
                <p className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-200">
                  Processed lines: {viewingRow.linesProcessed || 0}/{viewingRow.linesTotal}
                  {viewingRow.poNumber ? ` · PO ${viewingRow.poNumber}` : ""}
                </p>
              ) : null}
            </div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-blue-900 dark:text-blue-200">Status:</span>{" "}
              <StatusBadge status={viewingRow.status} />
              {slaBadge(viewingRow)}
              {viewingRow.approvals?.length ? (
                <span className="text-xs text-blue-600 dark:text-blue-300">
                  Approvals {approvalProgressLabel(viewingRow)}
                </span>
              ) : null}
            </p>
            {viewingRow.status === "held" ? (
              <p className="text-xs text-violet-800 dark:text-violet-200">
                On hold: the 72-hour SLA is paused
                {viewingRow.holdExpiresAt
                  ? ` until release, or until ${procurementDateTime(String(viewingRow.holdExpiresAt))} (30 days from hold)`
                  : " until release (30 days from hold)"}
                .
              </p>
            ) : viewingRow.slaDueAt || viewingRow.slaLabel ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                72-hour SLA: must be fully approved within 72 hours of submit
                {viewingRow.slaDueAt
                  ? ` (due ${procurementDateTime(String(viewingRow.slaDueAt))})`
                  : ""}
                . Hold pauses this clock.
              </p>
            ) : null}
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
                  {approvalChainKey(viewingRow) === "lab_then_finance"
                    ? isLahorePr(viewingRow)
                      ? "Approval chain (department → lab → Lahore finance / Tahira)"
                      : "Approval chain (department → lab → finance)"
                    : approvalChainKey(viewingRow) === "skip_finance"
                      ? isLahorePr(viewingRow)
                        ? "Approval chain (department → Lahore final / Tahira)"
                        : "Approval chain (department → final approver)"
                      : isLahorePr(viewingRow)
                        ? "Approval chain (departments → Lahore finance / Tahira)"
                        : "Approval chain (departments → finance)"}
                </p>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                  {viewingRow.approvals.map((a, i) => (
                    <li key={a._id || `${a.department}-${i}`} className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                        {approvalStageLabel(a.stage)}
                      </span>
                      <span className="font-medium">{a.department}</span>
                      <StatusBadge status={a.status} />
                      {String(a.status || "").toLowerCase() !== "cancelled" ? (
                        <span>{procurementUserLabel(a.approver)}</span>
                      ) : null}
                      {a.actedAt ? <span className="text-xs">{procurementDateTime(a.actedAt)}</span> : null}
                      {a.reason ? (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          · Remarks: {a.reason}
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {plannedCorporateStages(viewingRow)
                    .filter(
                      (p) =>
                        !(viewingRow.approvals || []).some(
                          (a) => String(a.stage || "").toLowerCase() === p.stage
                        )
                    )
                    .map((p) => (
                      <li
                        key={`planned-${p.stage}`}
                        className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400"
                      >
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {approvalStageLabel(p.stage)}
                        </span>
                        <span className="font-medium">{p.department}</span>
                        <StatusBadge status="pending" label="waiting" />
                        <span className="text-xs">{p.email}</span>
                        <span className="text-[10px] uppercase tracking-wide">not reached yet</span>
                      </li>
                    ))}
                </ul>
                {approvalChainKey(viewingRow) === "lab_then_finance" ? (
                  !viewingRow.approvals.some((a) => String(a.stage || "").toLowerCase() === "lab") ? (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                      After department manager approves → Lab, then{" "}
                      {isLahorePr(viewingRow)
                        ? "Lahore Finance (tahira@ressichem.com)."
                        : "Finance Manager."}
                    </p>
                  ) : !viewingRow.approvals.some((a) => String(a.stage || "").toLowerCase() === "finance") ? (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                      After Lab approves →{" "}
                      {isLahorePr(viewingRow)
                        ? "Lahore Finance (tahira@ressichem.com) for final approval."
                        : "Finance Manager for final approval."}
                    </p>
                  ) : null
                ) : approvalChainKey(viewingRow) === "skip_finance" ? (
                  !viewingRow.approvals.some((a) => String(a.stage || "").toLowerCase() === "boss") ? (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                      {isLahorePr(viewingRow)
                        ? "After department approve → Lahore final (tahira@ressichem.com)."
                        : "After department approve → final approver (Finance skipped for this requester)."}
                    </p>
                  ) : null
                ) : !viewingRow.approvals.some((a) => String(a.stage || "").toLowerCase() === "finance") ? (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                    {isLahorePr(viewingRow)
                      ? "After all departments approve → Lahore Finance (tahira@ressichem.com)."
                      : "After all departments approve → Finance Manager (final)."}
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
                {auditRows(viewingRow).map((entry, idx) => (
                  <li key={`${entry.label}-${idx}`}>
                    <span className="font-medium text-blue-900 dark:text-blue-200">{entry.label}:</span>{" "}
                    {entry.by ? `${entry.by}` : ""}
                    {entry.by && entry.at ? " · " : ""}
                    {entry.at ? procurementDateTime(entry.at) : !entry.by && !entry.note ? "—" : ""}
                    {entry.note ? (
                      <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                        Remarks: {entry.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <footer className="flex justify-end gap-2 pt-2">
              {canOpenEditForm(viewingRow) ? (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                  onClick={() => void openApproverEditFromView()}
                >
                  {canApproverAmendPr(viewingRow) ? "Edit before decision" : "Edit"}
                </button>
              ) : null}
              {canActAsApproverOnPr(viewingRow) &&
              (viewingRow.status === "submitted" || viewingRow.status === "partially_approved") ? (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm"
                    onClick={() => openApproveModal(viewingRow)}
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
                  {canRejectPr(viewingRow) ? (
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
                  ) : null}
                </>
              ) : null}
              {prFullAccess && viewingRow.status === "approved" && canRejectPr(viewingRow) ? (
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
              ) : null}
              {canActAsApproverOnPr(viewingRow) && viewingRow.status === "held" ? (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm"
                    onClick={() => openApproveModal(viewingRow)}
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
          title={
            reviewAction.type === "reject"
              ? "Reject requisition"
              : reviewAction.type === "hold"
                ? "Hold requisition"
                : "Approve requisition"
          }
          onClose={() => {
            setReviewAction(null);
            setReviewReason("");
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-blue-800 dark:text-blue-100">
              {reviewAction.type === "reject"
                ? `Provide a reason for rejecting ${reviewAction.label}. The requester can edit and resubmit.`
                : reviewAction.type === "hold"
                  ? `Provide a reason for holding ${reviewAction.label}. You can release, approve, or reject later.`
                  : `Confirm approval of ${reviewAction.label}. Remarks are optional and will appear in the PR history.`}
            </p>
            <Field
              label={reviewAction.type === "approve" ? "Remarks (optional)" : "Reason"}
              value={reviewReason}
              onChange={setReviewReason}
              required={reviewAction.type !== "approve"}
              placeholder={
                reviewAction.type === "reject"
                  ? "e.g. Budget not approved"
                  : reviewAction.type === "hold"
                    ? "e.g. Need vendor quote"
                    : "e.g. Prices checked, OK to proceed"
              }
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
                  reviewAction.type === "reject"
                    ? "bg-red-600"
                    : reviewAction.type === "hold"
                      ? "bg-amber-600"
                      : "bg-green-600"
                }`}
                onClick={runReviewAction}
              >
                {reviewSaving
                  ? "Saving..."
                  : reviewAction.type === "reject"
                    ? "Reject"
                    : reviewAction.type === "hold"
                      ? "Hold"
                      : "Approve"}
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
            setConvertLinePrices({});
          }}
          wide
        >
          {(() => {
            const prLines = convertPr.items || [];
            const scopedSuppliers = filterSuppliersBySection(suppliers, section);
            const allLinesHaveVendor =
              prLines.length > 0 && prLines.every((_, i) => Boolean(convertLineVendors[i]));
            const allLinesHavePrice =
              prLines.length > 0 &&
              prLines.every((_, i) => {
                const raw = convertLinePrices[i];
                const n = Number(raw);
                return Boolean(raw?.trim()) && Number.isFinite(n) && n > 0;
              });
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
                  Assign a vendor and unit price on each line below, then create{" "}
                  <strong>one draft PO</strong>. Different vendors stay on the same PO.
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
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          <FormLabel>
                            Unit price ({convertPr.currency || "PKR"}){" "}
                            <span className="text-red-600">*</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              required
                              className={`${procurementFieldClass} mt-1`}
                              value={
                                convertLinePrices[i] ??
                                (Number(item.unitPrice) > 0 ? String(item.unitPrice) : "")
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                                setConvertLinePrices((prev) => ({ ...prev, [i]: raw }));
                              }}
                              placeholder="Enter unit price"
                            />
                            {Number(item.quantity) > 0 && Number(convertLinePrices[i]) > 0 ? (
                              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                                Line total:{" "}
                                {(Number(item.quantity) * Number(convertLinePrices[i])).toLocaleString(
                                  undefined,
                                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                                )}
                              </p>
                            ) : null}
                          </FormLabel>
                        </div>
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
                      setConvertLinePrices({});
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={converting || !allLinesHaveVendor || !allLinesHavePrice}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50"
                    onClick={async () => {
                      setConverting(true);
                      setError("");
                      try {
                        const lineSuppliers = prLines.map((_, i) => convertLineVendors[i]);
                        const lineUnitPrices = prLines.map((_, i) => {
                          const n = Number(convertLinePrices[i]);
                          return Number.isFinite(n) ? n : 0;
                        });
                        await procurementApi.convertRequisitionToPO(convertPr._id, {
                          supplier: lineSuppliers[0],
                          lineSuppliers,
                          lineUnitPrices,
                        });
                        setConvertPr(null);
                        setConvertLineVendors({});
                        setConvertLinePrices({});
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
