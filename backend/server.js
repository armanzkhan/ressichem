//backend/server.js
const express = require("express");
const os = require("os");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// ===== Import Routes =====
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const companyRoutes = require("./routes/companyRoutes");
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const roleRoutes = require("./routes/roleRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const permissionGroupRoutes = require("./routes/permissionGroupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const managerRoutes = require("./routes/managerRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const customerLedgerRoutes = require("./routes/customerLedgerRoutes");
const productImageRoutes = require("./routes/productImageRoutes");

// ===== QC Module Routes =====
const qcAuthRoutes = require("./routes/qcAuthRoutes");
const qcTestRoutes = require("./routes/qcTestRoutes");
const qcStandardCriteriaRoutes = require("./routes/qcStandardCriteriaRoutes");
const qcResultRoutes = require("./routes/qcResultRoutes");
const qcExportRoutes = require("./routes/qcExportRoutes");
const qcHubPlanRoutes = require("./routes/qcHubPlanRoutes");
const qcHubFormRoutes = require("./routes/qcHubFormRoutes");
const qcHubBatchRoutes = require("./routes/qcHubBatchRoutes");
const qcHubAnalyticsRoutes = require("./routes/qcHubAnalyticsRoutes");
const qcHubReportingRoutes = require("./routes/qcHubReportingRoutes");
const ncrRoutes = require("./routes/ncrRoutes");
const calibrationRoutes = require("./routes/calibrationRoutes");
const internalAuditRoutes = require("./routes/internalAuditRoutes");
const qcUserRoutes = require("./routes/qcUserRoutes");
const qcReportingRoutes = require("./routes/qcReportingRoutes");
const aiAssistantRoutes = require("./routes/aiAssistantRoutes");
const publicAssistantRoutes = require("./routes/publicAssistantRoutes");
const procurementAssistantRoutes = require("./routes/procurementAssistantRoutes");

// ===== QC Hub SRS-Compliant Routes =====
const rawMaterialRoutes = require("./routes/rawMaterialRoutes");
const formulationRoutes = require("./routes/formulationRoutes");
const rdExperimentRoutes = require("./routes/rdExperimentRoutes");
const electronicSignatureRoutes = require("./routes/electronicSignatureRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const capaRoutes = require("./routes/capaRoutes");
const mrmRoutes = require("./routes/mrmRoutes");

// ===== QC Site Area SRS-Compliant Routes =====
const resinQCRoutes = require("./routes/resinQCRoutes");
const hardenerQCRoutes = require("./routes/hardenerQCRoutes");
const lmsQCRoutes = require("./routes/lmsQCRoutes");
const packagingMaterialQCRoutes = require("./routes/packagingMaterialQCRoutes");
const qaBottleFillingRoutes = require("./routes/qaBottleFillingRoutes");
const rdTrialBatchRoutes = require("./routes/rdTrialBatchRoutes");
const predictiveAnalyticsRoutes = require("./routes/predictiveAnalyticsRoutes");
const powerBIExportRoutes = require("./routes/powerBIExportRoutes");
const qcDocumentIndexRoutes = require("./routes/qcDocumentIndexRoutes");

// ===== Procurement Module Routes =====
const procurementAuthRoutes = require("./routes/procurementAuthRoutes");
const procurementUserRoutes = require("./routes/procurementUserRoutes");
const procurementDashboardRoutes = require("./routes/procurementDashboardRoutes");
const procurementSupplierRoutes = require("./routes/procurementSupplierRoutes");
const procurementItemRoutes = require("./routes/procurementItemRoutes");
const procurementPriceRoutes = require("./routes/procurementPriceRoutes");
const procurementRequisitionRoutes = require("./routes/procurementRequisitionRoutes");
const procurementPORoutes = require("./routes/procurementPORoutes");
const procurementPFIRoutes = require("./routes/procurementPFIRoutes");
const procurementExportRecordRoutes = require("./routes/procurementExportRecordRoutes");
const procurementExchangeRateRoutes = require("./routes/procurementExchangeRateRoutes");
const procurementImportRoutes = require("./routes/procurementImportRoutes");
const procurementCostingRoutes = require("./routes/procurementCostingRoutes");
const procurementNotificationRoutes = require("./routes/procurementNotificationRoutes");

// ===== App Setup =====
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// JSON APIs must not be cached — Express ETag otherwise returns 304 with an empty body.
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// ===== Static uploads (profile images etc.) =====
const uploadsRoot = path.join(__dirname, "uploads");
const avatarsDir = path.join(uploadsRoot, "avatars");
const qcRootDir = path.join(uploadsRoot, "qc");
const qcResultsDir = path.join(qcRootDir, "results");
const qcHubDir = path.join(qcRootDir, "hub");
const qcHubFormsDir = path.join(qcHubDir, "forms");
try {
  if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot);
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir);
  if (!fs.existsSync(qcRootDir)) fs.mkdirSync(qcRootDir);
  if (!fs.existsSync(qcResultsDir)) fs.mkdirSync(qcResultsDir);
  if (!fs.existsSync(qcHubDir)) fs.mkdirSync(qcHubDir);
  if (!fs.existsSync(qcHubFormsDir)) fs.mkdirSync(qcHubFormsDir);
} catch {}
app.use("/uploads", express.static(uploadsRoot));

// ===== MongoDB Connection =====
const defaultUri = "mongodb+srv://armanzaman4_db_user:1JJORz7jP2VFgTaP@cluster0.qn1babq.mongodb.net/Ressichem?retryWrites=true&w=majority";
const envUri = process.env.CONNECTION_STRING ? process.env.CONNECTION_STRING.trim() : "";
const mongoUri = envUri && envUri.length > 0 ? envUri : defaultUri;

// Debug: Log connection string (without password for security)
console.log("🔍 MongoDB URI:", mongoUri.replace(/:[^:@]+@/, ":****@"));
console.log("🔍 Using environment variable:", !!process.env.CONNECTION_STRING);

const mongoOptions = {
  dbName: "Ressichem",
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
};

async function verifyCollections() {
  console.log("✅ MongoDB connection is open — verifying collections...");
  const collections = await mongoose.connection.db.listCollections().toArray();
  const existing = collections.map((c) => c.name);

  const requiredCollections = [
    "users",
    "companies",
    "customers",
    "orders",
    "products",
    "roles",
    "permissions",
    "permissiongroups",
    "notifications",
    "invoices",
    "customerledgers",
    "ledgertransactions",
    "advertisements",
  ];

  for (const name of requiredCollections) {
    if (!existing.includes(name)) {
      await mongoose.connection.db.createCollection(name);
      console.log(`🆕 Created missing collection: ${name}`);
    }
  }

  console.log("✅ All required collections verified/created successfully.");
}

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    success: false,
    message: "Database is not connected. Please wait a moment and try again.",
  });
}

// ===== Health Check =====
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  })
);
app.get("/api/health/test", (req, res) =>
  res.json({ status: "ok", route: "/api/health/test", time: new Date().toISOString() })
);

// Block data APIs until MongoDB is ready (avoids 10s buffering timeouts).
app.use("/api", requireDatabase);

// ===== API Routes =====
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/permission-groups", permissionGroupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/managers", managerRoutes);
app.use("/api/product-categories", categoryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customer-ledger", customerLedgerRoutes);
app.use("/api/product-images", productImageRoutes);

// ===== QC Module =====
app.use("/api/qc/auth", qcAuthRoutes);
app.use("/api/qc/tests", qcTestRoutes);
app.use("/api/qc/standards", qcStandardCriteriaRoutes);
app.use("/api/qc/results", qcResultRoutes);
app.use("/api/qc/exports", qcExportRoutes);
app.use("/api/qc/hub/plan", qcHubPlanRoutes);
app.use("/api/qc/hub/forms", qcHubFormRoutes);
app.use("/api/qc/hub/batch-records", qcHubBatchRoutes);
app.use("/api/qc/hub/analytics", qcHubAnalyticsRoutes);
app.use("/api/qc/hub/reporting", qcHubReportingRoutes);
app.use("/api/qc/hub/ncr", ncrRoutes);
app.use("/api/qc/hub/calibration", calibrationRoutes);
app.use("/api/qc/hub/audits", internalAuditRoutes);
app.use("/api/qc/hub/document-index", require("./routes/qcDocumentIndexRoutes"));
app.use("/api/qc/users", qcUserRoutes);
app.use("/api/qc/reporting", qcReportingRoutes);
app.use("/api/qc/ai", aiAssistantRoutes);
app.use("/api/ai/public", publicAssistantRoutes);

// ===== QC Hub SRS-Compliant Routes =====
app.use("/api/qc/raw-materials", rawMaterialRoutes);
app.use("/api/qc/formulations", formulationRoutes);
app.use("/api/qc/rnd/experiments", rdExperimentRoutes);
app.use("/api/qc/signatures", electronicSignatureRoutes);
app.use("/api/qc/complaints", complaintRoutes);
app.use("/api/qc/capa", capaRoutes);
app.use("/api/qc/mrm", mrmRoutes);

// ===== QC Site Area SRS-Compliant Routes =====
app.use("/api/qc/site/resin", resinQCRoutes);
app.use("/api/qc/site/hardener", hardenerQCRoutes);
app.use("/api/qc/site/lms", lmsQCRoutes);
app.use("/api/qc/site/packaging-material", packagingMaterialQCRoutes);
app.use("/api/qc/site/qa-bottle-filling", qaBottleFillingRoutes);
app.use("/api/qc/site/rnd-trials", rdTrialBatchRoutes);
app.use("/api/qc/site/predictive-analytics", predictiveAnalyticsRoutes);
app.use("/api/qc/site/powerbi-export", powerBIExportRoutes);
app.use("/api/qc/site/document-index", qcDocumentIndexRoutes);

// ===== Procurement Module =====
app.use("/api/procurement/auth", procurementAuthRoutes);
app.use("/api/procurement/users", procurementUserRoutes);
app.use("/api/procurement/department-approvers", require("./routes/procurementDepartmentApproverRoutes"));
app.use("/api/procurement/dashboard", procurementDashboardRoutes);
app.use("/api/procurement/suppliers", procurementSupplierRoutes);
app.use("/api/procurement/vendors", procurementSupplierRoutes);
app.use("/api/procurement/items", procurementItemRoutes);
app.use("/api/procurement/prices", procurementPriceRoutes);
app.use("/api/procurement/requisitions", procurementRequisitionRoutes);
app.use("/api/procurement/purchase-orders", procurementPORoutes);
app.use("/api/procurement/pfi", procurementPFIRoutes);
app.use("/api/procurement/grn", require("./routes/procurementGrnRoutes"));
app.use("/api/procurement/supplier-invoices", require("./routes/procurementSupplierInvoiceRoutes"));
app.use("/api/procurement/payments", require("./routes/procurementPaymentRoutes"));
app.use("/api/procurement/export-records", procurementExportRecordRoutes);
app.use("/api/procurement/exchange-rate", procurementExchangeRateRoutes);
app.use("/api/procurement/import", procurementImportRoutes);
app.use("/api/procurement/costing", procurementCostingRoutes);
app.use("/api/procurement/notifications", procurementNotificationRoutes);
app.use("/api/procurement/ai", procurementAssistantRoutes);

// ===== WebSocket Setup =====
const http = require("http");
const realtimeService = require("./services/realtimeService");
const backupService = require("./services/backupService");
const qcHubExportScheduler = require("./services/qcHubExportScheduler");

// Resolve LAN IPv4 for nicer logging
function getLanIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch {}
  return null;
}

async function startServer() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(mongoUri, mongoOptions);
    console.log("✅ MongoDB connected to 'Ressichem' database");
    await verifyCollections();
    startHttpServer();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("❌ Server will not accept API requests until MongoDB is available.");
    console.error("❌ Check CONNECTION_STRING / network access to Atlas, then restart the backend.");
    process.exit(1);
  }
}

function startHttpServer() {
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || "0.0.0.0";
  const server = http.createServer(app);
  realtimeService.initialize(server);

  server.listen(PORT, HOST, () => {
    const lanIp = getLanIp();
    const lines = [
      `🚀 Server running:`,
      `   • Local:    http://localhost:${PORT}`,
    ];
    if (lanIp) lines.push(`   • Network:  http://${lanIp}:${PORT}`);
    console.log(lines.join("\n"));

    const mongoUriForBackup = backupService.buildMongoUri(mongoUri);
    backupService.restoreOnStartup({ mongoUri: mongoUriForBackup });
    backupService.initializeBackupService({ mongoUri: mongoUriForBackup });
    qcHubExportScheduler.initializeQcHubExportScheduler();
  });
}

startServer();
