// Main catch-all serverless function for all API routes
// This consolidates all routes into a single function to stay within Vercel's free tier limit

const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('./_utils/db');

// Create Express app (outside handler for better performance)
let app;

// Initialize Express app
function initializeApp() {
  if (app) return app; // Return cached app if already initialized

  app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // Health check (handled directly in serverless function, but keep for compatibility)
  app.get('/api/health/test', (req, res) =>
    res.json({ status: 'ok', route: '/api/health/test', time: new Date().toISOString() })
  );

  // Import and mount all routes
  try {
    const authRoutes = require('../routes/authRoutes');
    const userRoutes = require('../routes/userRoutes');
    const companyRoutes = require('../routes/companyRoutes');
    const customerRoutes = require('../routes/customerRoutes');
    const orderRoutes = require('../routes/orderRoutes');
    const productRoutes = require('../routes/productRoutes');
    const roleRoutes = require('../routes/roleRoutes');
    const permissionRoutes = require('../routes/permissionRoutes');
    const permissionGroupRoutes = require('../routes/permissionGroupRoutes');
    const notificationRoutes = require('../routes/notificationRoutes');
    const managerRoutes = require('../routes/managerRoutes');
    const categoryRoutes = require('../routes/categoryRoutes');
    const invoiceRoutes = require('../routes/invoiceRoutes');
    const customerLedgerRoutes = require('../routes/customerLedgerRoutes');
    const productImageRoutes = require('../routes/productImageRoutes');

    // QC Module routes
    const qcAuthRoutes = require('../routes/qcAuthRoutes');
    const qcTestRoutes = require('../routes/qcTestRoutes');
    const qcStandardCriteriaRoutes = require('../routes/qcStandardCriteriaRoutes');
    const qcResultRoutes = require('../routes/qcResultRoutes');
    const qcExportRoutes = require('../routes/qcExportRoutes');
    const qcHubPlanRoutes = require('../routes/qcHubPlanRoutes');
    const qcHubFormRoutes = require('../routes/qcHubFormRoutes');
    const qcHubBatchRoutes = require('../routes/qcHubBatchRoutes');
    const qcHubAnalyticsRoutes = require('../routes/qcHubAnalyticsRoutes');
    const qcHubReportingRoutes = require('../routes/qcHubReportingRoutes');
    const ncrRoutes = require('../routes/ncrRoutes');
    const calibrationRoutes = require('../routes/calibrationRoutes');
    const internalAuditRoutes = require('../routes/internalAuditRoutes');
    const qcUserRoutes = require('../routes/qcUserRoutes');
    const qcReportingRoutes = require('../routes/qcReportingRoutes');
    const aiAssistantRoutes = require('../routes/aiAssistantRoutes');
    const publicAssistantRoutes = require('../routes/publicAssistantRoutes');
    const procurementAssistantRoutes = require('../routes/procurementAssistantRoutes');

    // QC Hub SRS-Compliant Routes
    const rawMaterialRoutes = require('../routes/rawMaterialRoutes');
    const formulationRoutes = require('../routes/formulationRoutes');
    const rdExperimentRoutes = require('../routes/rdExperimentRoutes');
    const electronicSignatureRoutes = require('../routes/electronicSignatureRoutes');
    const complaintRoutes = require('../routes/complaintRoutes');
    const capaRoutes = require('../routes/capaRoutes');
    const mrmRoutes = require('../routes/mrmRoutes');

    // QC Site Area routes
    const resinQCRoutes = require('../routes/resinQCRoutes');
    const hardenerQCRoutes = require('../routes/hardenerQCRoutes');
    const lmsQCRoutes = require('../routes/lmsQCRoutes');
    const packagingMaterialQCRoutes = require('../routes/packagingMaterialQCRoutes');
    const qaBottleFillingRoutes = require('../routes/qaBottleFillingRoutes');
    const rdTrialBatchRoutes = require('../routes/rdTrialBatchRoutes');
    const predictiveAnalyticsRoutes = require('../routes/predictiveAnalyticsRoutes');
    const powerBIExportRoutes = require('../routes/powerBIExportRoutes');
    const qcDocumentIndexRoutes = require('../routes/qcDocumentIndexRoutes');

    const procurementAuthRoutes = require('../routes/procurementAuthRoutes');
    const procurementUserRoutes = require('../routes/procurementUserRoutes');
    const procurementDashboardRoutes = require('../routes/procurementDashboardRoutes');
    const procurementSupplierRoutes = require('../routes/procurementSupplierRoutes');
    const procurementItemRoutes = require('../routes/procurementItemRoutes');
    const procurementPriceRoutes = require('../routes/procurementPriceRoutes');
    const procurementRequisitionRoutes = require('../routes/procurementRequisitionRoutes');
    const procurementPORoutes = require('../routes/procurementPORoutes');
    const procurementPFIRoutes = require('../routes/procurementPFIRoutes');
    const procurementExportRecordRoutes = require('../routes/procurementExportRecordRoutes');
    const procurementExchangeRateRoutes = require('../routes/procurementExchangeRateRoutes');
    const procurementImportRoutes = require('../routes/procurementImportRoutes');
    const procurementCostingRoutes = require('../routes/procurementCostingRoutes');
    const procurementNotificationRoutes = require('../routes/procurementNotificationRoutes');

    // Mount all routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/companies', companyRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/roles', roleRoutes);
    app.use('/api/permissions', permissionRoutes);
    app.use('/api/permission-groups', permissionGroupRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/chat', require('../routes/chatRoutes'));
    app.use('/api/managers', managerRoutes);
    app.use('/api/product-categories', categoryRoutes);
    app.use('/api/invoices', invoiceRoutes);
    app.use('/api/customer-ledger', customerLedgerRoutes);
    app.use('/api/product-images', productImageRoutes);

    // QC Module
    app.use('/api/qc/auth', qcAuthRoutes);
    app.use('/api/qc/tests', qcTestRoutes);
    app.use('/api/qc/standards', qcStandardCriteriaRoutes);
    app.use('/api/qc/results', qcResultRoutes);
    app.use('/api/qc/exports', qcExportRoutes);
    app.use('/api/qc/hub/plan', qcHubPlanRoutes);
    app.use('/api/qc/hub/forms', qcHubFormRoutes);
    app.use('/api/qc/hub/batch-records', qcHubBatchRoutes);
    app.use('/api/qc/hub/analytics', qcHubAnalyticsRoutes);
    app.use('/api/qc/hub/reporting', qcHubReportingRoutes);
    app.use('/api/qc/hub/ncr', ncrRoutes);
    app.use('/api/qc/hub/calibration', calibrationRoutes);
    app.use('/api/qc/hub/audits', internalAuditRoutes);
    app.use('/api/qc/hub/document-index', qcDocumentIndexRoutes);
    app.use('/api/qc/users', qcUserRoutes);
    app.use('/api/qc/reporting', qcReportingRoutes);
    app.use('/api/qc/ai', aiAssistantRoutes);
    app.use('/api/ai/public', publicAssistantRoutes);

    // QC Hub SRS-Compliant Routes
    app.use('/api/qc/raw-materials', rawMaterialRoutes);
    app.use('/api/qc/formulations', formulationRoutes);
    app.use('/api/qc/rnd/experiments', rdExperimentRoutes);
    app.use('/api/qc/signatures', electronicSignatureRoutes);
    app.use('/api/qc/complaints', complaintRoutes);
    app.use('/api/qc/capa', capaRoutes);
    app.use('/api/qc/mrm', mrmRoutes);

    // QC Site Area SRS-Compliant Routes
    app.use('/api/qc/site/resin', resinQCRoutes);
    app.use('/api/qc/site/hardener', hardenerQCRoutes);
    app.use('/api/qc/site/lms', lmsQCRoutes);
    app.use('/api/qc/site/packaging-material', packagingMaterialQCRoutes);
    app.use('/api/qc/site/qa-bottle-filling', qaBottleFillingRoutes);
    app.use('/api/qc/site/rnd-trials', rdTrialBatchRoutes);
    app.use('/api/qc/site/predictive-analytics', predictiveAnalyticsRoutes);
    app.use('/api/qc/site/powerbi-export', powerBIExportRoutes);
    app.use('/api/qc/site/document-index', qcDocumentIndexRoutes);

    app.use('/api/procurement/auth', procurementAuthRoutes);
    app.use('/api/procurement/users', procurementUserRoutes);
    app.use('/api/procurement/department-approvers', require('../routes/procurementDepartmentApproverRoutes'));
    app.use('/api/procurement/dashboard', procurementDashboardRoutes);
    app.use('/api/procurement/suppliers', procurementSupplierRoutes);
    app.use('/api/procurement/vendors', procurementSupplierRoutes);
    app.use('/api/procurement/items', procurementItemRoutes);
    app.use('/api/procurement/prices', procurementPriceRoutes);
    app.use('/api/procurement/requisitions', procurementRequisitionRoutes);
    app.use('/api/procurement/purchase-orders', procurementPORoutes);
    app.use('/api/procurement/pfi', procurementPFIRoutes);
    app.use('/api/procurement/grn', require('../routes/procurementGrnRoutes'));
    app.use('/api/procurement/supplier-invoices', require('../routes/procurementSupplierInvoiceRoutes'));
    app.use('/api/procurement/payments', require('../routes/procurementPaymentRoutes'));
    app.use('/api/procurement/export-records', procurementExportRecordRoutes);
    app.use('/api/procurement/exchange-rate', procurementExchangeRateRoutes);
    app.use('/api/procurement/import', procurementImportRoutes);
    app.use('/api/procurement/costing', procurementCostingRoutes);
    app.use('/api/procurement/notifications', procurementNotificationRoutes);
    app.use('/api/procurement/ai', procurementAssistantRoutes);
  } catch (error) {
    console.error('Error loading routes:', error);
    throw error;
  }

  // Handle 404 for unmatched routes
  app.use((req, res) => {
    if (!res.headersSent) {
      res.status(404).json({ error: 'Route not found', path: req.url });
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Express error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  return app;
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  try {
    console.log('🔍 Serverless function invoked:', req.method, req.url);
    
    // Handle health check without database connection (fast path)
    const urlPath = req.url.split('?')[0]; // Remove query string
    if (urlPath === '/api/health' || urlPath === '/api/health/') {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
      res.end();
      return Promise.resolve();
    }
    
    // Initialize Express app
    const expressApp = initializeApp();
    
    // Connect to database (with shorter timeout for faster failure)
    console.log('🔍 Connecting to database...');
    let dbConnected = false;
    try {
      await Promise.race([
        connectToDatabase(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 3000)
        )
      ]);
      dbConnected = true;
      console.log('✅ Database connected');
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError.message);
      // For health checks, continue without database
      if (urlPath.startsWith('/api/health')) {
        res.status(200).json({ 
          status: 'ok', 
          database: 'disconnected',
          timestamp: new Date().toISOString() 
        });
        return;
      }
      // For other routes, return error
      if (!res.headersSent) {
        res.status(503).json({ 
          error: 'Database connection failed',
          message: dbError.message 
        });
        return;
      }
    }

    // Handle the request with Express app
    // Wrap in promise to ensure proper async handling
    return new Promise((resolve) => {
      let finished = false;
      
      // Set timeout (7 seconds to leave buffer)
      const timeout = setTimeout(() => {
        if (!finished && !res.headersSent) {
          finished = true;
          console.error('❌ Request timeout after 7s');
          res.status(504).json({ error: 'Request timeout' });
          resolve();
        }
      }, 7000);

      // Track when response is sent
      const finish = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve();
        }
      };

      // Override res methods to detect completion
      const originalEnd = res.end.bind(res);
      res.end = function(...args) {
        finish();
        return originalEnd.apply(this, args);
      };

      const originalJson = res.json.bind(res);
      res.json = function(data) {
        finish();
        return originalJson.call(this, data);
      };

      const originalSend = res.send.bind(res);
      res.send = function(data) {
        finish();
        return originalSend.call(this, data);
      };

      // Handle the request with Express
      try {
        expressApp(req, res, (err) => {
          if (err) {
            console.error('❌ Express handler error:', err);
            if (!finished && !res.headersSent) {
              finish();
              res.status(500).json({ error: err.message || 'Internal server error' });
            }
          }
          // If no error and response not sent, Express should handle it
          // But ensure we resolve after a short delay if nothing happened
          if (!finished) {
            setTimeout(() => {
              if (!finished && !res.headersSent) {
                finish();
                res.status(500).json({ error: 'No response from Express' });
              }
            }, 100);
          }
        });
      } catch (err) {
        console.error('❌ Error calling Express app:', err);
        if (!finished && !res.headersSent) {
          finish();
          res.status(500).json({ error: err.message || 'Internal server error' });
        }
      }
    });
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    console.error('❌ Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};

