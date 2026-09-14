const RawMaterial = require("../models/RawMaterial");
const ResinQC = require("../models/ResinQC");
const HardenerQC = require("../models/HardenerQC");
const RDTrialBatch = require("../models/RDTrialBatch");
const QCResult = require("../models/QCResult");
const QCAIConversation = require("../models/QCAIConversation");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || req.body?.company_id || "RESSICHEM";
}

function extractKeywords(message) {
  return String(message || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "with", "from", "that", "this", "for"].includes(w))
    .slice(0, 8);
}

function detectIntents(message) {
  const msg = String(message || "").toLowerCase();
  const greeting = /^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(msg);
  const definition = /^(what is|what's|define|explain)\b/.test(msg);
  const asksResinDef = /resin/.test(msg) && definition;
  const asksHardenerDef = /hardener/.test(msg) && definition;
  const asksQcDef = /(qc|quality control)/.test(msg) && definition;
  return {
    greeting,
    definition,
    asksResinDef,
    asksHardenerDef,
    asksQcDef,
    resin: /resin/.test(msg),
    hardener: /hardener/.test(msg),
    trials: /trial|r&d|rnd|experiment/.test(msg),
    results: /result|qc result|certificate|coa/.test(msg),
    raw: /raw material|material|alternative|rm\b/.test(msg),
    trends: /trend|forecast|predict/.test(msg),
    abnormal: /abnormal|out-of-spec|out of spec|deviation|risk/.test(msg),
  };
}

function filterByKeywords(items, keywords, fields) {
  if (!keywords.length) return items;
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return items.filter((item) =>
    fields.some((field) => {
      const value = item?.[field];
      if (!value) return false;
      const text = String(value).toLowerCase();
      return lowerKeywords.some((k) => text.includes(k));
    })
  );
}

async function searchRawMaterials(company_id, keywords) {
  if (!keywords.length) return [];
  const regex = new RegExp(keywords.join("|"), "i");
  return RawMaterial.find({ company_id, isActive: true, $or: [{ materialName: regex }, { materialCode: regex }] })
    .limit(5)
    .lean();
}

async function recentQCResults(company_id) {
  return QCResult.find({ company_id, isActive: true })
    .sort({ testDate: -1 })
    .limit(5)
    .lean();
}

exports.chat = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });

    const keywords = extractKeywords(message);
    const intents = detectIntents(message);

    if (intents.greeting && !intents.resin && !intents.hardener && !intents.trials && !intents.results && !intents.raw && !intents.trends && !intents.abnormal) {
      return res.json({
        success: true,
        data: {
          reply:
            "Hi! Ask me about resin or hardener batches, R&D trials, QC results, raw materials, or batch trends and I will summarize the latest data.",
          sources: {},
        },
      });
    }
    if (intents.asksResinDef) {
      return res.json({
        success: true,
        data: {
          reply:
            "Resin is the base polymer component (e.g., epoxy resin) that provides the core material properties. It is typically mixed with a hardener/curing agent to form a solid, durable matrix. In QC, we track resin batches for parameters like EEW, viscosity, gel time, and clarity.",
          sources: {},
        },
      });
    }
    if (intents.asksHardenerDef) {
      return res.json({
        success: true,
        data: {
          reply:
            "Hardener (curing agent) reacts with resin to initiate curing and form the final solid material. QC checks for hardener batches typically include amine value, viscosity, gel time, and solid content to ensure consistent curing performance.",
          sources: {},
        },
      });
    }
    if (intents.asksQcDef) {
      return res.json({
        success: true,
        data: {
          reply:
            "Quality Control (QC) verifies that batches meet defined specifications before release. It includes sampling, testing key parameters, recording results, and approving or rejecting batches based on standards.",
          sources: {},
        },
      });
    }

    const shouldInclude = {
      resin: intents.resin || intents.trends || intents.abnormal,
      hardener: intents.hardener || intents.trends || intents.abnormal,
      trials: intents.trials,
      results: intents.results || intents.trends || intents.abnormal,
      raw: intents.raw || keywords.length > 0,
    };

    const [materials, resinAll, hardenerAll, trialsAll, resultsAll] = await Promise.all([
      shouldInclude.raw ? searchRawMaterials(company_id, keywords) : Promise.resolve([]),
      shouldInclude.resin ? ResinQC.find({ company_id, isActive: true }).sort({ testDate: -1 }).limit(8).lean() : Promise.resolve([]),
      shouldInclude.hardener ? HardenerQC.find({ company_id, isActive: true }).sort({ testDate: -1 }).limit(8).lean() : Promise.resolve([]),
      shouldInclude.trials ? RDTrialBatch.find({ company_id, isActive: true }).sort({ trialDate: -1 }).limit(8).lean() : Promise.resolve([]),
      shouldInclude.results ? recentQCResults(company_id) : Promise.resolve([]),
    ]);

    const resin = filterByKeywords(resinAll, keywords, ["batchNo", "productName", "grade"]).slice(0, 3);
    const hardener = filterByKeywords(hardenerAll, keywords, ["batchNo", "productName", "grade", "category"]).slice(0, 3);
    const trials = filterByKeywords(trialsAll, keywords, ["fullTrialCode", "productFolder", "productName", "trialBatchNo"]).slice(0, 3);
    const results = filterByKeywords(resultsAll, keywords, ["batchNo", "productName", "grade", "module"]).slice(0, 3);

    const alternatives =
      materials.length > 0
        ? materials.map((m) => `${m.materialName} (${m.materialCode})`)
        : [];

    const replyLines = [];
    if (intents.trends) replyLines.push("Here is a trend-focused summary from recent batches:");
    else if (intents.abnormal) replyLines.push("Here is a quick abnormality-focused summary from recent data:");
    else replyLines.push("Here is a quick summary based on your question:");

    if (shouldInclude.resin) {
      replyLines.push(
        resin.length ? `• Resin QC batches: ${resin.map((r) => r.batchNo).join(", ")}` : "• No matching Resin QC batches found."
      );
    }
    if (shouldInclude.hardener) {
      replyLines.push(
        hardener.length ? `• Hardener QC batches: ${hardener.map((h) => h.batchNo).join(", ")}` : "• No matching Hardener QC batches found."
      );
    }
    if (shouldInclude.trials) {
      replyLines.push(
        trials.length ? `• R&D trials: ${trials.map((t) => t.fullTrialCode).join(", ")}` : "• No matching R&D trials found."
      );
    }
    if (shouldInclude.results) {
      replyLines.push(
        results.length ? `• QC results: ${results.map((r) => `${r.batchNo} (${r.module})`).join(", ")}` : "• No matching QC results found."
      );
    }
    if (shouldInclude.raw) {
      replyLines.push(
        alternatives.length
          ? `• Suggested raw materials: ${alternatives.join(", ")}`
          : "• No raw materials matched the keywords."
      );
    }
    if (intents.trends || intents.abnormal) {
      replyLines.push("Tip: Use Predictive Analytics for charts and abnormality detection.");
    }

    const reply = replyLines.join("\n");

    const tags = keywords;
    await QCAIConversation.create({
      company_id,
      user_id: req.user?.user_id || "",
      role: "qc",
      message,
      reply,
      tags,
    });

    return res.json({
      success: true,
      data: {
        reply,
        sources: {
          materials: materials.map((m) => ({ materialCode: m.materialCode, materialName: m.materialName })),
          resinBatches: resin.map((r) => r.batchNo),
          hardenerBatches: hardener.map((h) => h.batchNo),
          rdTrials: trials.map((t) => t.fullTrialCode),
        },
      },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
