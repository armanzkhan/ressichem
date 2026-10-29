const PurchaseRequisition = require("../models/PurchaseRequisition");
const { getCompanyId, nextDocumentNumber, computeLineTotals } = require("../utils/procurementHelpers");
const {
  canApproveRequisitions,
  canCreatePurchaseOrders,
  canCreateRequisitions,
  isProcurementAdminUser,
  canSoftDeleteProcurement,
  isPrRequester,
  applyPurchaseRequisitionVisibility,
  normalizeDepartment,
  requesterApprovalChain,
  resolveApprovalChainForSubmit,
  hasPrFullAccess,
  normalizeEmail,
  isCorporatePipelineApproverUser,
  corporateApproverStageForUser,
  isLahorePr,
  isLahorePlantScopedUser,
  ensureUserDepartment,
  lahoreFinalApproverEmail,
  labApproverEmail,
} = require("../utils/procurementPrRouting");
const {
  collectDepartmentsFromPr,
  departmentsTitleLabel,
  buildApprovalsForDepartments,
  ensureDepartmentsMappedToUser,
  assertCorporateApproversConfigured,
  advanceCorporateApprovalStages,
  actionableApprovalRows,
  getActionableApprovalStage,
  approvalStage,
  userHasApprovalRoleOnPr,
  pendingApprovalsForUser,
  deriveStatusAfterApprovals,
  firstPendingApproverId,
  uniqueApproverIds,
  approvalApproverId,
  applyRequesterDepartmentApproverOverride,
  assignDepartmentApprovalsToRequester,
  approvalOptionsForPrDoc,
  ensureLahoreBossApprover,
  stripObsoleteBossApprovals,
  approvalOptionsFromPr,
} = require("../utils/procurementPrApprovals");
const procurementPrNotificationService = require("../services/procurementPrNotificationService");
const PurchaseOrder = require("../models/PurchaseOrder");
const { enrichPrsWithFulfillment } = require("../utils/procurementPrFulfillment");
const {
  slaEnabled,
  computeSlaDueAt,
  computeHoldExpiresAt,
  extendSlaAfterHold,
  isPastSlaDeadline,
  slaStatusForPr,
} = require("../utils/procurementPrSameDaySla");

const USER_AUDIT_FIELDS = "firstName lastName email role";

function populateRequisitionAudit(query, { includeLineSuppliers = false } = {}) {
  let q = query
    .populate("supplier", "supplierCode name")
    .populate("requestedBy", USER_AUDIT_FIELDS)
    .populate("submittedBy", USER_AUDIT_FIELDS)
    .populate("assignedApprover", USER_AUDIT_FIELDS)
    .populate("approvals.approver", USER_AUDIT_FIELDS)
    .populate("approvedBy", USER_AUDIT_FIELDS)
    .populate("rejectedBy", USER_AUDIT_FIELDS)
    .populate("heldBy", USER_AUDIT_FIELDS)
    .populate("followUpBy", USER_AUDIT_FIELDS);
  // Line vendors are chosen at Create PO — skip on list for speed
  if (includeLineSuppliers) {
    q = q.populate("items.supplier", "supplierCode name companyName");
  }
  return q;
}

function assertCanActOnPr(req, pr) {
  if (isProcurementAdminUser(req.user) || hasPrFullAccess(req.user)) return true;
  return userHasApprovalRoleOnPr(req.user, pr);
}

function assertCanEditOrSubmitPr(req, pr) {
  if (isProcurementAdminUser(req.user) || hasPrFullAccess(req.user)) return true;
  return isPrRequester(req.user, pr);
}

/** Requester: draft/rejected. Assigned approver (or admin): submitted/held/partially_approved before decision.
 *  PR full-access users (e.g. salim@gmail.com) may amend any status including approved. */
function assertCanAmendPr(req, pr) {
  if (isProcurementAdminUser(req.user) || hasPrFullAccess(req.user)) return true;
  const status = String(pr.status || "").toLowerCase();
  if (status === "draft" || status === "rejected") {
    return isPrRequester(req.user, pr);
  }
  if (status === "submitted" || status === "held" || status === "partially_approved") {
    return assertCanActOnPr(req, pr);
  }
  return false;
}

function syncTitleFromItems(items, fallbackTitle) {
  const depts = collectDepartmentsFromPr({ items, title: fallbackTitle });
  return departmentsTitleLabel(depts) || String(fallbackTitle || "").trim();
}

exports.list = async (req, res) => {
  try {
    await ensureUserDepartment(req.user);
    const company_id = getCompanyId(req);
    const { status, purchaseType, location, followUpStatus, fulfillmentStatus } = req.query;
    const query = { company_id, isActive: { $ne: false } };
    if (status) query.status = status;
    if (purchaseType) query.purchaseType = purchaseType;
    if (location) query.location = String(location).trim();
    if (followUpStatus) query.followUpStatus = String(followUpStatus).trim();

    applyPurchaseRequisitionVisibility(query, req.user);

    let data = await populateRequisitionAudit(PurchaseRequisition.find(query))
      .sort({ createdAt: -1 })
      .lean();

    // Finance / Lab / Lahore final: also include open PRs whose current stage is theirs.
    const corporateStage =
      !hasPrFullAccess(req.user) && isCorporatePipelineApproverUser(req.user)
        ? corporateApproverStageForUser(req.user)
        : null;
    if (corporateStage) {
      const openQuery = {
        company_id,
        isActive: { $ne: false },
        status: { $in: ["submitted", "held", "partially_approved"] },
      };
      if (purchaseType) openQuery.purchaseType = purchaseType;
      const openRows = await populateRequisitionAudit(PurchaseRequisition.find(openQuery)).lean();
      const seen = new Set(data.map((r) => String(r._id)));
      for (const row of openRows) {
        if (seen.has(String(row._id))) continue;
        const opts = approvalOptionsFromPr(row);
        if (getActionableApprovalStage(row.approvals || [], opts) !== corporateStage) continue;
        // tahira@: Lahore finance queue only (not Hub finance@ PRs)
        if (
          corporateStage === "finance" &&
          normalizeEmail(req.user?.email) === lahoreFinalApproverEmail()
        ) {
          const lahore =
            Boolean(opts.lahoreFinalApproval || opts.lahoreFinalBoss) || isLahorePr(row);
          if (!lahore) continue;
        }
        data.push(row);
        seen.add(String(row._id));
      }
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    // Repair: Lahore → tahira@; Hub → cancel obsolete Boss (zulfiqar@) rows.
    let repairedAny = false;
    for (const row of data) {
      const open = ["submitted", "held", "partially_approved"].includes(String(row.status || ""));
      if (!open || !(row.approvals || []).length) continue;
      try {
        const hadSticky = Boolean(row.lahoreFinalApproval);
        const isLahore = hadSticky || isLahorePr(row);
        if (isLahore) row.lahoreFinalApproval = true;
        const stageOpts = await approvalOptionsForPrDoc(row);
        let approvals = row.approvals;
        let changed = false;

        if (isLahore) {
          const repaired = await ensureLahoreBossApprover(company_id, approvals, stageOpts);
          approvals = repaired.approvals;
          changed = changed || repaired.reassigned;
        } else {
          const stripped = stripObsoleteBossApprovals(row, approvals, stageOpts);
          approvals = stripped.approvals;
          changed = changed || stripped.changed;
        }

        const needsSticky = isLahore && !hadSticky;
        if (!changed && !needsSticky) continue;

        const nextStatus = deriveStatusAfterApprovals(approvals, stageOpts);
        const nextAssigned =
          firstPendingApproverId(approvals, stageOpts) ||
          (nextStatus === "approved" ? undefined : row.assignedApprover);
        const patch = {
          ...(changed
            ? {
                approvals,
                assignedApprover: nextAssigned,
              }
            : {}),
          ...(needsSticky || isLahore ? { lahoreFinalApproval: true } : {}),
        };
        if (changed && nextStatus === "approved" && row.status !== "approved") {
          patch.status = "approved";
          patch.approvedAt = new Date();
        } else if (changed && nextStatus !== row.status && nextStatus !== "approved") {
          patch.status = nextStatus;
        }

        await PurchaseRequisition.updateOne({ _id: row._id, company_id }, patch);
        repairedAny = true;
      } catch (repairErr) {
        console.error("Boss/Lahore approval repair failed:", repairErr.message);
      }
    }
    if (repairedAny) {
      data = await populateRequisitionAudit(
        PurchaseRequisition.find({ _id: { $in: data.map((r) => r._id) }, company_id })
      )
        .sort({ createdAt: -1 })
        .lean();
    }

    // Additive enrichment — never mutates PR.status
    data = await enrichPrsWithFulfillment(PurchaseOrder, company_id, data);
    data = data.map((row) => {
      const sla = slaStatusForPr(row);
      return {
        ...row,
        slaStatus: sla.status,
        slaLabel: sla.label,
        slaDueAt: row.slaDueAt || sla.dueAt || null,
      };
    });

    const fulfillmentFilter = String(fulfillmentStatus || "")
      .trim()
      .toLowerCase();
    if (fulfillmentFilter) {
      data = data.filter((r) => String(r.fulfillmentStatus || r.stockStatus || "").toLowerCase() === fulfillmentFilter);
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

function userCanViewPr(req, pr) {
  if (isProcurementAdminUser(req.user) || hasPrFullAccess(req.user)) return true;
  if (isPrRequester(req.user, pr)) return true;
  if (canApproveRequisitions(req.user) || isCorporatePipelineApproverUser(req.user)) {
    if (userHasApprovalRoleOnPr(req.user, pr)) return true;
    const stage = corporateApproverStageForUser(req.user);
    if (stage) {
      const open = ["submitted", "held", "partially_approved"].includes(
        String(pr.status || "").toLowerCase()
      );
      if (open) {
        const opts = approvalOptionsFromPr(pr);
        if (getActionableApprovalStage(pr.approvals || [], opts) === stage) return true;
      }
    }
  }
  if (canCreatePurchaseOrders(req.user) && String(pr.status || "").toLowerCase() === "approved") {
    return true;
  }
  // Read-only viewers (no create / approve / PO) may view company PRs
  if (!canCreateRequisitions(req.user) && !canApproveRequisitions(req.user) && !canCreatePurchaseOrders(req.user)) {
    return true;
  }
  return false;
}

exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOne({ _id: req.params.id, company_id, isActive: { $ne: false } }),
      { includeLineSuppliers: true }
    ).populate("supplier", "supplierCode name defaultCurrency");
    if (!data) return res.status(404).json({ success: false, message: "Requisition not found" });

    if (!userCanViewPr(req, data)) {
      return res.status(403).json({ success: false, message: "You do not have access to this purchase requisition" });
    }

    const [enriched] = await enrichPrsWithFulfillment(PurchaseOrder, company_id, [
      data.toObject ? data.toObject() : data,
    ]);
    const row = enriched || (data.toObject ? data.toObject() : data);
    const sla = slaStatusForPr(row);
    return res.json({
      success: true,
      data: {
        ...row,
        slaStatus: sla.status,
        slaLabel: sla.label,
        slaDueAt: row.slaDueAt || sla.dueAt || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    await ensureUserDepartment(req.user);
    const company_id = getCompanyId(req);
    const body = req.body || {};
    const requisitionNumber = await nextDocumentNumber(PurchaseRequisition, company_id, "PR");
    const { items, subtotal } = computeLineTotals(body.items, body.exchangeRate || 1);
    const taxAmount = Number(body.taxAmount) || 0;
    const title = syncTitleFromItems(items, body.title);
    const lahoreBuyer = isLahorePlantScopedUser(req.user) && !isProcurementAdminUser(req.user);
    let location = String(body.location || "").trim();
    if (lahoreBuyer && !location) location = "Lahore";
    const data = await PurchaseRequisition.create({
      company_id,
      requisitionNumber,
      title,
      items,
      subtotal,
      taxAmount,
      total: Math.round((subtotal + taxAmount) * 100) / 100,
      status: body.status || "draft",
      purchaseType: body.purchaseType || "foreign",
      currency: body.currency || "USD",
      exchangeRate: body.exchangeRate || 1,
      notes: body.notes || "",
      supplier: body.supplier || undefined,
      location,
      // Sticky Lahore for plant-scoped buyers (even before submit)
      ...(lahoreBuyer ? { lahoreFinalApproval: true } : {}),
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
    if (!assertCanAmendPr(req, existing)) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot edit this purchase requisition (only the requester on draft/rejected, or an assigned approver before approve/reject).",
      });
    }
    if (["approved", "cancelled"].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit requisition in status: ${existing.status}`,
      });
    }
    const body = req.body || {};
    const updates = { ...body };
    // Never change workflow/audit fields via generic update
    delete updates.status;
    delete updates.assignedApprover;
    delete updates.approvals;
    delete updates.approvedBy;
    delete updates.approvedAt;
    delete updates.rejectedBy;
    delete updates.rejectedAt;
    delete updates.rejectionReason;
    delete updates.heldBy;
    delete updates.heldAt;
    delete updates.holdReason;
    delete updates.submittedBy;
    delete updates.submittedAt;
    delete updates.requestedBy;
    if (body.items) {
      const { items, subtotal } = computeLineTotals(body.items, body.exchangeRate ?? existing.exchangeRate);
      updates.items = items;
      updates.subtotal = subtotal;
      updates.taxAmount = Number(body.taxAmount) || 0;
      updates.total = Math.round((subtotal + updates.taxAmount) * 100) / 100;
      updates.title = syncTitleFromItems(items, body.title ?? existing.title);

      // If still in department approval stage and departments changed, rebuild dept rows
      const stageOpts = await approvalOptionsForPrDoc(existing);
      const stage = getActionableApprovalStage(existing.approvals || [], stageOpts);
      if (
        (existing.status === "submitted" ||
          existing.status === "held" ||
          existing.status === "partially_approved") &&
        stage === "department"
      ) {
        const oldKeys = collectDepartmentsFromPr(existing)
          .map((d) => normalizeDepartment(d))
          .sort()
          .join("|");
        const newKeys = collectDepartmentsFromPr({ items, title: updates.title })
          .map((d) => normalizeDepartment(d))
          .sort()
          .join("|");
        if (oldKeys !== newKeys) {
          const departments = collectDepartmentsFromPr({ items, title: updates.title });
          let built = await buildApprovalsForDepartments(company_id, departments);
          if (built.missing.length) {
            return res.status(400).json({
              success: false,
              message: `No active approver for department(s): ${built.missing.map((d) => `"${d}"`).join(", ")}`,
            });
          }
          const chain = requesterApprovalChain(
            normalizeEmail(existing.requestedBy?.email || req.user?.email)
          );
          if (chain?.departmentApproverEmail) {
            const overridden = await applyRequesterDepartmentApproverOverride(
              company_id,
              built.approvals,
              chain
            );
            if (overridden.missingEmail) {
              return res.status(400).json({
                success: false,
                message: `No active user for required department approver ${overridden.missingEmail}`,
              });
            }
            built = { ...built, approvals: overridden.approvals };
          }
          const corporate = (existing.approvals || [])
            .map((a) => (typeof a.toObject === "function" ? a.toObject() : { ...a }))
            .filter((a) => approvalStage(a) !== "department");
          updates.approvals = [...built.approvals, ...corporate];
          updates.assignedApprover =
            firstPendingApproverId(updates.approvals, stageOpts) || existing.assignedApprover;
        }
      }
    } else if (body.title != null) {
      updates.title = String(body.title).trim();
    }
    if (body.location !== undefined) {
      updates.location = String(body.location || "").trim();
    }
    const data = await populateRequisitionAudit(
      PurchaseRequisition.findByIdAndUpdate(req.params.id, updates, { new: true })
    );
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Additive follow-up update for pending/on-hold (and any visible PR).
 * Does not change approval status or line items.
 */
exports.updateFollowUp = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      isActive: { $ne: false },
    });
    if (!existing) return res.status(404).json({ success: false, message: "Requisition not found" });
    if (!userCanViewPr(req, existing)) {
      return res.status(403).json({ success: false, message: "Not allowed to update follow-up on this PR" });
    }

    const body = req.body || {};
    const allowed = new Set(["", "open", "in_progress", "done"]);
    const followUpStatus = body.followUpStatus !== undefined ? String(body.followUpStatus || "") : existing.followUpStatus;
    if (!allowed.has(followUpStatus)) {
      return res.status(400).json({
        success: false,
        message: "followUpStatus must be one of: (empty), open, in_progress, done",
      });
    }

    const updates = {
      followUpStatus,
      followUpNote:
        body.followUpNote !== undefined ? String(body.followUpNote || "").trim() : existing.followUpNote || "",
      followUpBy: req.user?._id,
      followUpAt: new Date(),
    };
    if (body.location !== undefined) {
      updates.location = String(body.location || "").trim();
    }

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findByIdAndUpdate(existing._id, updates, { new: true })
    );
    return res.json({ success: true, data, message: "Follow-up updated" });
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
    if (!assertCanEditOrSubmitPr(req, existing)) {
      return res.status(403).json({
        success: false,
        message: "Only the requester can submit or resubmit this purchase requisition",
      });
    }

    const departments = collectDepartmentsFromPr(existing);
    if (!departments.length) {
      return res.status(400).json({
        success: false,
        message:
          "Add at least one department on the line items (or set Department) before submitting.",
      });
    }

    // New departments introduced by the submitter are auto-mapped to them as approver.
    await ensureDepartmentsMappedToUser(company_id, departments, req.user);

    const requesterEmail = normalizeEmail(req.user?.email);
    const resolvedChain = resolveApprovalChainForSubmit(
      requesterEmail,
      departments,
      existing
    );
    const stageOpts = resolvedChain.options;
    const requesterChain = resolvedChain.requesterChain;

    const corporateMissing = await assertCorporateApproversConfigured(company_id, stageOpts);
    if (corporateMissing.length) {
      const lahoreFinal = Boolean(stageOpts?.lahoreFinalApproval || stageOpts?.financeApproverEmail);
      const hint =
        resolvedChain.key === "lab_then_finance"
          ? lahoreFinal
            ? "Lab (lab@ressichem.com) and Lahore Finance (tahira@ressichem.com)"
            : "Lab (lab@ressichem.com) and Finance Manager"
          : resolvedChain.key === "skip_finance"
            ? lahoreFinal
              ? "Lahore final (tahira@ressichem.com)"
              : "Final Approver (configured email)"
            : lahoreFinal
              ? "Lahore Finance (tahira@ressichem.com)"
              : "Finance Manager";
      return res.status(400).json({
        success: false,
        message: `Corporate approvers not configured: ${corporateMissing
          .map((d) => `"${d}"`)
          .join(", ")}. Ensure ${hint} users exist / are mapped before submitting.`,
      });
    }

    let { approvals, missing } = await buildApprovalsForDepartments(company_id, departments);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `No active approver user for department(s): ${missing
          .map((d) => `"${d}"`)
          .join(", ")}. Ensure your account email is active, or ask a Procurement Admin to map them under PR Approvers.`,
      });
    }

    if (requesterChain?.departmentApproverEmail) {
      const overridden = await applyRequesterDepartmentApproverOverride(
        company_id,
        approvals,
        requesterChain
      );
      if (overridden.missingEmail) {
        return res.status(400).json({
          success: false,
          message: `No active user for required department approver ${overridden.missingEmail}`,
        });
      }
      approvals = overridden.approvals;
    }

    // Lab creates the PR and approves it. Other departments' mapped approvers
    // still apply when someone else is the requester.
    if (requesterEmail === labApproverEmail() && req.user?._id) {
      approvals = assignDepartmentApprovalsToRequester(approvals, req.user._id);
    }

    const assignedApprover = firstPendingApproverId(approvals, stageOpts);
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
          approvalChain: resolvedChain.key,
          skipFinanceApproval: resolvedChain.key === "skip_finance",
          // Sticky: Lahore final stays tahira@ even if title/location is edited later
          lahoreFinalApproval: Boolean(
            isLahorePr(existing, departments) ||
              stageOpts?.lahoreFinalApproval ||
              normalizeEmail(stageOpts?.financeApproverEmail) === lahoreFinalApproverEmail()
          ),
          slaDueAt: computeSlaDueAt(new Date()),
          slaReminderSentAt: null,
          slaRemindersSent: [],
          slaClosedByDeadline: false,
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
    if (slaEnabled()) {
      if (!existing.slaDueAt) {
        existing.slaDueAt = computeSlaDueAt(existing);
        await existing.save();
      }
      if (isPastSlaDeadline(existing) && !hasPrFullAccess(req.user) && !isProcurementAdminUser(req.user)) {
        return res.status(400).json({
          success: false,
          message:
            "72-hour SLA expired: this PR was not fully approved within 72 hours of submission. It will be auto-closed if still open.",
        });
      }
    }

    let approvals = (existing.approvals || []).map((a) =>
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

    const stageOpts = await approvalOptionsForPrDoc(existing);

    // Lahore → tahira@; Hub → drop obsolete Boss (zulfiqar@) rows.
    {
      const isLahore =
        Boolean(stageOpts.lahoreFinalBoss || stageOpts.lahoreFinalApproval) ||
        isLahorePr(existing);
      if (isLahore) {
        const repaired = await ensureLahoreBossApprover(company_id, approvals, stageOpts);
        approvals = repaired.approvals;
      } else {
        const stripped = stripObsoleteBossApprovals(existing, approvals, stageOpts);
        approvals = stripped.approvals;
      }
    }

    // Only the current stage can be approved (departments → [finance] → boss).
    const actionable = actionableApprovalRows(approvals, req.user, stageOpts);
    if (!actionable.length) {
      return res.status(403).json({
        success: false,
        message:
          "You have no pending approval on the current stage of this PR (department, finance, or boss).",
      });
    }

    const remarks = String(req.body?.remarks || req.body?.reason || "").trim();
    for (const row of actionable) {
      row.status = "approved";
      row.actedAt = new Date();
      row.reason = remarks;
    }

    let newlyAdded = [];
    try {
      const advanced = await advanceCorporateApprovalStages(company_id, approvals, stageOpts);
      approvals = advanced.approvals;
      newlyAdded = advanced.newlyAdded || [];
    } catch (advErr) {
      if (advErr?.code === "CORPORATE_APPROVER_MISSING") {
        return res.status(400).json({ success: false, message: advErr.message });
      }
      throw advErr;
    }

    const nextStatus = deriveStatusAfterApprovals(approvals, stageOpts);
    const patch = {
      approvals,
      status: nextStatus,
      assignedApprover: firstPendingApproverId(approvals, stageOpts) || existing.assignedApprover,
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

    if (newlyAdded.length) {
      void procurementPrNotificationService.notifyPrSubmittedToApprovers(
        data,
        req.user,
        newlyAdded.map((r) => r.approver)
      );
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
    const fullAccess = hasPrFullAccess(req.user) || isProcurementAdminUser(req.user);
    const existing = await PurchaseRequisition.findOne({
      _id: req.params.id,
      company_id,
      status: fullAccess
        ? { $in: ["submitted", "held", "partially_approved", "approved"] }
        : { $in: ["submitted", "held", "partially_approved"] },
    });
    if (!existing) {
      return res.status(400).json({ success: false, message: "Requisition not found or not awaiting approval" });
    }
    if (!assertCanActOnPr(req, existing)) {
      return res.status(403).json({ success: false, message: "This PR is assigned to another approver" });
    }

    // Only the acting approver's current-stage rows are "rejected".
    // Other pending/held stages are cancelled — otherwise History shows
    // e.g. Madam Tahira as rejector when finance@ actually rejected.
    const stageOpts = await approvalOptionsForPrDoc(existing);
    let approvals = (existing.approvals || []).map((a) =>
      typeof a.toObject === "function" ? a.toObject() : { ...a }
    );
    const actionable = actionableApprovalRows(approvals, req.user, stageOpts);

    if (!actionable.length && !fullAccess) {
      return res.status(403).json({
        success: false,
        message: "You have no pending approval on the current stage of this PR.",
      });
    }

    const now = new Date();
    const rowKey = (row) =>
      `${approvalStage(row)}:${approvalApproverId(row)}:${String(row.departmentKey || row.department || "")}`;
    const actionableKeys = new Set(actionable.map(rowKey));
    const currentStage = getActionableApprovalStage(approvals, stageOpts);

    approvals = approvals.map((row) => {
      if (row.status !== "pending" && row.status !== "held") return row;

      const isActorsRow = actionableKeys.has(rowKey(row));
      const isAdminRejectingCurrentStage =
        fullAccess && !actionable.length && approvalStage(row) === currentStage;

      if (isActorsRow || isAdminRejectingCurrentStage) {
        return {
          ...row,
          status: "rejected",
          actedAt: now,
          reason,
          // Ensure History attributes the reject step to the logged-in user
          approver: req.user?._id || row.approver,
        };
      }

      return {
        ...row,
        status: "cancelled",
        actedAt: now,
        reason: "Not reached — PR rejected",
      };
    });

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        {
          _id: existing._id,
          company_id,
          status: fullAccess
            ? { $in: ["submitted", "held", "partially_approved", "approved"] }
            : { $in: ["submitted", "held", "partially_approved"] },
        },
        {
          status: "rejected",
          approvals,
          rejectedBy: req.user?._id,
          rejectedAt: now,
          rejectionReason: reason,
          assignedApprover: req.user?._id,
          holdReason: "",
          heldBy: undefined,
          heldAt: undefined,
          holdExpiresAt: undefined,
          holdRemindersSent: [],
          approvedBy: undefined,
          approvedAt: undefined,
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

    const approvals = (existing.approvals || []).map((a) =>
      typeof a.toObject === "function" ? a.toObject() : { ...a }
    );
    const stageOpts = await approvalOptionsForPrDoc(existing);
    const actionable = actionableApprovalRows(approvals, req.user, stageOpts);
    if (!actionable.length) {
      return res.status(403).json({
        success: false,
        message: "You have no pending approval on the current stage to hold.",
      });
    }
    for (const row of actionable) {
      if (row.status === "pending") {
        row.status = "held";
        row.actedAt = new Date();
        row.reason = reason;
      }
    }

    const heldAt = new Date();
    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: { $in: ["submitted", "partially_approved"] } },
        {
          status: "held",
          approvals,
          heldBy: req.user?._id,
          heldAt,
          holdExpiresAt: computeHoldExpiresAt(heldAt),
          holdRemindersSent: [],
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
    const stageOpts = await approvalOptionsForPrDoc(existing);
    const nextStatus = approvals.length
      ? deriveStatusAfterApprovals(approvals, stageOpts)
      : "submitted";
    // derive returns approved only if all approved; held rows now pending → submitted or partially_approved
    const status = nextStatus === "approved" ? "approved" : nextStatus === "partially_approved" ? "partially_approved" : "submitted";
    const releasedAt = new Date();
    const slaDueAt = extendSlaAfterHold(existing, releasedAt);

    const data = await populateRequisitionAudit(
      PurchaseRequisition.findOneAndUpdate(
        { _id: existing._id, company_id, status: "held" },
        {
          status,
          approvals,
          slaDueAt,
          slaRemindersSent: [],
          slaReminderSentAt: null,
          holdReason: "",
          heldBy: undefined,
          heldAt: undefined,
          holdExpiresAt: undefined,
          holdRemindersSent: [],
          assignedApprover:
            firstPendingApproverId(approvals, stageOpts) || existing.assignedApprover,
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

    // Buyers (po.create) / admins only — requesters cannot convert PRs to PO
    const permKeys = (req.user?.permissions || []).map((p) => (typeof p === "string" ? p : p?.key || ""));
    const canBuyerConvert = permKeys.includes("procurement.po.create") || isProcurementAdminUser(req.user);
    if (!canBuyerConvert) {
      return res.status(403).json({
        success: false,
        message: "Only buyers can create a purchase order from an approved requisition",
      });
    }

    if (isLahorePlantScopedUser(req.user) && !isLahorePr(pr) && !pr.lahoreFinalApproval) {
      return res.status(403).json({
        success: false,
        message: "This buyer can only create purchase orders for Lahore requisitions",
      });
    }

    // Allow re-convert after a cancelled PO; block only active (non-cancelled) POs
    const existingPo = await PurchaseOrder.findOne({
      company_id,
      requisition: pr._id,
      isActive: { $ne: false },
      status: { $ne: "cancelled" },
    }).lean();
    if (existingPo) {
      return res.status(400).json({
        success: false,
        message: `A purchase order already exists for this PR (${existingPo.poNumber})`,
        data: existingPo,
      });
    }

    // Vendors are chosen at Create PO time (not on the PR form).
    // Prefer body.lineSuppliers[i] per PR line; fall back to body.supplier for every line.
    const defaultSupplierId = req.body?.supplier || pr.supplier || null;
    const lineSuppliersBody = Array.isArray(req.body?.lineSuppliers) ? req.body.lineSuppliers : [];
    const ProcurementSupplier = require("../models/ProcurementSupplier");

    const rawItems = (pr.items || []).map((line, index) => {
      const plain = typeof line.toObject === "function" ? line.toObject() : { ...line };
      const fromBody = lineSuppliersBody[index] || null;
      const lineSupplier = fromBody || defaultSupplierId || null;
      return { plain, lineSupplier };
    });

    if (!rawItems.length) {
      return res.status(400).json({ success: false, message: "Requisition has no line items to convert" });
    }

    const missing = rawItems.filter((r) => !r.lineSupplier);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message:
          missing.length === rawItems.length
            ? "Select a vendor for each line when creating the purchase order"
            : `${missing.length} line(s) still need a vendor before creating the PO`,
      });
    }

    const supplierIds = [...new Set(rawItems.map((r) => String(r.lineSupplier)))];
    const supplierDocs = await ProcurementSupplier.find({ _id: { $in: supplierIds } })
      .select("supplierCode name")
      .lean();
    const nameById = new Map(supplierDocs.map((s) => [String(s._id), s.name || ""]));

    const lineUnitPrices = Array.isArray(req.body?.lineUnitPrices) ? req.body.lineUnitPrices : [];
    const items = rawItems.map(({ plain, lineSupplier }, index) => {
      const sid = String(lineSupplier);
      const fromBody = Number(lineUnitPrices[index]);
      const unitPrice =
        Number.isFinite(fromBody) && fromBody > 0
          ? fromBody
          : Number(plain.unitPrice) || 0;
      const qty = Number(plain.quantity) || 0;
      return {
        ...plain,
        supplier: sid,
        supplierName: plain.supplierName || nameById.get(sid) || "",
        receivedQuantity: 0,
        unitPrice,
        lineTotal: Math.round(qty * unitPrice * 100) / 100,
      };
    });

    const primarySupplierId = supplierIds[0];

    const commercial = await prepareCommercialPayload({
      supplier: primarySupplierId,
      suppliers: supplierIds,
      purchaseType: pr.purchaseType || "foreign",
      currency: pr.currency || "USD",
      exchangeRate: pr.exchangeRate || 1,
      prNumber: pr.requisitionNumber || "",
      items,
      taxAmount: pr.taxAmount || 0,
      notes: pr.notes || `Converted from ${pr.requisitionNumber}`,
    });

    const poNumber = await nextDocumentNumber(PurchaseOrder, company_id, "PO");
    const lahorePo =
      Boolean(pr.lahoreFinalApproval) ||
      isLahorePr(pr) ||
      isLahorePlantScopedUser(req.user);
    const po = await PurchaseOrder.create({
      ...commercial,
      company_id,
      poNumber,
      supplier: primarySupplierId,
      suppliers: supplierIds,
      requisition: pr._id,
      status: "draft",
      documentDate: new Date(),
      createdBy: req.user?._id,
      ...(lahorePo ? { plantScope: "lahore" } : {}),
    });

    await persistSupplierBanking(normalizeSupplierIds(commercial), commercial.supplierBanking, req.user?._id);

    const populated = await PurchaseOrder.findById(po._id)
      .populate("supplier", "supplierCode name banking")
      .populate("suppliers", "supplierCode name banking")
      .populate("requisition", "requisitionNumber")
      .lean();

    const vendorNote =
      supplierIds.length > 1 ? ` with ${supplierIds.length} vendors` : "";
    return res.status(201).json({
      success: true,
      message: `Created draft PO ${po.poNumber} from ${pr.requisitionNumber}${vendorNote}`,
      data: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.softDelete = async (req, res) => {
  try {
    if (!canSoftDeleteProcurement(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete purchase requisitions",
      });
    }

    const company_id = getCompanyId(req);
    const data = await PurchaseRequisition.findOneAndUpdate(
      { _id: req.params.id, company_id, isActive: { $ne: false } },
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req.user?._id,
        status: "cancelled",
      },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Requisition not found" });
    try {
      const procurementNotificationService = require("../services/procurementNotificationService");
      await procurementNotificationService.deactivateForRequisition(company_id, data);
    } catch (notifyErr) {
      console.error("Failed to deactivate PR notifications after delete:", notifyErr.message);
    }
    return res.json({ success: true, message: "Requisition deleted", data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkSoftDelete = async (req, res) => {
  try {
    if (!canSoftDeleteProcurement(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete purchase requisitions",
      });
    }

    const company_id = getCompanyId(req);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "Select at least one requisition" });
    }

    const toDelete = await PurchaseRequisition.find({
      _id: { $in: ids },
      company_id,
      isActive: { $ne: false },
    })
      .select("_id requisitionNumber")
      .lean();

    const result = await PurchaseRequisition.updateMany(
      { _id: { $in: ids }, company_id, isActive: { $ne: false } },
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req.user?._id,
        status: "cancelled",
      }
    );

    try {
      const procurementNotificationService = require("../services/procurementNotificationService");
      for (const pr of toDelete) {
        await procurementNotificationService.deactivateForRequisition(company_id, pr);
      }
    } catch (notifyErr) {
      console.error("Failed to deactivate PR notifications after bulk delete:", notifyErr.message);
    }

    return res.json({
      success: true,
      message: `Deleted ${result.modifiedCount} requisition(s)`,
      deletedCount: result.modifiedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Used by UI helpers if needed later
exports._pendingApprovalsForUser = pendingApprovalsForUser;
