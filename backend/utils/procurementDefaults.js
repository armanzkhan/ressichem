/** Default buyer (Ressichem) blocks for PFI / PO documents */
const RESSICHEM_BUYER = {
  name: "RESSICHEM PRIVATE LIMITED",
  street: "Plot # D-83, S.I.T.E, Industrial Area, Manghopir Road",
  city: "Karachi",
  postalCode: "75530",
  country: "Pakistan",
  phone: "021-32593800-02",
  taxId: "3673887-5",
  strn: "17-00-3673-887-12",
};

function defaultBillTo() {
  return { ...RESSICHEM_BUYER };
}

function defaultShipTo() {
  return { ...RESSICHEM_BUYER };
}

function supplierToParty(supplier) {
  if (!supplier) return {};
  return {
    name: supplier.name || "",
    street: supplier.address || supplier.street || "",
    city: supplier.city || "",
    country: supplier.country || "",
    phone: [supplier.phoneDialCode, supplier.mobile || supplier.phone].filter(Boolean).join(" ").trim() || "",
    taxId: supplier.taxId || "",
    strn: supplier.strn || "",
    incomeTaxExemption: supplier.incomeTaxExemption || "",
    srb: supplier.srb || "",
  };
}

function supplierBanking(supplier) {
  if (!supplier?.banking) return {};
  return { ...supplier.banking };
}

function hasBankingDetails(banking) {
  if (!banking || typeof banking !== "object") return false;
  return ["bankName", "accountNo", "swift", "branch", "address"].some(
    (key) => String(banking[key] || "").trim() !== ""
  );
}

function normalizeBanking(banking) {
  const b = banking || {};
  return {
    bankName: String(b.bankName || "").trim(),
    accountNo: String(b.accountNo || "").trim(),
    swift: String(b.swift || "").trim(),
    branch: String(b.branch || "").trim(),
    address: String(b.address || "").trim(),
  };
}

function resolveSupplierBanking(bodyBanking, supplier) {
  const fromSupplier = supplierBanking(supplier);
  if (!hasBankingDetails(bodyBanking)) return fromSupplier;
  const normalized = normalizeBanking(bodyBanking);
  return {
    bankName: normalized.bankName || fromSupplier.bankName || "",
    accountNo: normalized.accountNo || fromSupplier.accountNo || "",
    swift: normalized.swift || fromSupplier.swift || "",
    branch: normalized.branch || fromSupplier.branch || "",
    address: normalized.address || fromSupplier.address || "",
  };
}

module.exports = {
  RESSICHEM_BUYER,
  defaultBillTo,
  defaultShipTo,
  supplierToParty,
  supplierBanking,
  hasBankingDetails,
  normalizeBanking,
  resolveSupplierBanking,
};
