const QCDocumentIndex = require("../models/QCDocumentIndex");
const QCAttachment = require("../models/QCAttachment");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

// SRS 3.5 - Auto-indexing based on batch number, date, product name, grade
// This should be called automatically when documents are uploaded/created

// Auto-index a document
exports.indexDocument = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const {
      documentId,
      documentType,
      batchNumber,
      date,
      productName,
      grade,
      module,
      productType,
      operator,
      shift,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      tags,
      description,
    } = req.body || {};

    // Build search keywords
    const searchKeywords = [
      batchNumber,
      productName,
      grade,
      module,
      productType,
      operator,
      shift,
      fileName,
      ...(tags || []),
      description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const index = await QCDocumentIndex.create({
      company_id,
      documentId,
      documentType,
      batchNumber,
      date: date ? new Date(date) : new Date(),
      productName,
      grade,
      module,
      productType,
      operator,
      shift,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      tags: tags || [],
      description: description || "",
      searchKeywords,
      indexedBy: user?._id,
    });

    res.status(201).json({ success: true, data: index });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error indexing document", error: err.message });
  }
};

// Search documents (SRS 3.5)
exports.searchDocuments = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { batchNumber, productName, grade, date, module, tags, keyword, page = 1, limit = 20 } = req.query;

    const filter = { company_id, isActive: true };
    if (batchNumber) filter.batchNumber = String(batchNumber);
    if (productName) filter.productName = { $regex: String(productName), $options: "i" };
    if (grade) filter.grade = String(grade);
    if (module) filter.module = String(module);
    if (tags) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };

    if (date) {
      const dateObj = new Date(date);
      filter.date = {
        $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        $lte: new Date(dateObj.setHours(23, 59, 59, 999)),
      };
    }

    // Text search
    if (keyword) {
      filter.$text = { $search: String(keyword) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const rows = await QCDocumentIndex.find(filter)
      .sort(keyword ? { score: { $meta: "textScore" } } : { date: -1, indexedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("indexedBy", "firstName lastName email")
      .lean();

    const total = await QCDocumentIndex.countDocuments(filter);
    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error searching documents", error: err.message });
  }
};

// Get document by batch number (SRS 3.5)
exports.getByBatchNumber = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { batchNumber } = req.params;

    const documents = await QCDocumentIndex.find({ company_id, batchNumber, isActive: true })
      .sort({ date: -1 })
      .populate("indexedBy", "firstName lastName email")
      .lean();

    res.json({ success: true, data: documents });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching documents by batch number", error: err.message });
  }
};

// Get document by product name and grade (SRS 3.5)
exports.getByProduct = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { productName, grade } = req.params;

    const filter = { company_id, isActive: true };
    if (productName) filter.productName = { $regex: String(productName), $options: "i" };
    if (grade) filter.grade = String(grade);

    const documents = await QCDocumentIndex.find(filter)
      .sort({ date: -1 })
      .populate("indexedBy", "firstName lastName email")
      .lean();

    res.json({ success: true, data: documents });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching documents by product", error: err.message });
  }
};

