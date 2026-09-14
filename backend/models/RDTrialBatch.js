const mongoose = require("mongoose");

/**
 * RDTrialBatch
 * SRS 3.3.1 - Product Development
 * Trial batch file (T0, T1, T2, ...) under separate folder of each product
 */
const RDTrialBatchSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Product Folder Structure (SRS 3.3.1)
    productFolder: {
      type: String,
      required: true,
      index: true,
      // e.g., "grout", "protective_paint", "wall_putty", "tile_adhesive", etc.
    },
    
    // Trial Batch Number (SRS 3.3.1)
    trialBatchNo: {
      type: String,
      required: true,
      // e.g., "T0", "T1", "T2", "T3", etc.
    },
    fullTrialCode: { type: String, required: true, index: true }, // e.g., "grout-T1", "wall_putty-T2"
    
    // Product Information
    productName: { type: String, required: true, index: true },
    productType: { type: String, default: "" },
    targetGrade: { type: String, default: "" },
    
    // Formulation Tracking (SRS 3.3.1)
    formulation: { type: mongoose.Schema.Types.ObjectId, ref: "Formulation" },
    formulationVersion: { type: Number, default: 1 },
    
    // Parameters (SRS 3.3.1)
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Store formulation parameters
    },
    
    // Results (SRS 3.3.1)
    testResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Store test results
    },
    
    // Trend Behavior (SRS 3.3.1)
    trendData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Store trend analysis data
    },
    
    // Charts and Graphs (SRS 3.3.1)
    chartData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Store chart/graph data for ease of understanding
    },
    
    // Comparison with Previous Trials
    comparisonWithPrevious: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Comparison data with T0, T1, etc.
    },
    
    // Cost Information (SRS 3.3.4)
    costPerUnit: { type: Number },
    costUnit: { type: String, default: "per ton" },
    costBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Detailed cost breakdown
    },
    
    // Performance-Cost Ratio (SRS 3.3.4)
    performanceCostRatio: { type: Number },
    
    // Raw Material Alternatives (SRS 3.3.3)
    alternativeRMs: [
      {
        originalRM: { type: String },
        alternativeRM: { type: String },
        supplier: { type: String },
        testResults: { type: mongoose.Schema.Types.Mixed, default: {} },
        performanceComparison: { type: String, default: "" },
        linkedTo: { type: mongoose.Schema.Types.ObjectId }, // Link to performance test results
      },
    ],
    
    // Trial Date
    trialDate: { type: Date, default: Date.now, index: true },
    
    // Status
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "on_hold", "cancelled"],
      default: "planned",
      index: true,
    },
    
    // Observations
    observations: { type: String, default: "" },
    conclusions: { type: String, default: "" },
    nextSteps: { type: String, default: "" },
    
    // Attachments
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" }],
    logSheet: { type: mongoose.Schema.Types.ObjectId, ref: "QCAttachment" },
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

RDTrialBatchSchema.index({ company_id: 1, productFolder: 1, trialBatchNo: 1 }, { unique: true });
RDTrialBatchSchema.index({ company_id: 1, productFolder: 1, trialDate: -1 });
RDTrialBatchSchema.index({ company_id: 1, fullTrialCode: 1 });

// Auto-generate fullTrialCode before validation (required field)
RDTrialBatchSchema.pre("validate", function (next) {
  if (!this.fullTrialCode && this.productFolder && this.trialBatchNo) {
    this.fullTrialCode = `${this.productFolder}-${this.trialBatchNo}`;
  }
  next();
});

module.exports = mongoose.model("RDTrialBatch", RDTrialBatchSchema);

