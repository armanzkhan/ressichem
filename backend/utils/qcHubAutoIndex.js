const QCDocumentIndex = require("../models/QCDocumentIndex");

/**
 * Auto-index uploaded QC Hub documents (SRS 3.5).
 */
async function autoIndexHubDocument({
  company_id,
  documentId,
  documentType,
  batchNumber,
  date,
  productName,
  grade,
  module,
  productType,
  fileName,
  fileType,
  fileSize,
  fileUrl,
  uploadedBy,
  description,
}) {
  const searchKeywords = [batchNumber, productName, grade, module, productType, fileName, description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const filter = { company_id, documentId: String(documentId) };
  const doc = {
    company_id,
    documentId: String(documentId),
    documentType: documentType || "ATTACHMENT",
    batchNumber: batchNumber || "",
    date: date ? new Date(date) : new Date(),
    productName: productName || "",
    grade: grade || "",
    module: module || "QC_HUB",
    productType: productType || "",
    fileName: fileName || "",
    fileType: fileType || "",
    fileSize: fileSize || 0,
    fileUrl: fileUrl || "",
    searchKeywords,
    description: description || "",
    indexedBy: uploadedBy || null,
    indexedAt: new Date(),
    isActive: true,
  };

  await QCDocumentIndex.findOneAndUpdate(filter, { $set: doc }, { upsert: true, new: true });
}

module.exports = { autoIndexHubDocument };
