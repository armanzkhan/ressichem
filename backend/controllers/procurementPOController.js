const PurchaseOrder = require("../models/PurchaseOrder");
const { getCompanyId, nextDocumentNumber } = require("../utils/procurementHelpers");
const {
  prepareCommercialPayload,
  renderPOHtml,
  enrichDocForPrint,
  persistSupplierBanking,
  normalizeSupplierIds,
} = require("../services/procurementDocumentService");
const {
  canSoftDeleteProcurement,
  canCreatePurchaseOrders,
  canCreateRequisitions,
  isProcurementAdminUser,
  isLahorePlantScopedUser,
  isLahorePr,
  ensureUserDepartment,
  applyPurchaseOrderVisibility,
} = require("../utils/procurementPrRouting");
const PurchaseRequisition = require("../models/PurchaseRequisition");
const procurementPrNotificationService = require("../services/procurementPrNotificationService");

const supplierPopulate =
  "supplierCode name defaultCurrency paymentTerms street city address country mobile phone phoneDialCode taxId banking";

function canDeletePurchaseOrder(user) {
  return canSoftDeleteProcurement(user);
}

async function loadLinkedPr(po) {
  const prId = po?.requisition;
  if (!prId) return null;
  return PurchaseRequisition.findById(prId)
    .populate("requestedBy", "firstName lastName email user_id")
    .populate("submittedBy", "firstName lastName email user_id")
    .lean();
}

async function assertLahoreBuyerCanAccessPo(user, po, company_id) {
  if (!isLahorePlantScopedUser(user) || isProcurementAdminUser(user)) return true;
  if (String(po?.plantScope || "").toLowerCase() === "lahore") return true;
  const prId = po?.requisition?._id || po?.requisition;
  if (!prId) return false;
  const pr = await PurchaseRequisition.findOne({ _id: prId, company_id }).lean();
  return Boolean(pr && (pr.lahoreFinalApproval || isLahorePr(pr)));
}

exports.list = async (req, res) => {
  try {
    await ensureUserDepartment(req.user);
    const company_id = getCompanyId(req);
    const { status, purchaseType } = req.query;
    const query = { company_id, isActive: { $ne: false } };
    if (status) query.status = status;
    if (purchaseType) query.purchaseType = purchaseType;

    await applyPurchaseOrderVisibility(query, req.user);

    const data = await PurchaseOrder.find(query)
      .populate("supplier", supplierPopulate)
      .populate("suppliers", supplierPopulate)
      .populate("pfi", "pfiNumber")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    await ensureUserDepartment(req.user);
    const company_id = getCompanyId(req);
    const data = await PurchaseOrder.findOne({ _id: req.params.id, company_id, isActive: { $ne: false } })
      .populate("supplier", supplierPopulate)
      .populate("suppliers", supplierPopulate)
      .populate("requisition", "requisitionNumber")
      .populate("pfi", "pfiNumber")
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "Purchase order not found" });
    if (!(await assertLahoreBuyerCanAccessPo(req.user, data, company_id))) {
      return res.status(403).json({ success: false, message: "This purchase order is outside your Lahore plant scope" });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.print = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await PurchaseOrder.findOne({ _id: req.params.id, company_id })
      .populate("supplier", supplierPopulate)
      .populate("suppliers", supplierPopulate)
      .lean();
    if (!data) return res.status(404).send("Purchase order not found");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderPOHtml(enrichDocForPrint(data)));
  } catch (err) {
    return res.status(500).send(err.message);
  }
};

exports.create = async (req, res) => {
  try {
    await ensureUserDepartment(req.user);
    const company_id = getCompanyId(req);
    const body = await prepareCommercialPayload(req.body || {});
    await persistSupplierBanking(normalizeSupplierIds(body), body.supplierBanking, req.user?._id);

    // Lahore buyers may only create Lahore plant POs
    let plantScope = String(body.plantScope || "").trim().toLowerCase();
    if (isLahorePlantScopedUser(req.user) && !isProcurementAdminUser(req.user)) {
      plantScope = "lahore";
      if (body.requisition) {
        const pr = await PurchaseRequisition.findOne({ _id: body.requisition, company_id }).lean();
        if (!pr || (!pr.lahoreFinalApproval && !isLahorePr(pr))) {
          return res.status(403).json({
            success: false,
            message: "Lahore buyers can only create purchase orders for Lahore requisitions",
          });
        }
      }
    }

    if (Array.isArray(body.items) && body.items.some((line) => !(Number(line.unitPrice) > 0))) {
      return res.status(400).json({
        success: false,
        message: "Enter a unit price greater than 0 on every line item",
      });
    }

    const poNumber = await nextDocumentNumber(PurchaseOrder, company_id, "PO");
    const data = await PurchaseOrder.create({
      ...body,
      company_id,
      poNumber,
      status: body.status || "draft",
      createdBy: req.user?._id,
      ...(plantScope ? { plantScope } : {}),
    });
    const populated = await PurchaseOrder.findById(data._id)
      .populate("supplier", supplierPopulate)
      .populate("suppliers", supplierPopulate)
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    await ensureUserDepartment(req.user);
    const company_id = getCompanyId(req);
    const existing = await PurchaseOrder.findOne({ _id: req.params.id, company_id, isActive: { $ne: false } }).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Purchase order not found" });
    if (!(await assertLahoreBuyerCanAccessPo(req.user, existing, company_id))) {
      return res.status(403).json({ success: false, message: "This purchase order is outside your Lahore plant scope" });
    }
    const body = await prepareCommercialPayload(req.body || {});
    await persistSupplierBanking(normalizeSupplierIds(body), body.supplierBanking, req.user?._id);
    if (isLahorePlantScopedUser(req.user) && !isProcurementAdminUser(req.user)) {
      body.plantScope = "lahore";
    }
    // Never overwrite identity / audit fields from client payload
    delete body._id;
    delete body.poNumber;
    delete body.company_id;
    delete body.createdBy;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.__v;

    if (Array.isArray(body.items) && Array.isArray(existing.items)) {
      const previousById = new Map(
        existing.items.filter((line) => line && line._id).map((line) => [String(line._id), line])
      );
      body.items = body.items.map((line) => {
        if (Number.isInteger(line?.prLineIndex)) return line;
        const previous = line?._id ? previousById.get(String(line._id)) : null;
        if (previous && Number.isInteger(previous.prLineIndex)) {
          return { ...line, prLineIndex: previous.prLineIndex };
        }
        return line;
      });
    }

    if (Array.isArray(body.items) && body.items.some((line) => !(Number(line.unitPrice) > 0))) {
      return res.status(400).json({
        success: false,
        message: "Enter a unit price greater than 0 on every line item",
      });
    }

    const data = await PurchaseOrder.findOneAndUpdate({ _id: req.params.id, company_id }, body, { new: true })
      .populate("supplier", supplierPopulate)
      .populate("suppliers", supplierPopulate)
      .lean();
    if (!data) return res.status(404).json({ success: false, message: "Purchase order not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.issue = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseOrder.findOne({
      _id: req.params.id,
      company_id,
      status: "draft",
      isActive: { $ne: false },
    }).lean();
    if (!existing) return res.status(400).json({ success: false, message: "PO not found or not in draft" });
    if ((existing.items || []).some((line) => !(Number(line.unitPrice) > 0)) || !(Number(existing.total) > 0)) {
      return res.status(400).json({
        success: false,
        message: "Add unit prices on every line and save before issuing this PO",
      });
    }
    const data = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, company_id, status: "draft" },
      { status: "issued", approvedBy: req.user?._id, approvedAt: new Date() },
      { new: true }
    );
    if (!data) return res.status(400).json({ success: false, message: "PO not found or not in draft" });

    // Additive: notify PR requester — does not change PO/PR workflow
    try {
      const pr = await loadLinkedPr(data);
      if (pr) void procurementPrNotificationService.notifyPrPurchased(pr, req.user, data);
    } catch (notifyErr) {
      console.error("PO issue purchase notify failed:", notifyErr.message);
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Receive goods against an issued/partial PO.
 * Body: { receiptDate?, notes?, items: [{ poLineId, receivedQuantity, remarks? }] }
 */
exports.receive = async (req, res) => {
  try {
    const GoodsReceiptNote = require("../models/GoodsReceiptNote");
    const company_id = getCompanyId(req);
    const po = await PurchaseOrder.findOne({ _id: req.params.id, company_id });
    if (!po) return res.status(404).json({ success: false, message: "Purchase order not found" });
    if (!["issued", "partial"].includes(po.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot receive against a PO in status: ${po.status}. Issue the PO first.`,
      });
    }

    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!incoming.length) {
      return res.status(400).json({ success: false, message: "Provide at least one line to receive" });
    }

    const grnItems = [];
    for (const row of incoming) {
      const qty = Number(row.receivedQuantity) || 0;
      if (qty <= 0) continue;
      const line = po.items.id(row.poLineId) || po.items.find((l) => String(l._id) === String(row.poLineId));
      if (!line) {
        return res.status(400).json({ success: false, message: `PO line not found: ${row.poLineId}` });
      }
      const already = Number(line.receivedQuantity) || 0;
      const ordered = Number(line.quantity) || 0;
      if (already + qty > ordered + 1e-9) {
        return res.status(400).json({
          success: false,
          message: `Receive qty for ${line.itemName || line.itemCode || "line"} exceeds remaining (${ordered - already})`,
        });
      }
      line.receivedQuantity = Math.round((already + qty) * 1000) / 1000;
      grnItems.push({
        poLineId: line._id,
        item: line.item,
        itemCode: line.itemCode || "",
        itemName: line.itemName || "",
        unit: line.unit || "EA",
        orderedQuantity: ordered,
        receivedQuantity: qty,
        unitPrice: Number(line.unitPrice) || 0,
        lineTotal: Math.round(qty * (Number(line.unitPrice) || 0) * 100) / 100,
        remarks: row.remarks || "",
      });
    }

    if (!grnItems.length) {
      return res.status(400).json({ success: false, message: "No positive receive quantities provided" });
    }

    const allOrdered = po.items.every((l) => (Number(l.receivedQuantity) || 0) >= (Number(l.quantity) || 0) - 1e-9);
    const anyReceived = po.items.some((l) => (Number(l.receivedQuantity) || 0) > 0);
    po.status = allOrdered ? "received" : anyReceived ? "partial" : po.status;
    await po.save();

    const grnNumber = await nextDocumentNumber(GoodsReceiptNote, company_id, "GRN");
    const grn = await GoodsReceiptNote.create({
      company_id,
      grnNumber,
      purchaseOrder: po._id,
      supplier: po.supplier,
      purchaseType: po.purchaseType || "foreign",
      receiptDate: req.body?.receiptDate ? new Date(req.body.receiptDate) : new Date(),
      status: "posted",
      items: grnItems,
      notes: req.body?.notes || "",
      receivedBy: req.user?._id,
      createdBy: req.user?._id,
    });

    const populatedGrn = await GoodsReceiptNote.findById(grn._id)
      .populate("purchaseOrder", "poNumber status")
      .populate("supplier", "supplierCode name")
      .lean();
    const populatedPo = await PurchaseOrder.findById(po._id)
      .populate("supplier", supplierPopulate)
      .lean();

    // Additive: notify PR requester of delivery progress
    try {
      const pr = await loadLinkedPr(po);
      if (pr) void procurementPrNotificationService.notifyPrDeliveryUpdate(pr, req.user, populatedPo || po);
    } catch (notifyErr) {
      console.error("PO receive delivery notify failed:", notifyErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Purchase receipt ${grn.grnNumber} posted. PO is now ${po.status}.`,
      data: { grn: populatedGrn, purchaseOrder: populatedPo },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.close = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const data = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, company_id, status: { $in: ["received", "partial", "issued"] } },
      { status: "closed" },
      { new: true }
    )
      .populate("supplier", supplierPopulate)
      .lean();
    if (!data) {
      return res.status(400).json({ success: false, message: "PO not found or cannot be closed from current status" });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** Cancel a draft/issued PO (keeps the record visible as cancelled so PR can open Create PO again). */
exports.cancel = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await PurchaseOrder.findOne({
      _id: req.params.id,
      company_id,
      isActive: { $ne: false },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }
    const status = String(existing.status || "").toLowerCase();
    if (!["draft", "issued"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a PO in status "${existing.status}". Only draft or issued POs can be cancelled (receive/close first if goods arrived).`,
      });
    }

    const data = await PurchaseOrder.findOneAndUpdate(
      { _id: existing._id, company_id, status: { $in: ["draft", "issued"] } },
      {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: req.user?._id,
        cancelReason: String(req.body?.reason || "").trim(),
        updatedBy: req.user?._id,
      },
      { new: true }
    )
      .populate("supplier", "supplierCode name")
      .populate("suppliers", "supplierCode name")
      .lean();

    if (!data) {
      return res.status(400).json({ success: false, message: "Purchase order could not be cancelled" });
    }
    return res.json({ success: true, data, message: "Purchase order cancelled" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!canDeletePurchaseOrder(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete purchase orders",
      });
    }

    const company_id = getCompanyId(req);
    const data = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, company_id, isActive: { $ne: false } },
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req.user?._id,
        status: "cancelled",
      },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Purchase order not found" });
    return res.json({ success: true, message: "Purchase order deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkRemove = async (req, res) => {
  try {
    if (!canDeletePurchaseOrder(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete purchase orders",
      });
    }

    const company_id = getCompanyId(req);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "Select at least one purchase order" });
    }

    const result = await PurchaseOrder.updateMany(
      { _id: { $in: ids }, company_id, isActive: { $ne: false } },
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req.user?._id,
        status: "cancelled",
      }
    );
    return res.json({
      success: true,
      message: `Deleted ${result.modifiedCount} purchase order(s)`,
      deletedCount: result.modifiedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
