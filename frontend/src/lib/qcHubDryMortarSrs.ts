/** Dry Mortar SRS — QC Hub module definitions (frontend mirror of backend config) */

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
      { key: "openTime", label: "Open Time", type: "number", unit: "min" },
      { key: "slip", label: "Slip", type: "number", unit: "mm", trend: true },
      { key: "tensileAdhesionInitial", label: "Tensile Adhesion (Initial)", type: "number", unit: "N/mm²", trend: true },
      { key: "tensileAdhesionWaterImmersion", label: "Tensile Adhesion (Water Immersion)", type: "number", unit: "N/mm²", trend: true },
      { key: "tensileAdhesionHeatAging", label: "Tensile Adhesion (Heat Aging)", type: "number", unit: "N/mm²", trend: true },
      { key: "tensileAdhesionFreezeThaw", label: "Tensile Adhesion (Freeze-Thaw)", type: "number", unit: "N/mm²", trend: true },
      { key: "potLife", label: "Pot Life", type: "number", unit: "min" },
      { key: "waterRetention", label: "Water Retention", type: "number", unit: "%", trend: true },
    ],
  },
  TILE_GROUT: {
    key: "TILE_GROUT",
    label: "Tile Grout QC",
    slug: "tile-grout",
    categories: ["CG1", "CG2", "FINE_JOINT", "WIDE_JOINT"],
    parameters: [
      { key: "appearance", label: "Appearance", type: "text" },
      { key: "waterDemand", label: "Water Demand", type: "number", unit: "%", trend: true },
      { key: "flow", label: "Flow", type: "number" },
      { key: "flexuralStrength", label: "Flexural Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "compressiveStrength", label: "Compressive Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "abrasionResistance", label: "Abrasion Resistance", type: "number" },
      { key: "waterAbsorption", label: "Water Absorption", type: "number", unit: "%" },
      { key: "shrinkage", label: "Shrinkage", type: "number", unit: "mm/m" },
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
      { key: "compressiveStrength", label: "Compressive Strength", type: "number", unit: "N/mm²", trend: true },
      { key: "adhesion", label: "Adhesion", type: "number", unit: "N/mm²" },
      { key: "crackObservation", label: "Crack Observation", type: "text" },
      { key: "spreadability", label: "Spreadability", type: "number", unit: "mm" },
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
      { key: "adhesion", label: "Adhesion", type: "number", unit: "N/mm²" },
      { key: "crackResistance", label: "Crack Resistance", type: "text" },
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

export const PACKAGING_MATERIAL_TYPES = ["Printed Bags", "Labels", "Cartons", "Pallets", "Stretch Film"];

export function getModuleBySlug(slug: string): QcModuleDef | undefined {
  return Object.values(QC_MODULES).find((m) => m.slug === slug);
}

export function getAllModules(): QcModuleDef[] {
  return Object.values(QC_MODULES);
}
