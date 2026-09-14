const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

// CRUD routes
router.post("/", authMiddleware, permissionMiddleware(["orders.create"]), orderController.createOrder);
router.get("/", authMiddleware, permissionMiddleware(["orders.read"]), orderController.getOrders);
router.get("/:id", authMiddleware, permissionMiddleware(["orders.read"]), orderController.getOrderById);
router.put("/:id", authMiddleware, permissionMiddleware(["orders.update"]), orderController.updateOrder);
router.put("/:id/status", authMiddleware, orderController.updateOrderStatus);
router.delete("/:id", authMiddleware, permissionMiddleware(["orders.delete"]), orderController.deleteOrder);

// Approval workflow routes (OLD SYSTEM - kept for backward compatibility)
router.get("/pending/approvals", authMiddleware, orderController.getPendingApprovals);
router.post("/approve", authMiddleware, orderController.approveOrderCategory);
router.post("/reject", authMiddleware, orderController.rejectOrderCategory);

// NEW ITEM-LEVEL APPROVAL SYSTEM
router.get("/manager/pending-approvals", authMiddleware, orderController.getManagerPendingApprovals);
router.get("/manager/all-approvals", authMiddleware, orderController.getManagerAllApprovals);
router.post("/approve-item", authMiddleware, orderController.approveItem);
router.post("/update-discount", authMiddleware, permissionMiddleware(["orders.update"]), orderController.updateDiscount);

module.exports = router;
