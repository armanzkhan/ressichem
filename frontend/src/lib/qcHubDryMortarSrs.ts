/** Dry Mortar SRS — QC Hub module definitions (frontend mirror of backend config) */

/** Fixed sieve sizes for Hub Sieve Analysis (% Passing entered per size) */
export const SIEVE_ANALYSIS_SIZES = [
  "2.00 mm",
  "0.50 mm",
  "1.60 mm",
  "0.315 mm",
  "1.25 mm",
  "0.250 mm",
  "1.00 mm",
  "0.125 mm",
  "0.80 mm",
  "0.090 mm",
  "0.63 mm",
  "0.063 mm",
] as const;

export type SieveSize = (typeof SIEVE_ANALYSIS_SIZES)[number];

/** Map of sieve size → % Passing (string for form inputs) */
export type SievePassingMap = Partial<Record<string, string>>;

const FIXED_SIEVE_SET = new Set<string>(SIEVE_ANALYSIS_SIZES);

export function emptySievePassing(): SievePassingMap {
  const out: SievePassingMap = {};
  for (const size of SIEVE_ANALYSIS_SIZES) out[size] = "";
  return out;
}

export function isFixedSieveSize(size: string): boolean {
  return FIXED_SIEVE_SET.has(size);
}

export function normalizeSievePassing(raw?: unknown): SievePassingMap {
  const out = emptySievePassing();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const [size, v] of Object.entries(obj)) {
    if (!size || size.startsWith("__")) continue;
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[size] = String(v).trim();
    } else if (isFixedSieveSize(size)) {
      out[size] = "";
    }
  }
  return out;
}

/** Drop empty % Passing entries before save (keeps custom sizes too) */
export function compactSievePassing(map?: SievePassingMap): Record<string, string> | undefined {
  if (!map) return undefined;
  const out: Record<string, string> = {};
  for (const [size, v] of Object.entries(map)) {
    if (!size || size.startsWith("__")) continue;
    if (v !== undefined && String(v).trim() !== "") out[size] = String(v).trim();
  }
  return Object.keys(out).length ? out : undefined;
}

/** Ordered rows for display: fixed sizes first, then any custom sizes */
export function sievePassingEntries(map?: SievePassingMap): { size: string; percentPassing: string }[] {
  const m = map || {};
  const rows: { size: string; percentPassing: string }[] = [];
  for (const size of SIEVE_ANALYSIS_SIZES) {
    rows.push({ size, percentPassing: m[size] || "" });
  }
  for (const [size, v] of Object.entries(m)) {
    if (isFixedSieveSize(size) || size.startsWith("__")) continue;
    rows.push({ size, percentPassing: v || "" });
  }
  return rows;
}

export type QcParamDef = {
  key: string;
  label: string;
  type: "text" | "number";
  unit?: string;
  trend?: boolean;
};

export type QcModuleDef = {
  key: string;
  label: string;
  slug: string;
  categories: string[];
  parameters: QcParamDef[];
};

export const QC_MODULES: Record<string, QcModuleDef> = {
  TILE_ADHESIVE: {
    key: "TILE_ADHESIVE",
    label: "Tile Adhesive QC",
    slug: "tile-adhesive",
    categories: ["C1", "C2", "C2TE", "C2TES1", "C2TES2"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "bulkDensity", label: "Bulk Density", type: "number", unit: "g/l", trend: true },
      { key: "waterDemand", label: "Water Demand", type: "number", unit: "%", trend: true },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm", trend: true },
      { key: "freshDensity", label: "Fresh Density", type: "number", unit: "g/cm³", trend: true },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "g", trend: true },
      { key: "sieveAnalysis", label: "Sieve Analysis", type: "text" },
      { key: "openTime", label: "Open Time", type: "number", unit: "min" },
      { key: "slip", label: "Slip", type: "number", unit: "mm", trend: true },
      { key: "tensileAdhesionInitial", label: "Tensile Adhesion (Initial)", type: "number", unit: "N/mm²", trend: true },
      { key: "tensileAdhesion28Days", label: "Tensile Adhesion (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "compressiveStrength28Days", label: "Compressive Strength (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "flexuralStrength28Days", label: "Flexural (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "waterRetention", label: "Water Retention", type: "number", unit: "%", trend: true },
      { key: "shrinkage", label: "Shrinkage", type: "number", unit: "mm/m", trend: true },
      { key: "hardenedDensity", label: "Hardened Density", type: "number", unit: "g/cm³", trend: true },
    ],
  },
  TILE_GROUT: {
    key: "TILE_GROUT",
    label: "Tile Grout QC",
    slug: "tile-grout",
    categories: ["CG1", "CG2", "FINE_JOINT", "WIDE_JOINT"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "productCode", label: "Product Code", type: "text" },
      { key: "waterDemand", label: "Water Demand", type: "number", unit: "%", trend: true },
      { key: "flow", label: "Flow", type: "number" },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm", trend: true },
      { key: "sieveAnalysis", label: "Sieve Analysis", type: "text" },
      { key: "flexuralStrength28Days", label: "Flexural (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "compressiveStrength", label: "Compressive Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "abrasionResistance", label: "Abrasion Resistance", type: "number" },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%" },
      { key: "shrinkage", label: "Shrinkage", type: "number", unit: "mm/m" },
      { key: "hardenedDensity", label: "Hardened Density", type: "number", unit: "g/cm³", trend: true },
      { key: "colourConsistency", label: "Colour Consistency", type: "text" },
    ],
  },
  PREMIX_PLASTER: {
    key: "PREMIX_PLASTER",
    label: "Premix Plaster QC",
    slug: "premix-plaster",
    categories: ["INTERNAL_PLASTER", "EXTERNAL_PLASTER", "LIGHTWEIGHT_PLASTER"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "bulkDensity", label: "Bulk Density", type: "number", unit: "g/l", trend: true },
      { key: "waterDemand", label: "Water Demand", type: "number", unit: "%", trend: true },
      { key: "workability", label: "Workability", type: "text" },
      { key: "settingTime", label: "Setting Time", type: "number", unit: "min" },
      { key: "dryDensity", label: "Dry Density", type: "number", unit: "kg/m³" },
      { key: "sieveAnalysis", label: "Sieve Analysis", type: "text" },
      { key: "compressiveStrength", label: "Compressive Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "flexuralStrength28Days", label: "Flexural (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "adhesion", label: "Adhesion", type: "number", unit: "N/mm²" },
      { key: "crackObservation", label: "Crack Observation", type: "text" },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm" },
      // RPR (Premix Plaster) — Section-wise Parameter Changes
      { key: "freshDensity", label: "Fresh Density", type: "number", unit: "g/cm³", trend: true },
      { key: "waterRetention", label: "Water Retention", type: "number", unit: "%", trend: true },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%", trend: true },
      { key: "hardenedDensity", label: "Hardened Density", type: "number", unit: "g/cm³", trend: true },
    ],
  },
  SKIM_COAT: {
    key: "SKIM_COAT",
    label: "Skim Coat QC",
    slug: "skim-coat",
    categories: ["STANDARD"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "fineness", label: "Fineness", type: "number", unit: "µm" },
      { key: "waterDemand", label: "Water Demand", type: "number", unit: "%", trend: true },
      { key: "workability", label: "Workability", type: "text" },
      { key: "potLife", label: "Pot Life", type: "number", unit: "min" },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm" },
      { key: "sieveAnalysis", label: "Sieve Analysis", type: "text" },
      { key: "compressiveStrength28Days", label: "Compressive (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "flexuralStrength28Days", label: "Flexural (28 days)", type: "number", unit: "N/mm²", trend: true },
      { key: "adhesion", label: "Adhesion", type: "number", unit: "N/mm²" },
      { key: "crackResistance", label: "Crack Resistance", type: "text" },
      { key: "freshDensity", label: "Fresh Density", type: "number", unit: "g/cm³", trend: true },
      { key: "dryBulkDensity", label: "Dry Bulk Density", type: "number", unit: "g/l", trend: true },
      { key: "shrinkage", label: "Shrinkage", type: "number", unit: "mm/m", trend: true },
      { key: "waterRetention", label: "Water Retention", type: "number", unit: "%", trend: true },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%", trend: true },
      { key: "hardenedDensity", label: "Hardened Density", type: "number", unit: "g/cm³", trend: true },
    ],
  },
  REPAIR_MORTAR: {
    key: "REPAIR_MORTAR",
    label: "Repair Mortar QC",
    slug: "repair-mortar",
    categories: ["STANDARD"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "flow", label: "Flow", type: "number" },
      { key: "sieveAnalysis", label: "Sieve Analysis", type: "text" },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm", trend: true },
      { key: "freshDensity", label: "Fresh Density", type: "number", unit: "g/cm³", trend: true },
      { key: "waterRetention", label: "Water Retention", type: "number", unit: "%", trend: true },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%", trend: true },
      { key: "hardenedDensity", label: "Hardened Density", type: "number", unit: "g/cm³", trend: true },
      { key: "compressiveStrength", label: "Compressive Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "flexuralStrength", label: "Flexural Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "pullOffStrength", label: "Pull-Off Strength", type: "number", unit: "N/mm²" },
      { key: "bondStrength", label: "Bond Strength", type: "number", unit: "N/mm²" },
      { key: "shrinkage", label: "Shrinkage", type: "number", unit: "mm/m" },
    ],
  },
  WATERPROOFING: {
    key: "WATERPROOFING",
    label: "Waterproofing Products QC",
    slug: "waterproofing",
    categories: ["CEMENTITIOUS", "FLEXIBLE", "CRYSTALLINE"],
    parameters: [
      { key: "potLife", label: "Pot Life", type: "number", unit: "min" },
      { key: "solidContent", label: "Solid Content", type: "number", unit: "%", trend: true },
      { key: "viscosity", label: "Viscosity", type: "number", unit: "cP", trend: true },
      { key: "density", label: "Density", type: "number", unit: "g/cm³", trend: true },
      { key: "waterPermeability", label: "Water Permeability", type: "text" },
      { key: "hydrostaticPressureResistance", label: "Hydrostatic Pressure Resistance", type: "text" },
      { key: "crackBridgingAbility", label: "Crack Bridging Ability", type: "text" },
      { key: "adhesionStrength", label: "Adhesion Strength", type: "number", unit: "N/mm²" },
      { key: "pullOffStrength", label: "Pull-Off Strength", type: "number", unit: "N/mm²" },
      { key: "dryFilmThickness", label: "Dry Film Thickness", type: "number", unit: "µm" },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%" },
    ],
  },
  CRACK_FILLER: {
    key: "CRACK_FILLER",
    label: "Crack Filler QC",
    slug: "crack-filler",
    categories: ["STANDARD"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "consistency", label: "Consistency", type: "text" },
      { key: "workability", label: "Workability", type: "text" },
      { key: "dryingTime", label: "Drying Time", type: "number", unit: "min" },
      { key: "adhesion", label: "Adhesion", type: "number", unit: "N/mm²" },
      { key: "shrinkage", label: "Shrinkage", type: "number", unit: "mm/m" },
      { key: "crackBridgingAbility", label: "Crack Bridging Ability", type: "text" },
    ],
  },
  SELF_LEVEL_SEALERS: {
    key: "SELF_LEVEL_SEALERS",
    label: "Self Level Flooring & Sealers QC",
    slug: "self-level-sealers",
    categories: ["SELF_LEVEL_FLOORING", "SEALERS", "PROTECTIVE_COATINGS"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "viscosity", label: "Viscosity", type: "number", unit: "cP" },
      { key: "dryBulkDensity", label: "Dry Bulk Density", type: "number", unit: "g/l", trend: true },
      { key: "freshDensity", label: "Fresh Density", type: "number", unit: "g/cm³", trend: true },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm", trend: true },
      { key: "flexuralStrength", label: "Flexural Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "compressiveStrength", label: "Compressive Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%", trend: true },
      { key: "dryingTime", label: "Drying Time", type: "number", unit: "min" },
      { key: "adhesion", label: "Adhesion", type: "number", unit: "N/mm²" },
      { key: "waterRepellency", label: "Water Repellency", type: "text" },
      { key: "chemicalResistance", label: "Chemical Resistance", type: "text" },
      { key: "weatheringUvResistance", label: "Weathering / UV Resistance", type: "text" },
    ],
  },
};

export const RAW_MATERIAL_TYPES = [
  "Cement", "White Cement", "Silica Sand", "Limestone Powder", "Calcium Carbonate",
  "Fly Ash", "Redispersible Polymer Powder (RDP)", "HPMC", "Starch Ether", "Defoamer",
  "Water Repellent", "Fibres", "Pigments", "Other Chemical Additives",
];

export type HubRmTestDef = {
  code: string;
  name: string;
  unit?: string;
  /** Which material categories show this field; omit = all */
  categories?: string[];
};

/** Hub raw-material QC test fields (saved under batch.coa.testResults) */
export const HUB_RM_TESTS: HubRmTestDef[] = [
  // Other raw materials
  { code: "VISCOSITY", name: "Viscosity", unit: "cP", categories: ["OTHER"] },
  // Sieve Analysis is a dedicated section (SIEVE_ANALYSIS_SIZES + % Passing) on all RM forms
  { code: "BULK_DENSITY", name: "Bulk Density", unit: "g/l", categories: ["OTHER"] },
  { code: "SOLID_CONTENT", name: "Solid Content", unit: "%", categories: ["OTHER"] },
  { code: "PH", name: "pH", categories: ["OTHER"] },
  { code: "INSOLUBLE_RESIDUE", name: "Insoluble Residue", unit: "%", categories: ["OTHER"] },
  { code: "ASH_CONTENT", name: "Ash Content", unit: "%", categories: ["OTHER"] },
  { code: "BLAINE", name: "Blaine", unit: "cm²/g", categories: ["OTHER"] },
  { code: "SPREADABILITY", name: "Spreadability", unit: "mm", categories: ["OTHER"] },
  { code: "FRESH_MORTAR", name: "Fresh Mortar", categories: ["OTHER"] },
  { code: "PURITY", name: "Purity", unit: "%", categories: ["OTHER"] },
  // Cement
  { code: "DRY_BULK_RESIDUE", name: "Dry Bulk Residue", unit: "%", categories: ["CEMENT", "SAND"] },
  { code: "LOI", name: "Loss on Ignition (LOI)", unit: "%", categories: ["CEMENT"] },
  { code: "FLEXURAL_2D", name: "Flexural Strength (2 days)", unit: "N/mm²", categories: ["CEMENT"] },
  { code: "FLEXURAL_7D", name: "Flexural Strength (7 days)", unit: "N/mm²", categories: ["CEMENT"] },
  { code: "FLEXURAL_14D", name: "Flexural Strength (14 days)", unit: "N/mm²", categories: ["CEMENT"] },
  { code: "COMPRESSIVE_2D", name: "Compressive Strength (2 days)", unit: "N/mm²", categories: ["CEMENT"] },
  { code: "COMPRESSIVE_7D", name: "Compressive Strength (7 days)", unit: "N/mm²", categories: ["CEMENT"] },
  { code: "COMPRESSIVE_28D", name: "Compressive Strength (28 days)", unit: "N/mm²", categories: ["CEMENT"] },
  // Sand
  { code: "MOISTURE", name: "Moisture", unit: "%", categories: ["SAND"] },
];

export function hubRmTestsForCategory(category?: string): HubRmTestDef[] {
  const cat = String(category || "").toUpperCase();
  if (cat === "CEMENT" || cat === "SAND") {
    return HUB_RM_TESTS.filter((t) => t.categories?.includes(cat));
  }
  // Polymer / additive / filler / pigment / other → "other raw material" params
  return HUB_RM_TESTS.filter((t) => t.categories?.includes("OTHER"));
}

export const PACKAGING_MATERIAL_TYPES = ["Printed Bags", "Labels", "Cartons", "Pallets", "Stretch Film"];

export const PACKAGING_RESULT_FIELDS = [
  { key: "dimensions", label: "Dimensions", placeholder: "e.g. OK / 500x300 mm" },
  { key: "length", label: "Length", placeholder: "e.g. 500 mm" },
  { key: "width", label: "Width", placeholder: "e.g. 300 mm" },
  { key: "height", label: "Height", placeholder: "e.g. 100 mm" },
  { key: "weight", label: "Weight", placeholder: "e.g. 80 g" },
  { key: "weightGsm", label: "Weight / GSM", placeholder: "e.g. 80 gsm" },
  { key: "thickness", label: "Thickness", placeholder: "e.g. 0.05 mm" },
  { key: "ply", label: "Ply", placeholder: "e.g. 2 / 3 ply" },
  { key: "printing", label: "Printing", placeholder: "e.g. OK / Pass" },
  { key: "printQuality", label: "Print Quality", placeholder: "e.g. Pass / Fail" },
  { key: "colorMatch", label: "Color Match", placeholder: "e.g. OK" },
  { key: "sealStrength", label: "Seal Strength", placeholder: "e.g. Pass" },
  { key: "dropTest", label: "Drop Test", placeholder: "e.g. Pass / Fail" },
  { key: "visualDefects", label: "Visual Defects", placeholder: "e.g. None" },
  { key: "overallResult", label: "Overall Result", placeholder: "e.g. Pass / Fail" },
] as const;

export function getModuleBySlug(slug: string): QcModuleDef | undefined {
  return Object.values(QC_MODULES).find((m) => m.slug === slug);
}

export function getAllModules(): QcModuleDef[] {
  return Object.values(QC_MODULES);
}
