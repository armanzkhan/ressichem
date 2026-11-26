const XLSX = require("xlsx");

const DEPARTMENTS = new Set(["zrs", "lms", "drymix", "bfs"]);
const FACTORIES = new Set(["hub", "site", "lahore"]);

const TEMPLATE_COLUMNS = {
  zrs: ["Loading Date", "Grade", "Batch #", "Reactor", "Out Put", "InPut "],
  bfs: ["Packing Date ", "Product Grade", "Resin Batch No.", "Hardener Batdh No.", "Kit Size (KG)", "Kit Quantity ", "Total Output (KG)"],
  lms: ["Loading Date", "Product Grade", "Batch #", "Machine ", "Input", "Output"],
  drymix: ["Loading Date", "Product Grade", "Batch #", "Machine ", "Input", "Output"],
};

const SHEET_NAMES = { zrs: "ZRS", bfs: "BFS", lms: "LMS", drymix: "Drymix" };

const COLUMNS = TEMPLATE_COLUMNS.zrs;

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellValue(value) {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseFlexibleDate(value) {
  const text = cellValue(value);
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function normalizeFactory(value) {
  const text = cellValue(value).toLowerCase();
  if (!text) return "";
  if (text.startsWith("hub")) return "hub";
  if (text.startsWith("site")) return "site";
  if (text.startsWith("lahore") || text.startsWith("lhr")) return "lahore";
  return FACTORIES.has(text) ? text : "";
}

function normalizeDepartment(value) {
  const text = cellValue(value).toLowerCase();
  if (!text) return "";
  if (text === "zrs" || text.includes("reactor")) return "zrs";
  if (text === "lms" || text.includes("liquid")) return "lms";
  if (text.includes("dry")) return "drymix";
  if (text === "bfs" || text.includes("pack")) return "bfs";
  return DEPARTMENTS.has(text) ? text : "";
}

function joinParts(parts) {
  return parts.map((part) => String(part ?? "").trim()).join(" | ");
}

function materialsText(lines) {
  return (lines || [])
    .filter((line) => line?.name || line?.code || line?.recipe || line?.actual)
    .map((line) => joinParts([line.name, line.code, line.recipe, line.actual]))
    .join(" ; ");
}

function tempText(rows) {
  return (rows || [])
    .filter((row) => row?.time || row?.reactorTemp || row?.heatingTemp || row?.coolingTemp || row?.pressure || row?.remarks)
    .map((row) => joinParts([row.time, row.reactorTemp, row.heatingTemp, row.coolingTemp, row.pressure, row.remarks]))
    .join(" ; ");
}

function splitList(value) {
  return cellValue(value)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitParts(value) {
  return String(value || "")
    .split("|")
    .map((part) => part.trim());
}

function parseMaterials(value) {
  return splitList(value)
    .map((part) => {
      const [name, code, recipe, actual] = splitParts(part);
      if (!name && !code && !recipe && !actual) return null;
      return {
        name: name || "",
        code: code || "",
        lotNumber: "",
        recipe: recipe || "",
        actual: actual || "",
        qtyConsumed: Number(actual) || 0,
        source: "manual",
      };
    })
    .filter(Boolean);
}

function parseTempLog(value) {
  return splitList(value)
    .map((part) => {
      const [time, reactorTemp, heatingTemp, coolingTemp, pressure, remarks] = splitParts(part);
      if (!time && !reactorTemp && !heatingTemp && !coolingTemp && !pressure && !remarks) return null;
      return {
        time: time || "",
        reactorTemp: reactorTemp || "",
        heatingTemp: heatingTemp || "",
        coolingTemp: coolingTemp || "",
        setPoint: "",
        pressure: pressure || "",
        remarks: remarks || "",
      };
    })
    .filter(Boolean);
}

function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function showNum(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function templateColumns(department) {
  return TEMPLATE_COLUMNS[department] || TEMPLATE_COLUMNS.zrs;
}

function sheetNameFor(department) {
  return SHEET_NAMES[department] || "ZRS";
}

function pick(row, keys) {
  for (const key of keys) {
    const value = cellValue(row[key]);
    if (value) return value;
  }
  return "";
}

function entryToRow(entry) {
  if (entry.department === "bfs") {
    return {
      "Packing Date ": dayKey(entry.recordDate),
      "Product Grade": entry.grade || "",
      "Resin Batch No.": entry.resinBatch || "",
      "Hardener Batdh No.": entry.hardenerBatch || "",
      "Kit Size (KG)": showNum(entry.kitSizeKg),
      "Kit Quantity ": showNum(entry.kitQuantity),
      "Total Output (KG)": showNum(entry.outputKg),
    };
  }
  if (entry.department === "lms" || entry.department === "drymix") {
    return {
      "Loading Date": dayKey(entry.recordDate),
      "Product Grade": entry.grade || "",
      "Batch #": entry.batchNumber || "",
      "Machine ": entry.machine || "",
      Input: showNum(entry.inputKg),
      Output: showNum(entry.outputKg),
    };
  }
  return {
    "Loading Date": dayKey(entry.recordDate),
    Grade: entry.grade || "",
    "Batch #": entry.batchNumber || "",
    Reactor: entry.reactor || "",
    "Out Put": showNum(entry.outputKg),
    "InPut ": showNum(entry.inputKg),
  };
}

function rowToEntry(row, fallbackDepartment, fallbackFactory) {
  const department = normalizeDepartment(row.department) || normalizeDepartment(fallbackDepartment);
  const grade = pick(row, ["grade", "product_grade"]);
  const batchNumber = pick(row, ["batch", "batch_no", "batch_number"]);
  const recordDate = parseFlexibleDate(pick(row, ["loading_date", "packing_date", "date", "record_date"]));
  const resinBatch = pick(row, ["resin_batch_no", "resin_batch"]);
  const hardenerBatch = pick(row, ["hardener_batdh_no", "hardener_batch_no", "hardener_batch"]);
  const outputKg = pick(row, ["out_put", "output", "output_kg", "total_output_kg"]);
  const inputKg = pick(row, ["input", "input_kg", "in_put"]);
  const reactor = pick(row, ["reactor"]);
  const machine = pick(row, ["machine"]);
  const kitSizeKg = pick(row, ["kit_size_kg", "kit_size"]);
  const kitQuantity = pick(row, ["kit_quantity"]);
  const blank = ![grade, batchNumber, recordDate, resinBatch, hardenerBatch, outputKg, inputKg, reactor, machine, kitSizeKg, kitQuantity].some(Boolean);
  return {
    __row: row.__row,
    blank,
    example: grade.toUpperCase() === "EXAMPLE" || batchNumber.toUpperCase() === "EXAMPLE",
    body: {
      department,
      factory: normalizeFactory(row.factory) || normalizeFactory(fallbackFactory),
      recordDate,
      grade,
      batchNumber,
      reactor,
      vesselNo: pick(row, ["vessel"]),
      operator: pick(row, ["operator"]),
      chargingOperator: pick(row, ["operator"]),
      shift: pick(row, ["shift"]),
      machine,
      inputKg,
      outputKg,
      plannedQtyKg: pick(row, ["planned_kg"]),
      totalHours: pick(row, ["total_hours"]),
      workOrderNo: pick(row, ["work_order"]),
      chargingDate: parseFlexibleDate(pick(row, ["charging_date"])),
      drainingDate: parseFlexibleDate(pick(row, ["draining_date"])),
      resinBatch,
      hardenerBatch,
      kitSizeKg,
      kitQuantity,
      wastageKg: pick(row, ["wastage_kg"]),
      rejectedKg: pick(row, ["rejected_kg"]),
      reworkKg: pick(row, ["rework_kg"]),
      downtimeMinutes: pick(row, ["downtime_min"]),
      additionalRemarks: pick(row, ["remarks"]),
      materials: parseMaterials(row.materials),
      tempLog: parseTempLog(row.temperature_log),
    },
  };
}

function pickSheet(workbook, department) {
  const names = workbook.SheetNames || [];
  const wanted = sheetNameFor(department).toLowerCase();
  const named = names.find((name) => String(name).trim().toLowerCase() === wanted);
  if (named) return workbook.Sheets[named];
  if (names.length === 1) return workbook.Sheets[names[0]];
  return null;
}

function parseSpreadsheetBuffer(buffer, department) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = pickSheet(workbook, department);
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true, blankrows: false });
  return raw.map((row, index) => {
    const normalized = { __row: index + 2 };
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeKey(key)] = cellValue(value);
    }
    return normalized;
  });
}

function writeSheet(columns, rows, sheetName, format) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, String(sheetName || "Sheet").slice(0, 31));
  if (format === "csv") return Buffer.from(`\uFEFF${XLSX.utils.sheet_to_csv(worksheet)}`, "utf8");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function templateBuffer(department, format) {
  const sample = DEPARTMENTS.has(department) ? department : "zrs";
  return writeSheet(templateColumns(sample), [], sheetNameFor(sample), format);
}

function buildDepartmentBuffer(department, entries, format) {
  const sample = DEPARTMENTS.has(department) ? department : "zrs";
  return writeSheet(templateColumns(sample), entries.map(entryToRow), sheetNameFor(sample), format);
}

function buildSpreadsheetBuffer(rows, sheetName, format, columns) {
  const header = columns || (rows[0] ? Object.keys(rows[0]) : COLUMNS);
  return writeSheet(header, rows, sheetName, format);
}

function dprRows(groups) {
  return groups.map((row) => ({
    Date: row.date,
    Factory: row.factory,
    Department: row.department,
    Shift: row.shift,
    Grade: row.grade,
    "Kit size": row.kitSize && row.kitSize !== "—" ? row.kitSize : "",
    Batch: row.batch || "",
    Reactor: row.reactor || "",
    Machine: row.machine,
    Batches: row.records,
    "WIP open": row.wipOpeningKg,
    "WIP close": row.wipClosingKg,
    Planned: row.plannedQtyKg,
    Output: row.outputKg,
    Packed: row.packingKg,
    Consumed: row.materialConsumed,
    Reject: row.rejectedKg,
    Waste: row.wastageKg,
    Rework: row.reworkKg,
    Downtime: row.downtimeMinutes,
    "Pending QC": row.pendingQc,
    Yield: row.yieldPct == null ? "" : row.yieldPct,
    Operators: (row.operators || []).join(", "),
  }));
}

module.exports = {
  COLUMNS,
  TEMPLATE_COLUMNS,
  DEPARTMENTS,
  FACTORIES,
  entryToRow,
  rowToEntry,
  parseSpreadsheetBuffer,
  templateBuffer,
  buildDepartmentBuffer,
  buildSpreadsheetBuffer,
  dprRows,
};
