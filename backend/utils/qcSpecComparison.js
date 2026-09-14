const QCStandardCriteria = require("../models/QCStandardCriteria");
const QCTest = require("../models/QCTest");

/**
 * Auto-comparison to spec limits (SRS 3.4)
 * Compares test results against standard criteria and returns pass/fail status
 */
async function compareToSpecs(company_id, result) {
  const { system, module, productCategory, productName, grade, values } = result;

  const comparisonResults = [];
  let allPass = true;
  let outOfSpecCount = 0;

  // Get all standard criteria for this product
  const criteriaFilter = {
    company_id,
    isActive: true,
    system,
    module,
    productCategory,
    productName,
    grade,
    effectiveFrom: { $lte: result.testDate || new Date() },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: result.testDate || new Date() } }],
  };

  const standards = await QCStandardCriteria.find(criteriaFilter)
    .populate("test")
    .lean();

  // Create a map of test ID to standard
  const standardMap = new Map();
  standards.forEach((std) => {
    standardMap.set(String(std.test._id), std);
  });

  // Compare each test value
  for (const valueEntry of values || []) {
    const testId = String(valueEntry.test);
    const standard = standardMap.get(testId);

    if (!standard) {
      comparisonResults.push({
        test: valueEntry.test,
        testName: valueEntry.test?.name || "Unknown",
        value: valueEntry.value,
        numericValue: valueEntry.numericValue,
        unit: valueEntry.unit,
        status: "NO_STANDARD",
        message: "No standard criteria defined",
      });
      continue;
    }

    const numericValue = valueEntry.numericValue;
    if (numericValue === null || numericValue === undefined) {
      comparisonResults.push({
        test: valueEntry.test,
        testName: standard.test.name,
        value: valueEntry.value,
        numericValue: null,
        unit: valueEntry.unit || standard.unit,
        status: "NO_VALUE",
        message: "No numeric value to compare",
      });
      continue;
    }

    // Compare against min/max
    let status = "PASS";
    let message = "Within specification";
    const issues = [];

    if (standard.min !== null && standard.min !== undefined) {
      if (numericValue < standard.min) {
        status = "FAIL";
        issues.push(`Below minimum (${standard.min} ${standard.unit || ""})`);
        allPass = false;
        outOfSpecCount++;
      }
    }

    if (standard.max !== null && standard.max !== undefined) {
      if (numericValue > standard.max) {
        status = "FAIL";
        issues.push(`Above maximum (${standard.max} ${standard.unit || ""})`);
        allPass = false;
        outOfSpecCount++;
      }
    }

    if (issues.length > 0) {
      message = issues.join(", ");
    }

    comparisonResults.push({
      test: valueEntry.test,
      testName: standard.test.name,
      value: valueEntry.value,
      numericValue,
      unit: valueEntry.unit || standard.unit,
      standard: {
        min: standard.min,
        max: standard.max,
        target: standard.target,
        unit: standard.unit,
      },
      status,
      message,
    });
  }

  return {
    allPass,
    outOfSpecCount,
    results: comparisonResults,
    summary: allPass
      ? "All tests passed"
      : `${outOfSpecCount} test(s) out of specification`,
  };
}

/**
 * Get product-specific test templates (SRS 3.6)
 */
function getProductSpecificTests(productType) {
  const testTemplates = {
    TILE_ADHESIVE: [
      { code: "BULK_DENSITY", name: "Bulk Density", unit: "kg/m³", dataType: "number" },
      { code: "CONSISTENCY", name: "Consistency", unit: "mm", dataType: "number" },
      { code: "OPEN_TIME", name: "Open Time", unit: "min", dataType: "number" },
      { code: "SLIP", name: "Slip", unit: "mm", dataType: "number" },
      { code: "TENSILE_ADHESION", name: "Tensile Adhesion Strength", unit: "MPa", dataType: "number" },
    ],
    TILE_GROUT: [
      { code: "WATER_DEMAND", name: "Water Demand", unit: "%", dataType: "number" },
      { code: "FLOW", name: "Flow", unit: "mm", dataType: "number" },
      { code: "SHRINKAGE", name: "Shrinkage", unit: "%", dataType: "number" },
      { code: "FLEXURAL_STRENGTH", name: "Flexural Strength", unit: "MPa", dataType: "number" },
      { code: "COMPRESSIVE_STRENGTH", name: "Compressive Strength", unit: "MPa", dataType: "number" },
      { code: "WATER_ABSORPTION", name: "Water Absorption", unit: "%", dataType: "number" },
      { code: "ABRASION_RESISTANCE", name: "Abrasion Resistance", unit: "mm³", dataType: "number" },
    ],
    PREMIX_PLASTER: [
      { code: "BULK_DENSITY", name: "Bulk Density", unit: "kg/m³", dataType: "number" },
      { code: "WORKABILITY", name: "Workability", unit: "mm", dataType: "number" },
      { code: "SETTING_TIME", name: "Setting Time", unit: "min", dataType: "number" },
      { code: "DRY_DENSITY", name: "Dry Density", unit: "kg/m³", dataType: "number" },
      { code: "COMPRESSIVE_STRENGTH", name: "Compressive Strength", unit: "MPa", dataType: "number" },
      { code: "ADHESION_STRENGTH", name: "Adhesion Strength", unit: "MPa", dataType: "number" },
    ],
    REPAIR_PLASTER: [
      { code: "COMPRESSIVE_STRENGTH", name: "Compressive Strength", unit: "MPa", dataType: "number" },
      { code: "FLEXURAL_STRENGTH", name: "Flexural Strength", unit: "MPa", dataType: "number" },
      { code: "BOND_STRENGTH", name: "Bond Strength", unit: "MPa", dataType: "number" },
      { code: "SHRINKAGE", name: "Shrinkage", unit: "%", dataType: "number" },
      { code: "EXPANSION", name: "Expansion", unit: "%", dataType: "number" },
    ],
    CRACK_FILLER: [
      { code: "DRYING_TIME", name: "Drying Time", unit: "hours", dataType: "number" },
      { code: "ADHESION", name: "Adhesion", unit: "MPa", dataType: "number" },
      { code: "SHRINKAGE", name: "Shrinkage", unit: "%", dataType: "number" },
    ],
    WATERPROOFING_MEMBRANE: [
      { code: "POT_LIFE", name: "Pot Life", unit: "min", dataType: "number" },
      { code: "DRY_FILM_THICKNESS", name: "Dry Film Thickness", unit: "μm", dataType: "number" },
      { code: "WATER_PERMEABILITY", name: "Water Permeability", unit: "kg/(m²·h)", dataType: "number" },
      { code: "ADHESION", name: "Adhesion", unit: "MPa", dataType: "number" },
    ],
    SURFACE_SEALANT: [
      { code: "VISCOSITY", name: "Viscosity", unit: "cP", dataType: "number" },
      { code: "DRYING_TIME", name: "Drying Time", unit: "hours", dataType: "number" },
      { code: "ADHESION", name: "Adhesion", unit: "MPa", dataType: "number" },
      { code: "WATER_REPELLENCY", name: "Water Repellency", unit: "%", dataType: "number" },
      { code: "CHEMICAL_RESISTANCE", name: "Chemical Resistance", unit: "rating", dataType: "number" },
      { code: "WEATHERING", name: "Weathering Resistance", unit: "rating", dataType: "number" },
    ],
  };

  return testTemplates[productType] || [];
}

/**
 * EN Standards Compliance Checker (SRS 3.7)
 */
async function checkENCompliance(company_id, result, standardCode) {
  // EN 12004-1: Ceramic Tile Adhesives
  // EN 998-1: Mortars for Masonry
  // EN 13888-1: Tile Grouts

  const { productType, grade, values } = result;
  const complianceResults = {
    standard: standardCode,
    compliant: false,
    classification: null,
    details: [],
  };

  // This is a simplified version - actual EN compliance would require
  // detailed checking against each standard's specific requirements
  // For now, we'll check if all required tests are present and within limits

  const comparison = await compareToSpecs(company_id, result);
  complianceResults.compliant = comparison.allPass;
  complianceResults.details = comparison.results;

  // Determine classification based on product type and grade
  if (productType === "TILE_ADHESIVE") {
    if (grade === "C1" || grade === "C2" || grade === "C2TE" || grade === "C2TF") {
      complianceResults.classification = grade;
    }
  }

  return complianceResults;
}

module.exports = {
  compareToSpecs,
  getProductSpecificTests,
  checkENCompliance,
};

