const RawMaterial = require("../models/RawMaterial");
const RawMaterialBatch = require("../models/RawMaterialBatch");
const { upsertRawMaterialBatchToResults } = require("../utils/syncModuleToQCResult");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

async function syncRawBatchToResults(company_id, doc, user) {
  try {
    await upsertRawMaterialBatchToResults(company_id, doc, user);
  } catch (err) {
    console.error("RawMaterialBatch → QCResult sync failed:", err.message);
  }
}

// Get all raw materials
exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { category, search, isActive } = req.query;

    const query = { company_id };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { materialCode: { $regex: search, $options: "i" } },
        { materialName: { $regex: search, $options: "i" } },
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === "true";

    const materials = await RawMaterial.find(query).sort({ materialCode: 1 });
    return res.json({ success: true, data: materials });
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single raw material
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const material = await RawMaterial.findOne({ _id: req.params.id, company_id });
    if (!material) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }
    return res.json({ success: true, data: material });
  } catch (error) {
    console.error("Error fetching raw material:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create raw material
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};

    // Check for duplicate material code
    const existing = await RawMaterial.findOne({ company_id, materialCode: body.materialCode });
    if (existing) {
      return res.status(409).json({ success: false, message: "Material code already exists" });
    }

    const material = await RawMaterial.create({
      ...body,
      company_id,
      createdBy: req.user?._id,
    });

    return res.status(201).json({ success: true, data: material });
  } catch (error) {
    console.error("Error creating raw material:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update raw material
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const material = await RawMaterial.findOne({ _id: req.params.id, company_id });
    if (!material) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }

    Object.assign(material, req.body);
    material.updatedBy = req.user?._id;
    await material.save();

    return res.json({ success: true, data: material });
  } catch (error) {
    console.error("Error updating raw material:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete raw material (soft delete)
exports.delete = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const material = await RawMaterial.findOne({ _id: req.params.id, company_id });
    if (!material) {
      return res.status(404).json({ success: false, message: "Raw material not found" });
    }

    material.isActive = false;
    material.updatedBy = req.user?._id;
    await material.save();

    return res.json({ success: true, message: "Raw material deactivated" });
  } catch (error) {
    console.error("Error deleting raw material:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========== Raw Material Batch Operations ==========

// Get all batches for a material
exports.getBatches = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { materialId, status, expiringSoon } = req.query;

    const query = { company_id };
    if (materialId) query.rawMaterial = materialId;
    if (status) query.status = status;
    if (expiringSoon === "true") {
      const daysFromNow = new Date();
      daysFromNow.setDate(daysFromNow.getDate() + 30); // next 30 days
      query.expiryDate = { $lte: daysFromNow, $gte: new Date() };
    }

    const batches = await RawMaterialBatch.find(query)
      .populate("rawMaterial")
      .sort({ receiptDate: -1 });

    return res.json({ success: true, data: batches });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create batch
exports.createBatch = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const body = req.body || {};

    // Check for duplicate batch
    const existing = await RawMaterialBatch.findOne({
      company_id,
      rawMaterial: body.rawMaterial,
      batchNo: body.batchNo,
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "Batch number already exists for this material" });
    }

    // Calculate days to expiry if expiry date provided
    let daysToExpiry = null;
    if (body.expiryDate) {
      const expiry = new Date(body.expiryDate);
      const now = new Date();
      daysToExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    const batch = await RawMaterialBatch.create({
      ...body,
      company_id,
      daysToExpiry,
      remainingQuantity: body.quantity,
      createdBy: req.user?._id,
    });

    const populated = await RawMaterialBatch.findById(batch._id).populate("rawMaterial");
    await syncRawBatchToResults(company_id, populated, req.user);

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating batch:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update batch
exports.updateBatch = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const batch = await RawMaterialBatch.findOne({ _id: req.params.id, company_id });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // Recalculate days to expiry if expiry date changed
    if (req.body.expiryDate) {
      const expiry = new Date(req.body.expiryDate);
      const now = new Date();
      req.body.daysToExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    Object.assign(batch, req.body);
    batch.updatedBy = req.user?._id;
    await batch.save();

    const populated = await RawMaterialBatch.findById(batch._id).populate("rawMaterial");
    await syncRawBatchToResults(company_id, populated, req.user);

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error updating batch:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get batch by ID
exports.getBatchById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const batch = await RawMaterialBatch.findOne({ _id: req.params.id, company_id }).populate("rawMaterial");
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    return res.json({ success: true, data: batch });
  } catch (error) {
    console.error("Error fetching batch:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

