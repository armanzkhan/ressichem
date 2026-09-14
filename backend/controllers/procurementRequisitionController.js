const PurchaseRequisition = require("../models/PurchaseRequisition");
const { getCompanyId, nextDocumentNumber, computeLineTotals } = require("../utils/procurementHelpers");
const {
  canApproveRequisitions,
  isProcurementAdminUser,
} = require("../utils/procurementPrRouting");
const {
  collectDepartmentsFromPr,
  departmentsTitleLabel,
  buildApprovalsForDepartments,
  userHasApprovalRoleOnPr,
  pendingApprovalsForUser,
  deriveStatusAfterApprovals,
  firstPendingApproverId,
  uniqueApproverIds,
  approvalApproverId,
} = require("../utils/procurementPrApprovals");
const procurementPrNotificationService = require("../services/procurementPrNotificationService");

const USER_AUDIT_FIELDS = "firstName lastName email role";

function populateRequisitionAudit(query) {
  return query
    .populate("supplier", "supplierCode name")
    .populate("requestedBy", USER_AUDIT_FIELDS)
    .populate("submittedBy", USER_AUDIT_FIELDS)
    .populate("assignedApprover", USER_AUDIT_FIELDS)
    .populate("approvals.approver", USER_AUDIT_FIELDS)
    .populate("approvedBy", USER_AUDIT_FIELDS)
    .populate("rejectedBy", USER_AUDIT_FIELDS)
    .populate("heldBy", USER_AUDIT_FIELDS);
}

function assertCanActOnPr(req, pr) {
  if (isProcurementAdminUser(req.user)) return true;
  return userHasApprovalRoleOnPr(req.user, pr);
}

function syncTitleFromItems(items, fallbackTitle) {
  const depts = collectDepartmentsFromPr({ items, title: fallbackTitle });
  return departmentsTitleLabel(depts) || String(fallbackTitle || "").trim();
}

exports.list = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, purchaseType } = req.query;
    const query = { company_id };
    if (status) query.status = status;
    if (purchaseType) query.purchaseType = purchaseType;

    // Approvers (non-admin) only see PRs where they are an assigned department approver.
    if (canApproveRequisitions(req.user) && !isProcurementAdminUser(req.user)) {
      query.$or = [
        { assignedApprover: req.user._id },
        { "approvals.approver": req.user._id },
      ];
    }

    const data = await populateRequisitionAudit(PurchaseRequisition.find(query))
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOne({ _id: req.params.id, company_id })
    ).populate("supplier", "supplierCode name defaultCurrency");
    if (!data) return res.status(404).json({ success: false, message: "Requisition not found" });

    if (canApproveRequisitions(req.user) && !isProcurementAdminUser(req.user)) {
      if (!userHasApprovalRoleOnPr(req.user, data)) {
        return res.status(403).json({ success: false, message: "This PR is assigned to another approver" });
      }
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const requisitionNumber = await nextDocumentNumber(PurchaseRequisition, company_id, "PR");
    const { items, subtotal } = computeLineTotals(body.items, body.exchangeRate || 1);
    const taxAmount = Number(body.taxAmount) || 0;
    const title = syncTitleFromItems(items, body.title);
    const data = await PurchaseRequisition.create({
      ...body,
      company_id,
      requisitionNumber,
      title,
      items,
      subtotal,
      taxAmount,
      total: Math.round((subtotal + taxAmount) * 100) / 100,
      status: body.status || "draft",
      requestedBy: req.user?._id,
      approvals: [],
    });
    const populated = await populateRequisitionAudit(PurchaseRequisition.findById(data._id));
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseRequisition.findOne({ _id: req.params.id, company_id });
    if (!existing) return res.status(404).json({ success: false, message: "Requisition not found" });
    if (["approved", "cancelled", "partially_approved", "submitted", "held"].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit requisition in status: ${existing.status}`,
      });
    }
    const body = req.body || {};
    const updates = { ...body };
    delete updates.assignedApprover;
    delete updates.approvals;
    delete updates.approvedBy;
    delete updates.approvedAt;
    if (body.items) {
      const { items, subtotal } = computeLineTotals(body.items, body.exchangeRate ?? existing.exchangeRate);
      updates.items = items;
      updates.subtotal = subtotal;
      updates.taxAmount = Number(body.taxAmount) || 0;
      updates.total = Math.round((subtotal + updates.taxAmount) * 100) / 100;
      updates.title = syncTitleFromItems(items, body.title ?? existing.title);
    } else if (body.title != null) {
      updates.title = String(body.title).trim();
    }
    const data = await populateRequisitionAudit(
      PurchaseRequisition.findByIdAndUpdate(req.params.id, updates, { new: true })
    );
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      status: { $in: ["draft", "rejected"] },
    });
    if (!existing) {
      return res.status(400).json({ success: false, message: "Requisition not found or cannot be submitted" });
    }

    const departments = collectDepartmentsFromPr(existing);
    if (!departments.length) {
      return res.status(400).json({
        success: false,
        message:
          "Add at least one department on the line items (or set Department) before submitting.",
      });
    }

    const { approvals, missing } = await buildApprovalsForDepartments(company_id, departments);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `No approver is configured for department(s): ${missing
          .map((d) => `"${d}"`)
          .join(", ")}. Ask a Procurement Admin to map them under PR Approvers.`,
      });
    }

    const assignedApprover = firstPendingApproverId(approvals);
    const title = departmentsTitleLabel(departments);

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: { $in: ["draft", "rejected"] } },
        {
          status: "submitted",
          title,
          submittedBy: req.user?._id,
          submittedAt: new Date(),
          assignedApprover,
          approvals,
          approvedBy: undefined,
          approvedAt: undefined,
          rejectionReason: "",
          rejectedBy: undefined,
          rejectedAt: undefined,
          holdReason: "",
          heldBy: undefined,
          heldAt: undefined,
        },
        { new: true }
      )
    );
    if (!data) {
      return res.status(400).json({ success: false, message: "Requisition not found or cannot be submitted" });
    }

    void procurementPrNotificationService.notifyPrSubmittedToApprovers(
      data,
      req.user,
      uniqueApproverIds(approvals)
    );
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      status: { $in: ["submitted", "held", "partially_approved"] },
    });
    if (!existing) {
      return res.status(400).json({ success: false, message: "Requisition not found or not awaiting approval" });
    }
    if (!assertCanActOnPr(req, existing)) {
      return res.status(403).json({ success: false, message: "This PR is assigned to another approver" });
    }

    const approvals = (existing.approvals || []).map((a) =>
      typeof a.toObject === "function" ? a.toObject() : { ...a }
    );

    // Legacy single-approver PRs (no approvals rows): one approval finishes the PR.
    if (!approvals.length) {
      const data = await populateRequisitionAudit(
        PurchaseRequisition.findOneAndUpdate(
          { _id: existing._id, company_id, status: { $in: ["submitted", "held"] } },
          {
            status: "approved",
            approvedBy: req.user?._id,
            approvedAt: new Date(),
            holdReason: "",
            heldBy: undefined,
            heldAt: undefined,
          },
          { new: true }
        )
      );
      if (!data) {
        return res.status(400).json({ success: false, message: "Requisition not found or not awaiting approval" });
      }
      void procurementPrNotificationService.notifyPrApproved(data, req.user);
      return res.json({ success: true, data });
    }

    const actorId = String(req.user?._id || "");
    const isAdmin = isProcurementAdminUser(req.user);
    let touched = 0;
    for (const row of approvals) {
      if (row.status !== "pending" && row.status !== "held") continue;
      const mine = approvalApproverId(row) === actorId;
      if (!mine && !isAdmin) continue;
      row.status = "approved";
      row.actedAt = new Date();
      row.reason = "";
      touched += 1;
    }

    if (touched === 0) {
      return res.status(403).json({
        success: false,
        message:
          "You have no pending department approval on this PR (another approver may still need to act).",
      });
    }

    const nextStatus = deriveStatusAfterApprovals(approvals);
    const patch = {
      approvals,
      status: nextStatus,
      assignedApprover: firstPendingApproverId(approvals) || existing.assignedApprover,
      holdReason: "",
      heldBy: undefined,
      heldAt: undefined,
    };

    if (nextStatus === "approved") {
      patch.approvedBy = req.user?._id;
      patch.approvedAt = new Date();
    }

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: { $in: ["submitted", "held", "partially_approved"] } },
        patch,
        { new: true }
      )
    );
    if (!data) {
      return res.status(400).json({ success: false, message: "Requisition not found or not awaiting approval" });
    }

    if (nextStatus === "approved") {
      void procurementPrNotificationService.notifyPrApproved(data, req.user);
    } else {
      void procurementPrNotificationService.notifyPrPartiallyApproved(data, req.user);
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const reason = String(req.body?.reason || "").trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      status: { $in: ["submitted", "held", "partially_approved"] },
    });
    if (!existing) {
      return res.status(400).json({ success: false, message: "Requisition not found or not awaiting approval" });
    }
    if (!assertCanActOnPr(req, existing)) {
      return res.status(403).json({ success: false, message: "This PR is assigned to another approver" });
    }

    // One reject rejects the whole PR.
    const approvals = (existing.approvals || []).map((a) => {
      const row = typeof a.toObject === "function" ? a.toObject() : { ...a };
      if (row.status === "pending" || row.status === "held") {
        row.status = "rejected";
        row.actedAt = new Date();
        row.reason = reason;
      }
      return row;
    });

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: { $in: ["submitted", "held", "partially_approved"] } },
        {
          status: "rejected",
          approvals,
          rejectedBy: req.user?._id,
          rejectedAt: new Date(),
          rejectionReason: reason,
          holdReason: "",
          heldBy: undefined,
          heldAt: undefined,
        },
        { new: true }
      )
    );
    if (!data) {
      return res.status(400).json({ success: false, message: "Requisition not found or not awaiting approval" });
    }
    void procurementPrNotificationService.notifyPrRejected(data, req.user, reason);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.hold = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const reason = String(req.body?.reason || "").trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: "Hold reason is required" });
    }
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      status: { $in: ["submitted", "partially_approved"] },
    });
    if (!existing) {
      return res.status(400).json({ success: false, message: "Requisition not found or not submitted" });
    }
    if (!assertCanActOnPr(req, existing)) {
      return res.status(403).json({ success: false, message: "This PR is assigned to another approver" });
    }

    const actorId = String(req.user?._id || "");
    const isAdmin = isProcurementAdminUser(req.user);
    const approvals = (existing.approvals || []).map((a) => {
      const row = typeof a.toObject === "function" ? a.toObject() : { ...a };
      const mine = approvalApproverId(row) === actorId;
      if (row.status === "pending" && (mine || isAdmin)) {
        row.status = "held";
        row.actedAt = new Date();
        row.reason = reason;
      }
      return row;
    });

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: { $in: ["submitted", "partially_approved"] } },
        {
          status: "held",
          approvals,
          heldBy: req.user?._id,
          heldAt: new Date(),
          holdReason: reason,
        },
        { new: true }
      )
    );
    if (!data) {
      return res.status(400).json({ success: false, message: "Requisition not found or not submitted" });
    }
    void procurementPrNotificationService.notifyPrHeld(data, req.user, reason);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.releaseHold = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      status: "held",
    });
    if (!existing) {
      return res.status(400).json({ success: false, message: "Requisition not found or not on hold" });
    }
    if (!assertCanActOnPr(req, existing)) {
      return res.status(403).json({ success: false, message: "This PR is assigned to another approver" });
    }

    const approvals = (existing.approvals || []).map((a) => {
      const row = typeof a.toObject === "function" ? a.toObject() : { ...a };
      if (row.status === "held") {
        row.status = "pending";
        row.reason = "";
      }
      return row;
    });
    const nextStatus = approvals.length ? deriveStatusAfterApprovals(approvals) : "submitted";
    // derive returns approved only if all approved; held rows now pending → submitted or partially_approved
    const status = nextStatus === "approved" ? "approved" : nextStatus === "partially_approved" ? "partially_approved" : "submitted";

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: "held" },
        {
          status,
          approvals,
          holdReason: "",
          heldBy: undefined,
          heldAt: undefined,
          assignedApprover: firstPendingApproverId(approvals) || existing.assignedApprover,
        },
        { new: true }
      )
    );
    if (!data) return res.status(400).json({ success: false, message: "Requisition not found or not on hold" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** Convert an approved PR into a draft PO (procurement cycle step). */
exports.convertToPO = async (req, res) => {
  try {
    const PurchaseOrder = require("../models/PurchaseOrder");
    const {
      prepareCommercialPayload,
      persistSupplierBanking,
      normalizeSupplierIds,
    } = require("../services/procurementDocumentService");
    const company_id = getCompanyId(req);
    const pr = await PurchaseRequisition.findOne({ _id: req.params.id, company_id });
    if (!pr) return res.status(404).json({ success: false, message: "Requisition not found" });
    if (pr.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only fully approved requisitions can be converted to a PO (all department approvers must approve)",
      });
    }

    const existingPo = await PurchaseOrder.findOne({ company_id, requisition: pr._id }).lean();
    if (existingPo) {
      return res.status(400).json({
        success: false,
        message: `A purchase order already exists for this PR (${existingPo.poNumber})`,
        data: existingPo,
      });
    }

    const supplierId = req.body?.supplier || pr.supplier;
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: "Select a supplier to convert this requisition into a purchase order",
      });
    }

    const items = (pr.items || []).map((line) => {
      const plain = typeof line.toObject === "function" ? line.toObject() : { ...line };
      return {
        ...plain,
        receivedQuantity: 0,
        unitPrice: Number(plain.unitPrice) || 0,
        lineTotal: Number(plain.lineTotal) || (Number(plain.quantity) || 0) * (Number(plain.unitPrice) || 0),
      };
    });

    const commercial = await prepareCommercialPayload({
      supplier: supplierId,
      suppliers: [supplierId],
      purchaseType: pr.purchaseType || "foreign",
      currency: pr.currency || "USD",
      exchangeRate: pr.exchangeRate || 1,
      prNumber: pr.requisitionNumber || "",
      items,
      taxAmount: pr.taxAmount || 0,
      notes: pr.notes || `Converted from ${pr.requisitionNumber}`,
    });

    const poNumber = await nextDocumentNumber(PurchaseOrder, company_id, "PO");
    const po = await PurchaseOrder.create({
      ...commercial,
      company_id,
      poNumber,
      supplier: supplierId,
      suppliers: [supplierId],
      requisition: pr._id,
      status: "draft",
      documentDate: new Date(),
      createdBy: req.user?._id,
    });

    await persistSupplierBanking(normalizeSupplierIds(commercial), commercial.supplierBanking, req.user?._id);

    const populated = await PurchaseOrder.findById(po._id)
      .populate("supplier", "supplierCode name banking")
      .populate("requisition", "requisitionNumber")
      .lean();

    return res.status(201).json({
      success: true,
      message: `Created draft PO ${po.poNumber} from ${pr.requisitionNumber}`,
      data: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Used by UI helpers if needed later
exports._pendingApprovalsForUser = pendingApprovalsForUser;
