const fs = require("fs");
const path = require("path");
const ProductionEntry = require("../models/ProductionEntry");
const { productionDepartmentsForUser } = require("../utils/productionAccess");
const { attachLabLinks, loadLabByBatch, summarizeLab } = require("../services/productionLabLink");

const DEPARTMENTS = new Set(["zrs", "lms", "drymix", "bfs"]);
const FACTORIES = new Set(["hub", "site", "lahore"]);
const catalogPath = path.join(__dirname, "../data/productionCatalog.json");

function getCompanyId(req) {
  return req.headers["x-company-id"] || req.user?.company_id || "RESSICHEM";
}

function actorName(user) {
  if (!user) return "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.name || user.email || "";
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function durationMinutes(start, end) {
  const toMin = (value) => {
    const m = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = toMin(start);
  const b = toMin(end);
  if (a == null || b == null || b < a) return 0;
  return b - a;
}

function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const SCOPE_MESSAGE = "This account records Reactor Area, Liquid (LMS), and BFS. Drymix laboratory results stay in QC Hub.";

function guardProduction(req, res, department) {
  const allowed = productionDepartmentsForUser(req.user);
  if (!allowed.length) {
    res.status(403).json({ success: false, message: "Production access denied" });
    return null;
  }
  if (department && !allowed.includes(String(department))) {
    res.status(403).json({ success: false, message: SCOPE_MESSAGE });
    return null;
  }
  return allowed;
}

function listFilter(req) {
  const company_id = getCompanyId(req);
  const q = { company_id, isActive: { $ne: false } };
  const { department, factory, grade, batch, reactor, from, to, shift, machine, resinBatch, hardenerBatch, kitSize } =
    req.query;
  if (department && DEPARTMENTS.has(String(department))) q.department = String(department);
  if (factory && FACTORIES.has(String(factory))) q.factory = String(factory);
  const grades = String(grade || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (grades.length === 1) q.grade = new RegExp(grades[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  else if (grades.length > 1) q.grade = { $in: grades };
  if (batch) q.batchNumber = new RegExp(String(batch).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const reactors = String(reactor || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (reactors.length === 1) q.reactor = reactors[0];
  else if (reactors.length > 1) q.reactor = { $in: reactors };
  if (shift) q.shift = String(shift);
  if (machine) q.machine = new RegExp(String(machine).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (resinBatch) q.resinBatch = new RegExp(String(resinBatch).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (hardenerBatch) {
    q.hardenerBatch = new RegExp(String(hardenerBatch).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  if (kitSize) q.kitSizeKg = num(kitSize);
  const start = parseDate(from);
  const end = parseDate(to);
  if (start || end) {
    q.recordDate = {};
    if (start) q.recordDate.$gte = start;
    if (end) {
      const inclusive = new Date(end);
      inclusive.setHours(23, 59, 59, 999);
      q.recordDate.$lte = inclusive;
    }
  }
  return q;
}

function cleanMaterials(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      name: String(row?.name || "").trim(),
      code: String(row?.code || "").trim(),
      lotNumber: String(row?.lotNumber || "").trim(),
      qtyIssued: num(row?.qtyIssued),
      qtyConsumed: num(row?.qtyConsumed),
      recipe: String(row?.recipe || "").trim(),
      actual: String(row?.actual || "").trim(),
      supplier: String(row?.supplier || "").trim(),
      qcStatus: String(row?.qcStatus || "").trim(),
      source: ["manual", "sap", "laboratory"].includes(row?.source) ? row.source : "manual",
    }))
    .filter((row) => row.name || row.code || row.lotNumber || row.recipe || row.actual);
}

function validatePayload(body) {
  const department = String(body.department || "");
  const factory = String(body.factory || "");
  if (!DEPARTMENTS.has(department)) return "Select a department";
  if (!FACTORIES.has(factory)) return "Select a factory (Hub, SITE, or Lahore)";
  const recordDate = parseDate(body.recordDate);
  if (!recordDate) return "A date is required";
  const grade = String(body.grade || "").trim();
  if (!grade) return "Grade is required";
  if (department === "bfs") {
    const kitSizeKg = num(body.kitSizeKg);
    const kitQuantity = num(body.kitQuantity);
    if (!(kitSizeKg > 0)) return "Kit size must be greater than zero";
    if (!Number.isInteger(kitQuantity) || kitQuantity <= 0) return "Kit quantity must be a positive whole number";
    if (!String(body.resinBatch || "").trim()) return "Resin batch number is required";
    if (!String(body.hardenerBatch || "").trim()) return "Hardener batch number is required";
  } else {
    if (!String(body.batchNumber || "").trim()) return "Batch number is required";
    const outputKg = num(body.outputKg);
    if (outputKg < 0) return "Output must be zero or greater";
    if (department === "zrs" && !String(body.reactor || "").trim()) return "Reactor is required for ZRS";
  }
  return "";
}

function toDoc(body, existing) {
  const department = String(body.department || existing?.department || "");
  const kitSizeKg = num(body.kitSizeKg);
  const kitQuantity = num(body.kitQuantity);
  let outputKg = department === "bfs" ? Math.round(kitSizeKg * kitQuantity * 1000) / 1000 : num(body.outputKg);
  if (department === "drymix" && num(body.packaging?.totalWeight) > 0) {
    outputKg = num(body.packaging.totalWeight);
  }
  let qcStatus = String(body.qcStatus || "pending");
  if (department === "drymix") {
    const result = String(body.qcSample?.result || "").toUpperCase().replace(/\s+/g, " ");
    if (result === "OK") qcStatus = "approved";
    else if (result === "NOT OK") qcStatus = "rejected";
  }
  const qtyPackedKg = department === "bfs" ? outputKg : num(body.qtyPackedKg);
  const balanceKg =
    department === "bfs" ? Math.round((num(body.plannedQtyKg || existing?.plannedQtyKg) - qtyPackedKg) * 1000) / 1000 : num(body.balanceKg);
  return {
    department,
    factory: String(body.factory || ""),
    recordDate: parseDate(body.recordDate),
    grade: String(body.grade || "").trim(),
    batchNumber: String(body.batchNumber || "").trim(),
    reactor: department === "zrs" ? String(body.reactor || "").trim() : "",
    outputKg,
    plannedQtyKg: num(body.plannedQtyKg),
    shift: String(body.shift || "").trim(),
    operator: String(body.operator || "").trim(),
    supervisor: String(body.supervisor || "").trim(),
    startTime: String(body.startTime || "").trim(),
    endTime: String(body.endTime || "").trim(),
    durationMinutes: durationMinutes(body.startTime, body.endTime),
    machine: String(body.machine || "").trim(),
    temperature: String(body.temperature || "").trim(),
    mixingTime: String(body.mixingTime || "").trim(),
    speed: String(body.speed || "").trim(),
    processNotes: String(body.processNotes || "").trim(),
    recipeName: String(body.recipeName || "").trim(),
    recipeRevision: String(body.recipeRevision || "").trim(),
    materials: cleanMaterials(body.materials),
    qcStatus,
    labReportRef: String(body.labReportRef || "").trim(),
    qcSource: "laboratory",
    resinBatch: String(body.resinBatch || "").trim(),
    hardenerBatch: String(body.hardenerBatch || "").trim(),
    kitSizeKg,
    kitQuantity,
    packSize: String(body.packSize || body.kitSizeKg || "").trim(),
    numberOfPacks: department === "bfs" ? kitQuantity : num(body.numberOfPacks),
    finishedBatch: String(body.finishedBatch || body.batchNumber || "").trim(),
    qtyPackedKg,
    balanceKg,
    releaseStatus: String(body.releaseStatus || "pending"),
    wipOpeningKg: num(body.wipOpeningKg),
    wipClosingKg: num(body.wipClosingKg),
    wastageKg: num(body.wastageKg),
    rejectedKg: num(body.rejectedKg),
    reworkKg: num(body.reworkKg),
    downtimeMinutes: num(body.downtimeMinutes),
    downtimeReason: String(body.downtimeReason || "").trim(),
    deviation: String(body.deviation || "").trim(),
    lossReason: String(body.lossReason || "").trim(),
    formatNo: String(body.formatNo || "").trim(),
    srNo: String(body.srNo || "").trim(),
    vesselNo: String(body.vesselNo || "").trim(),
    sheetDepartment: String(body.sheetDepartment || "").trim(),
    chargingDate: parseDate(body.chargingDate),
    drainingDate: parseDate(body.drainingDate),
    chargingOperator: String(body.chargingOperator || "").trim(),
    drainingOperator: String(body.drainingOperator || "").trim(),
    inputKg: num(body.inputKg),
    yieldPct:
      num(body.inputKg) > 0 ? Math.round((outputKg / num(body.inputKg)) * 1000) / 10 : num(body.yieldPct),
    totalHours: String(body.totalHours || "").trim(),
    workOrderNo: String(body.workOrderNo || "").trim(),
    rawWeights: cleanNamed(body.rawWeights, ["mr", "bg", "ws", "ws2", "sg03", "sg", "mp", "mPowder", "massaNo"]),
    qcSample: cleanNamed(body.qcSample, ["result", "startTime", "endTime", "sampleQty", "sampleTime", "mixingTime", "agitator", "remarks"]),
    packaging: cleanNamed(body.packaging, ["packType", "unitWeight", "unitQuantity", "totalWeight", "otherDetails"]),
    tempLog: cleanTempLog(body.tempLog),
    additionalRemarks: String(body.additionalRemarks || "").trim(),
    signOff: cleanNamed(body.signOff, [
      "dispatchedBy",
      "dispatchedTime",
      "dispatchedDate",
      "approvedBy",
      "approvedTime",
      "approvedDate",
      "receivedBy",
      "receivedTime",
      "receivedDate",
      "inchargeA",
      "inchargeB",
      "inchargeC",
    ]),
  };
}

function cleanNamed(source, keys) {
  const out = {};
  for (const key of keys) out[key] = String(source?.[key] || "").trim();
  return out;
}

function cleanTempLog(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      time: String(row?.time || "").trim(),
      reactorTemp: String(row?.reactorTemp || "").trim(),
      heatingTemp: String(row?.heatingTemp || "").trim(),
      coolingTemp: String(row?.coolingTemp || "").trim(),
      setPoint: String(row?.setPoint || "").trim(),
      pressure: String(row?.pressure || "").trim(),
      remarks: String(row?.remarks || "").trim(),
    }))
    .filter((row) => Object.values(row).some(Boolean));
}

exports.catalog = (_req, res) => {
  try {
    const raw = fs.readFileSync(catalogPath, "utf8");
    return res.json({ success: true, data: JSON.parse(raw) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.lab = async (req, res) => {
  try {
    const allowed = guardProduction(req, res);
    if (!allowed) return;
    const batches = String(req.query.batches || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 20);
    const byBatch = await loadLabByBatch(getCompanyId(req), batches);
    const seen = new Set();
    const data = [];
    for (const records of byBatch.values()) {
      for (const record of records) {
        if (seen.has(record.id)) continue;
        seen.add(record.id);
        data.push(record);
      }
    }
    return res.json({ success: true, data, labStatus: summarizeLab(data) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const allowed = guardProduction(req, res);
    if (!allowed) return;
    const filter = listFilter(req);
    if (typeof filter.department === "string" && !allowed.includes(filter.department)) {
      return res.status(403).json({ success: false, message: SCOPE_MESSAGE });
    }
    if (!filter.department) filter.department = { $in: allowed };
    const limit = Math.min(Math.max(num(req.query.limit) || 300, 1), 2000);
    const [data, totals] = await Promise.all([
      ProductionEntry.find(filter).sort({ recordDate: -1, createdAt: -1 }).limit(limit).lean(),
      ProductionEntry.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            outputKg: { $sum: "$outputKg" },
            plannedQtyKg: { $sum: "$plannedQtyKg" },
            wastageKg: { $sum: "$wastageKg" },
            rejectedKg: { $sum: "$rejectedKg" },
          },
        },
      ]),
    ]);
    const rollup = totals[0] || { count: 0, outputKg: 0, plannedQtyKg: 0, wastageKg: 0, rejectedKg: 0 };
    delete rollup._id;
    const linked = await attachLabLinks(getCompanyId(req), data);
    return res.json({ success: true, data: linked, totals: rollup });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const allowed = guardProduction(req, res, req.body?.department);
    if (!allowed) return;
    const message = validatePayload(req.body || {});
    if (message) return res.status(400).json({ success: false, message });
    const doc = await ProductionEntry.create({
      ...toDoc(req.body || {}),
      company_id: getCompanyId(req),
      createdBy: req.user?._id || req.user?.id,
      createdByName: actorName(req.user),
      updatedBy: req.user?._id || req.user?.id,
      updatedByName: actorName(req.user),
    });
    const [linked] = await attachLabLinks(getCompanyId(req), [doc.toObject()]);
    return res.status(201).json({ success: true, data: linked });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await ProductionEntry.findOne({ _id: req.params.id, company_id, isActive: { $ne: false } });
    if (!existing) return res.status(404).json({ success: false, message: "Record not found" });
    const allowed = guardProduction(req, res, existing.department);
    if (!allowed) return;
    const body = { ...existing.toObject(), ...req.body, department: existing.department };
    const message = validatePayload(body);
    if (message) return res.status(400).json({ success: false, message });
    Object.assign(existing, toDoc(body, existing), {
      updatedBy: req.user?._id || req.user?.id,
      updatedByName: actorName(req.user),
    });
    await existing.save();
    const [linked] = await attachLabLinks(company_id, [existing.toObject()]);
    return res.json({ success: true, data: linked });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const existing = await ProductionEntry.findOne({ _id: req.params.id, company_id, isActive: { $ne: false } });
    if (!existing) return res.status(404).json({ success: false, message: "Record not found" });
    const allowed = guardProduction(req, res, existing.department);
    if (!allowed) return;
    existing.isActive = false;
    existing.updatedBy = req.user?._id || req.user?.id;
    existing.updatedByName = actorName(req.user);
    await existing.save();
    return res.json({ success: true, message: "Record removed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.summary = async (req, res) => {
  try {
    const allowed = guardProduction(req, res);
    if (!allowed) return;
    const company_id = getCompanyId(req);
    const match = { company_id, isActive: { $ne: false }, department: { $in: allowed } };
    const rows = await ProductionEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { department: "$department", factory: "$factory" },
          count: { $sum: 1 },
          outputKg: { $sum: "$outputKg" },
          plannedQtyKg: { $sum: "$plannedQtyKg" },
          wastageKg: { $sum: "$wastageKg" },
          rejectedKg: { $sum: "$rejectedKg" },
          pendingQc: { $sum: { $cond: [{ $eq: ["$qcStatus", "pending"] }, 1, 0] } },
        },
      },
    ]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.dpr = async (req, res) => {
  try {
    const allowed = guardProduction(req, res);
    if (!allowed) return;
    const filter = listFilter(req);
    if (typeof filter.department === "string" && !allowed.includes(filter.department)) {
      return res.status(403).json({ success: false, message: SCOPE_MESSAGE });
    }
    if (!filter.department) filter.department = { $in: allowed };
    const rows = await ProductionEntry.find(filter).sort({ recordDate: 1 }).lean();
    const groups = new Map();
    for (const row of rows) {
      const key = [dayKey(row.recordDate), row.factory, row.department, row.shift || "—", row.grade || "—", row.machine || row.reactor || "—"].join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          date: dayKey(row.recordDate),
          factory: row.factory,
          department: row.department,
          shift: row.shift || "—",
          grade: row.grade || "—",
          machine: row.machine || row.reactor || "—",
          records: 0,
          plannedQtyKg: 0,
          outputKg: 0,
          packingKg: 0,
          materialConsumed: 0,
          wastageKg: 0,
          rejectedKg: 0,
          reworkKg: 0,
          downtimeMinutes: 0,
          wipOpeningKg: 0,
          wipClosingKg: 0,
          pendingQc: 0,
          operators: [],
        });
      }
      const g = groups.get(key);
      g.records += 1;
      g.plannedQtyKg += num(row.plannedQtyKg);
      g.outputKg += num(row.outputKg);
      if (row.department === "bfs") g.packingKg += num(row.outputKg);
      g.materialConsumed += (row.materials || []).reduce((sum, line) => sum + num(line.qtyConsumed), 0);
      g.wastageKg += num(row.wastageKg);
      g.rejectedKg += num(row.rejectedKg);
      g.reworkKg += num(row.reworkKg);
      g.downtimeMinutes += num(row.downtimeMinutes);
      g.wipOpeningKg += num(row.wipOpeningKg);
      g.wipClosingKg += num(row.wipClosingKg);
      if (row.qcStatus === "pending") g.pendingQc += 1;
      if (row.operator && !g.operators.includes(row.operator)) g.operators.push(row.operator);
    }
    const data = [...groups.values()].map((g) => ({
      ...g,
      yieldPct: g.plannedQtyKg > 0 ? Math.round((g.outputKg / g.plannedQtyKg) * 1000) / 10 : null,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.trace = async (req, res) => {
  try {
    const allowed = guardProduction(req, res);
    if (!allowed) return;
    const company_id = getCompanyId(req);
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ success: false, message: "Enter a batch, lot, or material to trace" });
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const data = await ProductionEntry.find({
      company_id,
      isActive: { $ne: false },
      department: { $in: allowed },
      $or: [
        { batchNumber: rx },
        { finishedBatch: rx },
        { resinBatch: rx },
        { hardenerBatch: rx },
        { grade: rx },
        { "materials.lotNumber": rx },
        { "materials.name": rx },
        { "materials.code": rx },
      ],
    })
      .sort({ recordDate: -1 })
      .limit(200)
      .lean();
    const linked = await attachLabLinks(company_id, data);
    const production = linked.filter((row) => row.department !== "bfs");
    const packing = linked.filter((row) => row.department === "bfs");
    return res.json({ success: true, data: { production, packing } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const allowed = guardProduction(req, res);
    if (!allowed) return;
    const filter = listFilter(req);
    if (typeof filter.department === "string" && !allowed.includes(filter.department)) {
      return res.status(403).json({ success: false, message: SCOPE_MESSAGE });
    }
    if (!filter.department) filter.department = { $in: allowed };
    const rows = await ProductionEntry.find(filter).sort({ recordDate: -1 }).limit(5000).lean();
    const headers = [
      "Date",
      "Factory",
      "Department",
      "Grade",
      "Batch",
      "Reactor",
      "Output KG",
      "Planned KG",
      "Shift",
      "Operator",
      "Supervisor",
      "Resin batch",
      "Hardener batch",
      "Kit size KG",
      "Kit quantity",
      "QC status",
      "Wastage KG",
      "Rejected KG",
      "Downtime min",
      "Created by",
    ];
    const csv = [headers.join(",")]
      .concat(
        rows.map((row) =>
          [
            dayKey(row.recordDate),
            row.factory,
            row.department,
            row.grade,
            row.batchNumber,
            row.reactor,
            row.outputKg,
            row.plannedQtyKg,
            row.shift,
            row.operator,
            row.supervisor,
            row.resinBatch,
            row.hardenerBatch,
            row.kitSizeKg,
            row.kitQuantity,
            row.qcStatus,
            row.wastageKg,
            row.rejectedKg,
            row.downtimeMinutes,
            row.createdByName,
          ]
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=production-log.csv");
    return res.send(`\uFEFF${csv}`);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
