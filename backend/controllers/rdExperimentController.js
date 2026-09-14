const RDExperiment = require("../models/RDExperiment");
const Formulation = require("../models/Formulation");
const { writeAudit } = require("../utils/qcAudit");
const { canAccessRndData } = require("../middleware/qcRndAccessMiddleware");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

// Get all experiments
exports.getAll = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const { status, productType, search, assignedTo } = req.query;
    const user = req.user;

    const query = { company_id, isActive: true };
    if (status) query.status = status;
    if (productType) query.productType = productType;
    if (search) {
      query.$or = [
        { experimentCode: { $regex: search, $options: "i" } },
        { experimentName: { $regex: search, $options: "i" } },
        { objective: { $regex: search, $options: "i" } },
      ];
    }
    if (assignedTo) query.assignedTo = assignedTo;

    // Access control: Only R&D and Management can see experiments
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiments = await RDExperiment.find(query)
      .populate("referenceFormulation")
      .populate("trials.formulation")
      .populate("recommendedFormulation")
      .populate("assignedTo", "firstName lastName email")
      .populate("supervisor", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: experiments });
  } catch (error) {
    console.error("Error fetching experiments:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single experiment
exports.getById = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;

    // Access control
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiment = await RDExperiment.findOne({ _id: req.params.id, company_id })
      .populate("referenceFormulation")
      .populate("trials.formulation")
      .populate("recommendedFormulation")
      .populate("assignedTo", "firstName lastName email")
      .populate("supervisor", "firstName lastName email");

    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found" });
    }

    return res.json({ success: true, data: experiment });
  } catch (error) {
    console.error("Error fetching experiment:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create experiment
exports.create = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const body = req.body || {};

    // Access control: Only R&D and Management can create
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    // Generate experiment code if not provided
    if (!body.experimentCode) {
      const year = new Date().getFullYear();
      const count = await RDExperiment.countDocuments({ company_id, experimentCode: { $regex: `^R&D-${year}-` } });
      body.experimentCode = `R&D-${year}-${String(count + 1).padStart(3, "0")}`;
    }

    // Check for duplicate
    const existing = await RDExperiment.findOne({ company_id, experimentCode: body.experimentCode });
    if (existing) {
      return res.status(409).json({ success: false, message: "Experiment code already exists" });
    }

    const experiment = await RDExperiment.create({
      ...body,
      company_id,
      createdBy: user?._id,
      updatedBy: user?._id,
    });

    await writeAudit({
      req,
      company_id,
      entityType: "RDExperiment",
      entityId: experiment._id,
      action: "CREATE",
      before: null,
      after: experiment.toObject(),
    });

    const populated = await RDExperiment.findById(experiment._id)
      .populate("referenceFormulation")
      .populate("assignedTo", "firstName lastName email")
      .populate("supervisor", "firstName lastName email");

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating experiment:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update experiment
exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;

    // Access control
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiment = await RDExperiment.findOne({ _id: req.params.id, company_id });
    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found" });
    }

    const before = experiment.toObject();
    Object.assign(experiment, req.body);
    experiment.updatedBy = user?._id;
    await experiment.save();

    await writeAudit({
      req,
      company_id,
      entityType: "RDExperiment",
      entityId: experiment._id,
      action: "UPDATE",
      before,
      after: experiment.toObject(),
    });

    const populated = await RDExperiment.findById(experiment._id)
      .populate("referenceFormulation")
      .populate("trials.formulation")
      .populate("assignedTo", "firstName lastName email");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error updating experiment:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add trial to experiment
exports.addTrial = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { formulation, modifications, testResults, observations, images, conclusion } = req.body || {};

    // Access control
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiment = await RDExperiment.findOne({ _id: id, company_id });
    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found" });
    }

    const trialNo = experiment.trials.length + 1;

    experiment.trials.push({
      trialNo,
      formulation,
      modifications: modifications || "",
      testResults: testResults || {},
      observations: observations || "",
      images: images || [],
      conclusion: conclusion || "",
      status: "PLANNED",
    });

    experiment.updatedBy = user?._id;
    await experiment.save();

    await writeAudit({
      req,
      company_id,
      entityType: "RDExperiment",
      entityId: experiment._id,
      action: "ADD_TRIAL",
      before: null,
      after: experiment.toObject(),
      meta: { trialNo },
    });

    const populated = await RDExperiment.findById(experiment._id)
      .populate("trials.formulation");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error adding trial:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update trial
exports.updateTrial = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id, trialNo } = req.params;

    // Access control
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiment = await RDExperiment.findOne({ _id: id, company_id });
    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found" });
    }

    const trial = experiment.trials.find((t) => t.trialNo === parseInt(trialNo));
    if (!trial) {
      return res.status(404).json({ success: false, message: "Trial not found" });
    }

    const before = JSON.parse(JSON.stringify(trial));
    Object.assign(trial, req.body);
    experiment.updatedBy = user?._id;
    await experiment.save();

    await writeAudit({
      req,
      company_id,
      entityType: "RDExperiment",
      entityId: experiment._id,
      action: "UPDATE_TRIAL",
      before,
      after: trial,
      meta: { trialNo },
    });

    const populated = await RDExperiment.findById(experiment._id)
      .populate("trials.formulation");

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error("Error updating trial:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Compare trials
exports.compareTrials = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { trialNos } = req.body || {}; // array of trial numbers to compare

    // Access control
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiment = await RDExperiment.findOne({ _id: id, company_id })
      .populate("trials.formulation")
      .populate("referenceFormulation");

    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found" });
    }

    const trialsToCompare = trialNos
      ? experiment.trials.filter((t) => trialNos.includes(t.trialNo))
      : experiment.trials;

    const comparison = {
      experimentCode: experiment.experimentCode,
      experimentName: experiment.experimentName,
      referenceFormulation: experiment.referenceFormulation,
      trials: trialsToCompare.map((trial) => ({
        trialNo: trial.trialNo,
        formulation: trial.formulation,
        modifications: trial.modifications,
        testResults: trial.testResults,
        observations: trial.observations,
        conclusion: trial.conclusion,
        status: trial.status,
      })),
    };

    return res.json({ success: true, data: comparison });
  } catch (error) {
    console.error("Error comparing trials:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete experiment
exports.complete = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const user = req.user;
    const { id } = req.params;
    const { overallResults, bestTrial, recommendedFormulation, conclusion, nextSteps } = req.body || {};

    // Access control
    if (user && !user.isSuperAdmin && !canAccessRndData(user)) {
      return res.status(403).json({ success: false, message: "Access denied. R&D data access required." });
    }

    const experiment = await RDExperiment.findOne({ _id: id, company_id });
    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found" });
    }

    const before = experiment.toObject();
    experiment.status = "COMPLETED";
    experiment.actualEndDate = new Date();
    if (overallResults) experiment.overallResults = overallResults;
    if (bestTrial) experiment.bestTrial = bestTrial;
    if (recommendedFormulation) experiment.recommendedFormulation = recommendedFormulation;
    if (conclusion) experiment.conclusion = conclusion;
    if (nextSteps) experiment.nextSteps = nextSteps;
    experiment.updatedBy = user?._id;
    await experiment.save();

    await writeAudit({
      req,
      company_id,
      entityType: "RDExperiment",
      entityId: experiment._id,
      action: "COMPLETE",
      before,
      after: experiment.toObject(),
    });

    const populated = await RDExperiment.findById(experiment._id)
      .populate("recommendedFormulation");

    return res.json({ success: true, data: populated, message: "Experiment completed" });
  } catch (error) {
    console.error("Error completing experiment:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

