"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatProcurementAmount } from "@/lib/procurementMoney";
import {
  accessLevelFromRole,
} from "@/lib/procurementRoles";
import { canProcurementSoftDelete, currentProcurementEmail, hasPrFullAccess } from "@/lib/procurementAccess";

const emptyForm = () => ({
  subject: "",
  title: "",
  location: "",
  lines: [] as RequisitionLine[],
});

function prSearchText(row: PurchaseDocument) {
  const parts = [
    row.requisitionNumber,
    row.subject,
    row.notes,
    row.title,
    row.location,
    procurementUserLabel(row.requestedBy),
    ...(row.items || []).flatMap((item) => [item.itemName, item.itemCode, item.description, item.department]),
  ];
  return parts
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

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
  if (s === "estimate") return "Price";
  if (s === "lab") return "Lab";
  if (s === "finance") return "Finance";
  if (s === "boss") return "Final";
  return "Dept";
}

function approvalChainKey(row: PurchaseDocument) {
  const key = String(row.approvalChain || "").toLowerCase();
  if (key === "lab_then_finance" || key === "skip_finance" || key === "standard") return key;
  if (row.skipFinanceApproval) return "skip_finance";
  return "standard";
}

function pricesFromRequisition(row: PurchaseDocument) {
  const next: Record<number, string> = {};
  (row.items || []).forEach((item, index) => {
    const price = Number(item.unitPrice) || 0;
    next[index] = price > 0 ? String(price) : "";
  });
  return next;
}

/** Accept 1500, 1,500, and 1500.50. A comma is a thousands separator, not a decimal. */
function parseEstimatePrice(raw: string) {
  const cleaned = String(raw || "").replace(/,/g, "").replace(/\s/g, "");
  if (!cleaned) return NaN;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
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

const HUB_ESTIMATE_EMAILS = ["salim@gmail.com", "hanif@ressichem.com", "ahabib@ressichem.com"];
const LAHORE_ESTIMATE_EMAIL = "rana.mehtab@ressichem.com";
const LAHORE_ESTIMATE_ALSO_EMAILS = [
  "salim@gmail.com",
  "tahira@ressichem.com",
  "hanif@ressichem.com",
  "ahabib@ressichem.com",
];

function estimateStageOpen(row?: PurchaseDocument) {
  return (row?.approvals || []).some(
    (entry) => entry.stage === "estimate" && (entry.status === "pending" || entry.status === "held")
  );
}

function hasEstimateStage(row?: PurchaseDocument) {
  return (row?.approvals || []).some((entry) => entry.stage === "estimate");
}

/** Corporate steps that unlock after departments (shown even before rows exist). */
function requesterEmailOf(row?: PurchaseDocument) {
  const owner = row?.requestedBy;
  if (!owner || typeof owner === "string") return "";
  return String(owner.email || "").trim().toLowerCase();
}

function plannedCorporateStages(row: PurchaseDocument): Array<{
  stage: string;
  department: string;
  email: string;
}> {
  if (requesterEmailOf(row) === "maintenance@ressichem.com") {
    return [{ stage: "finance", department: "Finance Manager", email: "finance@ressichem.com" }];
  }
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
  subject: string;
  title: string;
  location: string;
  lines: RequisitionLine[];
} {
  return {
    subject: row.subject || "",
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
  /** PR line indexes included on the draft PO being created. */
  const [convertSelected, setConvertSelected] = useState<Record<number, boolean>>({});
  /** Line ticks on the approved-PR detail before Create PO opens. */
  const [detailPoSelected, setDetailPoSelected] = useState<Record<number, boolean>>({});
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
    const hasEstimate = approvals.some((entry) => entry.stage === "estimate");
    const estimateOpen = approvals.some(
      (entry) => entry.stage === "estimate" && isOpenStatus(entry.status)
    );
    if (estimateOpen) {
      return approvals.some((entry) => {
        const id = approvalActorId(entry.approver);
        return Boolean(
          entry.stage === "estimate" && id && String(id) === String(currentUserId) && isOpenStatus(entry.status)
        );
      });
    }
    if (hasEstimate) {
      const firstDepartment = approvals.find(
        (entry) => (entry.stage || "department") === "department" && isOpenStatus(entry.status)
      );
      const current =
        firstDepartment ||
        approvals.find((entry) => entry.stage === "finance" && isOpenStatus(entry.status)) ||
        approvals.find((entry) => entry.stage === "boss" && isOpenStatus(entry.status));
      const id = approvalActorId(current?.approver);
      return Boolean(id && String(id) === String(currentUserId));
    }
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
    if (names.length) {
      if (approvals.some((entry) => entry.stage === "estimate") && stage === "department") {
        return names[0];
      }
      return names.join(", ");
    }
    return row.assignedApprover ? procurementUserLabel(row.assignedApprover) : "—";
  };

  const canPriceThisPr = (row: PurchaseDocument) => {
    const email = currentProcurementEmail();
    if (isLahorePr(row)) {
      return email === LAHORE_ESTIMATE_EMAIL || LAHORE_ESTIMATE_ALSO_EMAILS.includes(email);
    }
    return HUB_ESTIMATE_EMAILS.includes(email);
  };

  const canEnterEstimate = (row: PurchaseDocument) => estimateStageOpen(row) && canPriceThisPr(row);

  /** Correct a saved estimate until the requisition is fully approved. Does not move the approval chain. */
  const canReviseEstimate = (row: PurchaseDocument) => {
    if (!canPriceThisPr(row) || estimateStageOpen(row) || !hasEstimateStage(row)) return false;
    const status = String(row.status || "").toLowerCase();
    if (!["submitted", "held", "partially_approved"].includes(status)) return false;
    return (row.items || []).some((item) => Number(item.unitPrice) > 0);
  };

  const canEditEstimate = (row: PurchaseDocument) => canEnterEstimate(row) || canReviseEstimate(row);

  /**
   * Approve / Hold / Reject only when THIS user is the pending approver.
   * While procurement still owes an estimated price, those actions stay closed.
   * After the price is saved, managers act one at a time.
   */
  const canActAsApproverOnPr = (row: PurchaseDocument) => {
    if (estimateStageOpen(row)) return false;
    if (hasEstimateStage(row)) return isPendingApproverOnPr(row);
    return prFullAccess || isPendingApproverOnPr(row);
  };

  /** Buyers and admins — requesters do not create Purchase Orders. */
  const canConvertAnyApprovedPo =
    accessLevel === "buyer" || accessLevel === "admin" || prFullAccess;
  const lineOpenForPo = (item?: { lineFulfillmentStatus?: string }) => {
    const status = String(item?.lineFulfillmentStatus || "awaiting_po").toLowerCase();
    return status === "awaiting_po" || status === "cancelled" || status === "n_a";
  };
  /**
   * Buyers/admins may create a PO for any approved lines that are not already on a live PO.
   */
  const canConvertToPo = (row: PurchaseDocument) => {
    if (row.status !== "approved") return false;
    if (!canConvertAnyApprovedPo) return false;
    const items = row.items || [];
    if (items.length) return items.some((item) => lineOpenForPo(item));
    const fulfillment = String(row.fulfillmentStatus || row.stockStatus || "awaiting_po").toLowerCase();
    return fulfillment === "awaiting_po" || fulfillment === "partial_lines" || fulfillment === "cancelled";
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
  const [estimatePrices, setEstimatePrices] = useState<Record<number, string>>({});
  const [estimateNotice, setEstimateNotice] = useState("");
  const [estimateRemarks, setEstimateRemarks] = useState("");
  const [savingEstimate, setSavingEstimate] = useState(false);
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
  const [search, setSearch] = useState("");
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
        setEstimatePrices(pricesFromRequisition(res.data));
        setEstimateNotice("");
        setEstimateRemarks("");
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

  const visibleRows = useMemo(() => {
    const tokens = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) return rows;
    return rows.filter((row) => {
      const haystack = prSearchText(row);
      return tokens.every((token) => haystack.includes(token));
    });
  }, [rows, search]);

  const allSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row._id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : visibleRows.map((r) => r._id));
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
      setEstimatePrices(pricesFromRequisition(res.data));
      setEstimateNotice("");
      setEstimateRemarks("");
      const next: Record<number, boolean> = {};
      (res.data.items || []).forEach((item, i) => {
        next[i] = lineOpenForPo(item);
      });
      setDetailPoSelected(next);
      setShowForm(false);
      setEditingId(null);
      setEditingMeta(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition");
    }
  };

  const saveEstimatedPrices = async () => {
    if (!viewingRow || savingEstimate) return;
    const items = viewingRow.items || [];
    const lineUnitPrices = items.map((_, index) => parseEstimatePrice(estimatePrices[index] || ""));
    if (lineUnitPrices.some((price) => !(price > 0))) {
      setEstimateNotice("");
      setError("Enter an estimated unit price greater than 0 on every line");
      return;
    }
    setSavingEstimate(true);
    setError("");
    setEstimateNotice("");
    try {
      const res = await procurementApi.saveRequisitionEstimate(viewingRow._id, {
        lineUnitPrices,
        remarks: estimateRemarks,
      });
      setViewingRow(res.data);
      setEstimatePrices(pricesFromRequisition(res.data));
      setEstimateNotice(res.message || "Estimated prices saved.");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the estimated prices";
      setError(message);
      setEstimateNotice("");
    } finally {
      setSavingEstimate(false);
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

  const openConvertToPo = async (row: PurchaseDocument, presetIndexes?: number[]) => {
    setError("");
    setConvertLineVendors({});
    const seedLines = (items?: PurchaseDocument["items"]) => {
      const prices: Record<number, string> = {};
      const selected: Record<number, boolean> = {};
      (items || []).forEach((item, i) => {
        if (Number(item.unitPrice) > 0) prices[i] = String(item.unitPrice);
        const open = lineOpenForPo(item);
        selected[i] = open && (presetIndexes ? presetIndexes.includes(i) : true);
      });
      setConvertLinePrices(prices);
      setConvertSelected(selected);
    };
    seedLines(row.items);
    setConvertPr(row);
    try {
      const [res] = await Promise.all([
        procurementApi.getRequisition(row._id),
        ensureSuppliersLoaded(),
      ]);
      seedLines(res.data?.items);
      setConvertPr(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requisition details");
    }
  };

  const runReviewAction = async () => {
    if (!reviewAction) return;
    const reason = reviewReason.trim();
    if (!reason) {
      setError("Remarks are required");
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
    if (!form.subject.trim()) {
      setError("Enter a subject or purpose for this requisition");
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
        subject: form.subject.trim(),
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
    if (row.decisionLog?.length) {
      for (const entry of row.decisionLog) {
        rows.push({
          label:
            entry.kind === "held"
              ? "Held by"
              : entry.kind === "estimate_revised"
                ? "Estimated price revised by"
                : entry.kind === "approved"
                  ? "Approved by"
                  : "Rejected by",
          by: entry.actorName || "—",
          at: entry.at ? String(entry.at) : undefined,
          note: entry.reason || undefined,
        });
      }
    } else if (row.status === "rejected" || row.rejectedAt || row.rejectedBy) {
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
    if (!row.decisionLog?.length && (row.status === "held" || row.heldAt || row.heldBy)) {
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
      summary={
        loading
          ? undefined
          : search.trim()
            ? `${visibleRows.length} of ${recordTotalLabel(rows.length, "requisition", "requisitions")}`
            : recordTotalLabel(rows.length, "requisition", "requisitions")
      }
      onBulkImport={canBulkImport ? () => setShowBulkImport(true) : undefined}
      onAdd={canCreate ? openCreate : undefined}
    >
      {error ? <Alert message={error} /> : null}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 mb-3">
        <label className="text-xs text-blue-800 dark:text-blue-200 w-full sm:min-w-[18rem] sm:flex-1">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Subject, keywords, or PR number"
            className={`${procurementFieldClass} mt-1 w-full`}
          />
        </label>
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
          onRowClick={(index) => openRequisition(visibleRows[index])}
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
                  "Subject",
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
                  "Subject",
                  "Created",
                  "Created by",
                  "Departments",
                  "Status",
                  "Delivery",
                  "Assigned",
                  "Actions",
                ]
          }
          rows={visibleRows.map((r) => {
            const actionCell = (
              <span key={`act-${r._id}`} className="flex min-w-[7.5rem] flex-col items-start gap-1">
                {canEditEstimate(r) ? (
                  <button
                    type="button"
                    className="whitespace-nowrap text-xs font-semibold text-blue-700 dark:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openRequisition(r);
                    }}
                  >
                    {canReviseEstimate(r) ? "Edit estimated price" : "Enter estimated price"}
                  </button>
                ) : null}
                <span className="flex flex-wrap gap-x-2 gap-y-1">
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
            const subject = r.subject?.trim() || "—";
            const baseCells = [
              r.requisitionNumber || "—",
              <span
                key={`sub-${r._id}`}
                className="block max-w-[14rem] truncate text-xs font-medium text-slate-900 dark:text-white"
                title={subject}
              >
                {subject}
              </span>,
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
                className="block max-w-[9rem] truncate text-xs font-semibold text-slate-900 dark:text-white"
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
              label="Subject / purpose"
              value={form.subject}
              onChange={(subject) => setForm({ ...form, subject })}
              placeholder="e.g. Tyres for the plant vehicle"
              required
            />
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
            {viewingRow.status === "rejected" && viewingRow.rejectionReason ? (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
                <p className="text-xs font-bold uppercase tracking-wide">Rejection remarks</p>
                <p className="mt-1 text-base font-semibold leading-snug">{viewingRow.rejectionReason}</p>
                <p className="mt-1 text-xs">
                  {(viewingRow.decisionLog || []).filter((entry) => entry.kind === "rejected").slice(-1)[0]
                    ?.actorName ||
                    (viewingRow.slaClosedByDeadline
                      ? "System (72-hour SLA)"
                      : procurementUserLabel(viewingRow.rejectedBy))}
                  {viewingRow.rejectedAt ? ` · ${procurementDateTime(viewingRow.rejectedAt)}` : ""}
                </p>
              </div>
            ) : null}
            {viewingRow.status === "held" && viewingRow.holdReason ? (
              <div className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
                <p className="text-xs font-bold uppercase tracking-wide">Hold remarks</p>
                <p className="mt-1 text-base font-semibold leading-snug">{viewingRow.holdReason}</p>
                <p className="mt-1 text-xs">
                  {procurementUserLabel(viewingRow.heldBy)}
                  {viewingRow.heldAt ? ` · ${procurementDateTime(viewingRow.heldAt)}` : ""}
                </p>
              </div>
            ) : null}
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
              <span className="font-medium text-blue-900 dark:text-blue-200">Subject:</span>{" "}
              {viewingRow.subject?.trim() || "—"}
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
              {canConvertToPo(viewingRow) ? (
                <div className="mb-2 space-y-2">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                    Tick the lines for this purchase order. Unticked lines stay on this PR as remaining
                    and can be purchased later. Every remaining line starts checked.
                  </p>
                  {(() => {
                    const openIndexes = (viewingRow.items || [])
                      .map((item, i) => (lineOpenForPo(item) ? i : -1))
                      .filter((i) => i >= 0);
                    if (openIndexes.length < 2) return null;
                    const allChecked = openIndexes.every((i) => detailPoSelected[i]);
                    return (
                      <label className="flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-blue-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={allChecked}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setDetailPoSelected((prev) => {
                              const next = { ...prev };
                              openIndexes.forEach((i) => {
                                next[i] = on;
                              });
                              return next;
                            });
                          }}
                        />
                        Check all remaining lines
                      </label>
                    );
                  })()}
                </div>
              ) : null}
              <ul className="space-y-2">
                {(viewingRow.items || []).map((item, i) => {
                  const lineStatus = item.lineFulfillmentStatus || "n_a";
                  const openForPo = lineOpenForPo(item);
                  const showPick = canConvertToPo(viewingRow);
                  return (
                    <li key={i} className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900">
                      <div className="flex items-start gap-2">
                        {showPick ? (
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0"
                            checked={Boolean(openForPo && detailPoSelected[i])}
                            disabled={!openForPo}
                            onChange={(e) =>
                              setDetailPoSelected((prev) => ({ ...prev, [i]: e.target.checked }))
                            }
                            aria-label={`Include line ${i + 1} on the purchase order`}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
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
                      {canEditEstimate(viewingRow) ? (
                        <label className="mt-2 block text-sm font-semibold text-blue-950 dark:text-blue-50">
                          Estimated unit price ({viewingRow.purchaseType === "foreign" ? viewingRow.currency || "USD" : "PKR"})
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            enterKeyHint="done"
                            className={`${procurementFieldClass} mt-1 !text-base sm:!text-sm min-h-11`}
                            value={estimatePrices[i] ?? ""}
                            placeholder="0.00"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "").replace(/\s/g, "");
                              if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                              setEstimatePrices((prev) => ({ ...prev, [i]: raw }));
                            }}
                          />
                        </label>
                      ) : Number(item.unitPrice) > 0 ? (
                        <p className="mt-1 text-sm font-bold text-blue-950 dark:text-blue-50">
                          Estimated unit price {viewingRow.currency || "PKR"}{" "}
                          {formatProcurementAmount(Number(item.unitPrice) || 0)}
                          {" · "}
                          Estimated line total {viewingRow.currency || "PKR"}{" "}
                          {formatProcurementAmount(
                            Number(item.lineTotal) > 0
                              ? Number(item.lineTotal)
                              : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                          )}
                          {Number(item.costUnitPrice) > 0 &&
                          Math.abs(Number(item.costUnitPrice) - Number(item.unitPrice)) > 0.009 ? (
                            <>
                              {" · "}
                              Purchase unit {item.costCurrency || viewingRow.costCurrency || "PKR"}{" "}
                              {formatProcurementAmount(Number(item.costUnitPrice) || 0)}
                            </>
                          ) : null}
                        </p>
                      ) : Number(item.costLineTotal) > 0 || Number(item.costUnitPrice) > 0 ? (
                        <p className="mt-1 text-sm font-bold text-blue-950 dark:text-blue-50">
                          Unit price {item.costCurrency || viewingRow.costCurrency || "PKR"}{" "}
                          {formatProcurementAmount(Number(item.costUnitPrice) || 0)}
                          {" · "}
                          Line total {item.costCurrency || viewingRow.costCurrency || "PKR"}{" "}
                          {formatProcurementAmount(Number(item.costLineTotal) || 0)}
                        </p>
                      ) : viewingRow.status === "approved" ? (
                        <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                          No price on this line yet
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
                        {showPick && openForPo && !detailPoSelected[i] ? (
                          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                            Remaining — waiting for a later PO
                          </span>
                        ) : null}
                      </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {viewingRow.status === "approved" && (viewingRow.linesTotal || 0) > 0 ? (
                <p className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-200">
                  Lines on a PO: {viewingRow.linesProcessed || 0}/{viewingRow.linesTotal}
                  {viewingRow.poNumber ? ` · PO ${viewingRow.poNumber}` : ""}
                </p>
              ) : null}
              <p className="mt-3 border-t border-blue-200 pt-2 text-base font-bold text-blue-950 dark:border-slate-600 dark:text-white">
                {(viewingRow.items || []).some((item) => Number(item.unitPrice) > 0)
                  ? `Estimated total ${viewingRow.currency || "PKR"} ${formatProcurementAmount(
                      (viewingRow.items || []).reduce((sum, item) => {
                        const line =
                          Number(item.lineTotal) > 0
                            ? Number(item.lineTotal)
                            : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        return sum + line;
                      }, 0)
                    )}`
                  : `Total ${viewingRow.costCurrency || viewingRow.currency || "PKR"} ${formatProcurementAmount(
                      Number(viewingRow.costTotal) || 0
                    )}`}
              </p>
              {(viewingRow.items || []).some((item) => Number(item.unitPrice) > 0) &&
              Number(viewingRow.costTotal) > 0 &&
              Math.abs(
                Number(viewingRow.costTotal) -
                  (viewingRow.items || []).reduce((sum, item) => {
                    const line =
                      Number(item.lineTotal) > 0
                        ? Number(item.lineTotal)
                        : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return sum + line;
                  }, 0)
              ) > 0.009 ? (
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Purchase total {viewingRow.costCurrency || "PKR"}{" "}
                  {formatProcurementAmount(Number(viewingRow.costTotal) || 0)}
                </p>
              ) : null}
            </div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-blue-900 dark:text-blue-200">Status:</span>{" "}
              <StatusBadge status={viewingRow.status} />
              {viewingRow.approvals?.length ? (
                <span className="text-xs text-blue-600 dark:text-blue-300">
                  Approvals {approvalProgressLabel(viewingRow)}
                </span>
              ) : null}
            </p>
            {viewingRow.status === "held" ? (
              <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                On hold until release
                {viewingRow.holdExpiresAt
                  ? `, or until ${procurementDateTime(String(viewingRow.holdExpiresAt))} (30 days from hold)`
                  : " (up to 30 days)"}
                .
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
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  {viewingRow.approvals.map((a, i) => (
                    <li
                      key={a._id || `${a.department}-${i}`}
                      className="rounded-lg border-2 border-blue-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                          {approvalStageLabel(a.stage)}
                        </span>
                        <span className="font-medium">{a.department}</span>
                        <StatusBadge status={a.status} />
                        {String(a.status || "").toLowerCase() !== "cancelled" ? (
                          <span>{procurementUserLabel(a.approver)}</span>
                        ) : null}
                        {a.actedAt ? <span className="text-xs">{procurementDateTime(a.actedAt)}</span> : null}
                      </div>
                      {a.reason ? (
                        <p className="mt-2 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-base font-semibold leading-snug text-slate-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-50">
                          <span className="mr-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                            Remarks
                          </span>
                          {a.reason}
                        </p>
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
                {hasEstimateStage(viewingRow) ? (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                    {estimateStageOpen(viewingRow)
                      ? requesterEmailOf(viewingRow) === "maintenance@ressichem.com"
                        ? "Waiting for an estimated price from salim@gmail.com, hanif@ressichem.com, or ahabib@ressichem.com. Then Khuzema (khuzema@ressichem.com) approves, then Finance (finance@ressichem.com)."
                        : isLahorePr(viewingRow)
                        ? "Waiting for an estimated price. Rana Mehtab is assigned. salim@gmail.com, tahira@ressichem.com, hanif@ressichem.com, or ahabib@ressichem.com may also enter it. Then the assigned managers approve one at a time, then Lahore Finance (tahira@ressichem.com)."
                        : "Waiting for procurement (salim@gmail.com, hanif@ressichem.com, or ahabib@ressichem.com) to enter the estimated price. Then the assigned managers approve one at a time, then Finance."
                      : requesterEmailOf(viewingRow) === "maintenance@ressichem.com"
                        ? "Estimated price is saved. Khuzema (khuzema@ressichem.com) approves, then Finance (finance@ressichem.com)."
                        : isLahorePr(viewingRow)
                        ? "Estimated price is saved. Managers approve one at a time, then Lahore Finance (tahira@ressichem.com)."
                        : "Estimated price is saved. Managers approve one at a time, then Finance."}
                  </p>
                ) : null}
                {approvalChainKey(viewingRow) === "lab_then_finance" &&
                requesterEmailOf(viewingRow) !== "maintenance@ressichem.com" ? (
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
                      <span className="mt-1 block rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-base font-semibold leading-snug text-slate-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-50">
                        Remarks: {entry.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <footer className="flex flex-wrap justify-end gap-2 pt-2">
              {canEditOrSubmitPr(viewingRow) ? (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-sm"
                  onClick={async () => {
                    setError("");
                    try {
                      await procurementApi.submitRequisition(viewingRow._id);
                      setViewingRow(null);
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Submit failed");
                    }
                  }}
                >
                  {viewingRow.status === "rejected" ? "Resubmit" : "Submit"}
                </button>
              ) : null}
              {canConvertToPo(viewingRow) ? (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm"
                  onClick={() => {
                    const indexes = (viewingRow.items || [])
                      .map((item, i) => (lineOpenForPo(item) && detailPoSelected[i] ? i : -1))
                      .filter((i) => i >= 0);
                    if (!indexes.length) {
                      setError("Select at least one line that is still awaiting a PO");
                      return;
                    }
                    setError("");
                    void openConvertToPo(viewingRow, indexes);
                  }}
                >
                  Create PO for selected lines
                </button>
              ) : null}
              {canEditEstimate(viewingRow) ? (
                <div className="flex w-full flex-col items-end gap-2">
                  {estimateNotice ? (
                    <p className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                      {estimateNotice}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
                      {error}
                    </p>
                  ) : null}
                  <label className="w-full text-sm font-semibold text-blue-950 dark:text-blue-50">
                    Remarks (optional)
                    <input
                      className={`${procurementFieldClass} mt-1`}
                      value={estimateRemarks}
                      onChange={(e) => setEstimateRemarks(e.target.value)}
                      placeholder={canReviseEstimate(viewingRow) ? "Estimated prices revised" : "Estimated prices entered"}
                    />
                  </label>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-sm disabled:opacity-60"
                    disabled={savingEstimate}
                    onClick={() => void saveEstimatedPrices()}
                  >
                    {savingEstimate ? "Saving…" : canReviseEstimate(viewingRow) ? "Save price changes" : "Save estimated prices"}
                  </button>
                </div>
              ) : null}
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
            <p className="text-sm font-medium text-blue-900 dark:text-blue-50">
              {reviewAction.type === "reject"
                ? `Remarks are required to reject ${reviewAction.label}. The requester can edit and resubmit.`
                : reviewAction.type === "hold"
                  ? `Remarks are required to hold ${reviewAction.label}. You can release, approve, or reject later.`
                  : `Remarks are required to approve ${reviewAction.label}. They stay on this approval step.`}
            </p>
            <label className="block">
              <span className="text-base font-bold text-blue-950 dark:text-blue-50">
                Remarks <span className="text-red-600">*</span>
              </span>
              <textarea
                required
                rows={5}
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Write the remarks for this step. They are saved on the requisition and shown to the requester."
                className="mt-2 w-full rounded-xl border-2 border-blue-600 bg-amber-50 px-4 py-3 text-base font-semibold text-slate-950 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-300 dark:border-blue-400 dark:bg-slate-950 dark:text-white"
              />
            </label>
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
                disabled={reviewSaving || !reviewReason.trim()}
                className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
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
            const selectedIndexes = prLines
              .map((item, i) => (lineOpenForPo(item) && convertSelected[i] ? i : -1))
              .filter((i) => i >= 0);
            const allLinesHaveVendor =
              selectedIndexes.length > 0 &&
              selectedIndexes.every((i) => Boolean(convertLineVendors[i]));
            const allLinesHavePrice =
              selectedIndexes.length > 0 &&
              selectedIndexes.every((i) => {
                const raw = convertLinePrices[i];
                const n = Number(raw);
                return Boolean(raw?.trim()) && Number.isFinite(n) && n > 0;
              });
            const uniqueVendors = [
              ...new Set(selectedIndexes.map((i) => convertLineVendors[i]).filter(Boolean)),
            ];
            const applyVendorToAll = (supplierId: string) => {
              setConvertLineVendors((prev) => {
                const next = { ...prev };
                selectedIndexes.forEach((i) => {
                  next[i] = supplierId;
                });
                return next;
              });
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
                  Tick the lines for this purchase order, then set a vendor and unit price on each
                  ticked line. Unticked lines stay on the PR as remaining and can be purchased later.
                  Every remaining line starts checked.
                </p>
                {(() => {
                  const openIndexes = prLines
                    .map((item, i) => (lineOpenForPo(item) ? i : -1))
                    .filter((i) => i >= 0);
                  if (openIndexes.length < 2) return null;
                  const allChecked = openIndexes.every((i) => convertSelected[i]);
                  return (
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-blue-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={allChecked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setConvertSelected((prev) => {
                            const next = { ...prev };
                            openIndexes.forEach((i) => {
                              next[i] = on;
                            });
                            return next;
                          });
                        }}
                      />
                      Check all remaining lines
                    </label>
                  );
                })()}

                {selectedIndexes.length > 1 ? (
                  <div>
                    <FormLabel>Apply one vendor to selected lines</FormLabel>
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
                    prLines.map((item, i) => {
                      const openForPo = lineOpenForPo(item);
                      const picked = Boolean(openForPo && convertSelected[i]);
                      return (
                      <article
                        key={item._id || i}
                        className="rounded-xl border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 shrink-0"
                              checked={picked}
                              disabled={!openForPo}
                              onChange={(e) =>
                                setConvertSelected((prev) => ({ ...prev, [i]: e.target.checked }))
                              }
                              aria-label={`Include line ${i + 1} on this purchase order`}
                            />
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
                          </div>
                          {!openForPo ? (
                            <StatusBadge
                              status={item.lineFulfillmentStatus || "po_draft"}
                              label={item.lineFulfillmentLabel || "already on a PO"}
                            />
                          ) : !picked ? (
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                              Remaining — waiting for a later PO
                            </span>
                          ) : null}
                        </header>
                        {!picked ? null : item.description ? (
                          <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
                            {item.description}
                          </p>
                        ) : null}
                        {picked ? (
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
                        ) : null}
                      </article>
                      );
                    })
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
                        const lineSuppliers = prLines.map((_, i) => convertLineVendors[i] || "");
                        const lineUnitPrices = prLines.map((_, i) => {
                          const n = Number(convertLinePrices[i]);
                          return Number.isFinite(n) ? n : 0;
                        });
                        const prId = convertPr._id;
                        await procurementApi.convertRequisitionToPO(prId, {
                          supplier: lineSuppliers[selectedIndexes[0]],
                          lineSuppliers,
                          lineUnitPrices,
                          lineIndexes: selectedIndexes,
                        });
                        setConvertPr(null);
                        setConvertLineVendors({});
                        setConvertLinePrices({});
                        setConvertSelected({});
                        await load();
                        if (viewingRow?._id === prId) {
                          const fresh = await procurementApi.getRequisition(prId);
                          setViewingRow(fresh.data);
                          const next: Record<number, boolean> = {};
                          (fresh.data.items || []).forEach((item, i) => {
                            next[i] = lineOpenForPo(item);
                          });
                          setDetailPoSelected(next);
                        }
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Convert failed");
                      } finally {
                        setConverting(false);
                      }
                    }}
                  >
                    {converting
                      ? "Creating…"
                      : `Create draft PO (${selectedIndexes.length} line${selectedIndexes.length === 1 ? "" : "s"})`}
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
