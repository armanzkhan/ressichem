/**
 * Landed-cost calculations mirroring the import costing spreadsheet.
 * One set of duty % and other charges is applied to two payment-rate scenarios.
 */

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}

/**
 * @param {object} input
 * @param {number} input.qty
 * @param {number} input.unitPrice - payment/CFR rate (USD or local currency unit)
 * @param {number} input.insuranceUsd
 * @param {number} input.landingPct
 * @param {number} input.exchangeRate - to PKR
 * @param {number} input.cdPct
 * @param {number} input.addCdPct
 * @param {number} input.adSalesTaxPct
 * @param {number} input.salesTaxPct
 * @param {number} input.incomeTaxPct
 * @param {number} input.whsc
 * @param {number} input.dutiesBond
 * @param {number} input.agentBill
 * @param {number} input.insurancePkr
 * @param {number} input.bankComm
 * @param {number} input.otherCharges
 */
function computeCostScenario(input = {}) {
  const qty = Number(input.qty) || 0;
  const unitPrice = Number(input.unitPrice) || 0;
  const insuranceUsd = Number(input.insuranceUsd) || 0;
  const landingPct = Number(input.landingPct) || 0;
  const exchangeRate = Number(input.exchangeRate) || 1;

  const amountUsd = round2(qty * unitPrice);
  const landingUsd = round2((amountUsd + insuranceUsd) * (landingPct / 100));
  const amountPkr = round2(amountUsd * exchangeRate);

  const cdPct = Number(input.cdPct) || 0;
  const addCdPct = Number(input.addCdPct) || 0;
  const adSalesTaxPct = Number(input.adSalesTaxPct) || 0;
  const salesTaxPct = Number(input.salesTaxPct) || 0;
  const incomeTaxPct = Number(input.incomeTaxPct) || 0;

  const cd = round2(amountPkr * (cdPct / 100));
  const addCd = round2(amountPkr * (addCdPct / 100));
  const adSalesTax = round2(amountPkr * (adSalesTaxPct / 100));
  const salesTax = round2(amountPkr * (salesTaxPct / 100));
  // I/Tax typically assessed on assessable value + sales tax components used in sheet total
  const incomeTax = round2((amountPkr + salesTax) * (incomeTaxPct / 100));

  const totalDuties = round2(amountPkr + cd + addCd + adSalesTax + salesTax + incomeTax);

  const whsc = Number(input.whsc) || 0;
  const dutiesBond = Number(input.dutiesBond) || 0;
  const agentBill = Number(input.agentBill) || 0;
  const insurancePkr = Number(input.insurancePkr) || 0;
  const bankComm = Number(input.bankComm) || 0;
  const otherCharges = Number(input.otherCharges) || 0;
  const otherTotal = round2(whsc + dutiesBond + agentBill + insurancePkr + bankComm + otherCharges);

  const gTotal = round2(totalDuties + otherTotal);
  const priceInclAllTaxes = qty > 0 ? round4(gTotal / qty) : 0;
  const priceWithoutSalesTax = qty > 0 ? round4((gTotal - salesTax) / qty) : 0;

  return {
    unitPrice,
    insuranceUsd,
    landingPct,
    amountUsd,
    landingUsd,
    exchangeRate,
    amountPkr,
    cdPct,
    addCdPct,
    adSalesTaxPct,
    salesTaxPct,
    incomeTaxPct,
    cd,
    addCd,
    adSalesTax,
    salesTax,
    incomeTax,
    totalDuties,
    whsc,
    dutiesBond,
    agentBill,
    insurancePkr,
    bankComm,
    otherCharges,
    otherTotal,
    gTotal,
    priceInclAllTaxes,
    priceWithoutSalesTax,
  };
}

function computeBothScenarios(body = {}) {
  const shared = {
    qty: body.qtyExBond,
    exchangeRate: body.exchangeRate,
    cdPct: body.cdPct,
    addCdPct: body.addCdPct,
    adSalesTaxPct: body.adSalesTaxPct,
    salesTaxPct: body.salesTaxPct,
    incomeTaxPct: body.incomeTaxPct,
    whsc: body.whsc,
    dutiesBond: body.dutiesBond,
    agentBill: body.agentBill,
    insurancePkr: body.insurancePkr,
    bankComm: body.bankComm,
    otherCharges: body.otherCharges,
  };

  const taxPurpose = computeCostScenario({
    ...shared,
    unitPrice: body.taxPurposeUnitPrice,
    insuranceUsd: body.taxPurposeInsuranceUsd,
    landingPct: body.taxPurposeLandingPct,
  });

  const allInclusive = computeCostScenario({
    ...shared,
    unitPrice: body.inclusiveUnitPrice,
    insuranceUsd: body.inclusiveInsuranceUsd,
    landingPct: body.inclusiveLandingPct,
  });

  return { taxPurpose, allInclusive };
}

module.exports = {
  computeCostScenario,
  computeBothScenarios,
  round2,
  round4,
};
