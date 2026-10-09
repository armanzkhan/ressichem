const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "controllers");

const specs = [
  { file: "ncrController.js", modelRequire: "../models/NCR", entity: "NCR" },
  { file: "calibrationController.js", modelRequire: "../models/CalibrationRecord", entity: "CalibrationRecord" },
  { file: "internalAuditController.js", modelRequire: "../models/InternalAudit", entity: "InternalAudit" },
  { file: "complaintController.js", modelRequire: "../models/Complaint", entity: "Complaint" },
  { file: "capaController.js", modelRequire: "../models/CAPA", entity: "CAPA" },
  { file: "mrmController.js", modelRequire: "../models/MRM", entity: "MRM" },
  { file: "rdExperimentController.js", modelRequire: "../models/RDExperiment", entity: "RDExperiment" },
  { file: "formulationController.js", modelRequire: "../models/Formulation", entity: "Formulation" },
];

for (const s of specs) {
  const filePath = path.join(dir, s.file);
  let src = fs.readFileSync(filePath, "utf8");
  if (src.includes("exports.bulkSoftDelete")) {
    console.log("skip", s.file);
    continue;
  }
  if (!src.includes("makeSoftDeleteHandlers")) {
    src = `const { makeSoftDeleteHandlers } = require("../utils/qcSoftDeleteHandlers");\n` + src;
  }
  src += `\nconst __softDeleteHandlers = makeSoftDeleteHandlers(require("${s.modelRequire}"), "${s.entity}");\n`;
  src += `exports.softDelete = __softDeleteHandlers.softDelete;\n`;
  src += `exports.bulkSoftDelete = __softDeleteHandlers.bulkSoftDelete;\n`;
  fs.writeFileSync(filePath, src);
  console.log("updated", s.file);
}

// packaging bulk
{
  const filePath = path.join(dir, "packagingMaterialQCController.js");
  let src = fs.readFileSync(filePath, "utf8");
  if (!src.includes("exports.bulkSoftDelete")) {
    if (!src.includes("makeSoftDeleteHandlers")) {
      src = src.replace(
        'const { writeAudit } = require("../utils/qcAudit");',
        'const { writeAudit } = require("../utils/qcAudit");\nconst { makeSoftDeleteHandlers } = require("../utils/qcSoftDeleteHandlers");'
      );
    }
    src += `\nconst __pkgSoftDelete = makeSoftDeleteHandlers(PackagingMaterialQC, "PackagingMaterialQC");\n`;
    src += `exports.bulkSoftDelete = __pkgSoftDelete.bulkSoftDelete;\n`;
    fs.writeFileSync(filePath, src);
    console.log("updated packagingMaterialQCController.js");
  }
}

// raw materials bulk + batch delete
{
  const filePath = path.join(dir, "rawMaterialController.js");
  let src = fs.readFileSync(filePath, "utf8");
  if (!src.includes("exports.bulkSoftDelete")) {
    if (!src.includes("makeSoftDeleteHandlers")) {
      src = `const { makeSoftDeleteHandlers } = require("../utils/qcSoftDeleteHandlers");\n` + src;
    }
    src += `\nconst __rmSoftDelete = makeSoftDeleteHandlers(RawMaterial, "RawMaterial");\n`;
    src += `exports.bulkSoftDelete = __rmSoftDelete.bulkSoftDelete;\n`;
    src += `const __rmBatchSoftDelete = makeSoftDeleteHandlers(RawMaterialBatch, "RawMaterialBatch");\n`;
    src += `exports.softDeleteBatch = __rmBatchSoftDelete.softDelete;\n`;
    src += `exports.bulkSoftDeleteBatches = __rmBatchSoftDelete.bulkSoftDelete;\n`;
    fs.writeFileSync(filePath, src);
    console.log("updated rawMaterialController.js");
  }
}

console.log("done");
