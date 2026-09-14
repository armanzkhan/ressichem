const mongoose = require("mongoose");

/**
 * QCDocumentIndex
 * SRS 3.5 - Document Management
 * Auto-indexing based on batch number, date, product name, grade
 */
const QCDocumentIndexSchema = new mongoose.Schema(
  {
    company_id: { type: String, ref: "Company", required: true, index: true },
    
    // Document Information
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    documentType: {
      type: String,
      enum: [
        "RESIN_QC",
        "HARDENER_QC",
        "LMS_QC",
        "RAW_MATERIAL_QC",
        "PACKAGING_MATERIAL_QC",
        "QA_BOTTLE_FILLING",
        "RD_TRIAL",
        "QC_RESULT",
        "QC_HUB_BATCH",
        "QC_HUB_FORM",
        "ATTACHMENT",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    
    // Auto-Indexing Fields (SRS 3.5)
    batchNumber: { type: String, index: true },
    date: { type: Date, index: true },
    productName: { type: String, index: true },
    grade: { type: String, index: true },
    
    // Additional Indexing
    module: { type: String, index: true }, // e.g., "RESIN", "HARDENER"
    productType: { type: String, index: true },
    operator: { type: String, index: true },
    shift: { type: String, index: true },
    
    // File Information
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" }, // XLSX, PDF, Image
    fileSize: { type: Number, default: 0 },
    fileUrl: { type: String, default: "" },
    
    // Metadata
    tags: [{ type: String, index: true }],
    description: { type: String, default: "" },
    
    // Search Keywords (for full-text search)
    searchKeywords: { type: String, default: "" },
    
    // Audit
    indexedAt: { type: Date, default: Date.now },
    indexedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

QCDocumentIndexSchema.index({ company_id: 1, batchNumber: 1, date: -1 });
QCDocumentIndexSchema.index({ company_id: 1, productName: 1, grade: 1 });
QCDocumentIndexSchema.index({ company_id: 1, documentType: 1, date: -1 });
QCDocumentIndexSchema.index({ company_id: 1, tags: 1 });

// Text search index
QCDocumentIndexSchema.index({ company_id: 1, searchKeywords: "text" });

module.exports = mongoose.model("QCDocumentIndex", QCDocumentIndexSchema);

