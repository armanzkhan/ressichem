"use client";

import React, { useMemo, useState } from "react";
import type { CommercialDocumentForm, PartyBlock, PurchaseType } from "@/lib/procurementDocumentTypes";
import {
  computeLineSubtotal,
  computeTaxAmountFromSaleTax,
  emptyPartyBlock,
  RESSICHEM_BUYER_DEFAULT,
} from "@/lib/procurementDocumentTypes";
import {
  incoTermsForScope,
  LOCAL_SALES_TAX_RATES,
  optionsWithCurrent,
  paymentTermsForScope,
  type ProcurementTradeScope,
} from "@/lib/procurementOptions";
import { AddableSelect } from "./AddableSelect";
import { CurrencyExchangeFields } from "./CurrencyExchangeFields";
import { TermSelect } from "./TermSelect";
import {
  procurementCompactFieldClass,
  procurementCompactLabelClass,
  procurementFieldsetClass,
  procurementHintClass,
  procurementLegendClass,
} from "./procurement-ui";

function PartyFields({
  title,
  party,
  onChange,
}: {
  title: string;
  party: PartyBlock;
  onChange: (p: PartyBlock) => void;
}) {
  const field = (key: keyof PartyBlock, label: string) => (
    <label key={key} className={procurementCompactLabelClass}>
      {label}
      <input
        className={procurementCompactFieldClass}
        value={party[key] || ""}
        onChange={(e) => onChange({ ...party, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <fieldset className={`${procurementFieldsetClass} space-y-2`}>
      <legend className={procurementLegendClass}>{title}</legend>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {field("name", "Name")}
        {field("street", "Street")}
        {field("city", "City")}
        {field("postalCode", "Postal code")}
        {field("country", "Country")}
        {field("phone", "Phone")}
        {field("taxId", "NTN / Tax ID")}
        {field("strn", "STRN")}
      </section>
    </fieldset>
  );
}

function partySummary(party: PartyBlock) {
  const parts = [party.name, party.city, party.country].filter(Boolean);
  return parts.length ? parts.join(" — ") : "Not set";
}

export function TermsConditionsField({
  value,
  onChange,
  placeholder = "Printed at the end of the document",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={procurementCompactLabelClass}>
      Terms &amp; conditions
      <textarea
        className={procurementCompactFieldClass}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

type Props = {
  form: CommercialDocumentForm;
  onChange: (f: CommercialDocumentForm) => void;
  showPfiFields?: boolean;
  showPoFields?: boolean;
  /** Export PFI issued by Ressichem — customer is bill-to, not Ressichem */
  isExportPfi?: boolean;
  /** When set (local PO or import PO page), hides type switcher and locks the form layout */
  lockPurchaseType?: PurchaseType;
  /** When false, terms field is omitted (e.g. rendered after line items) */
  showTermsField?: boolean;
  /** When false, notes field is omitted from this block (e.g. rendered after terms) */
  showNotesField?: boolean;
};

export function ProcurementCommercialForm({
  form,
  onChange,
  showPfiFields,
  showPoFields,
  isExportPfi,
  lockPurchaseType,
  showTermsField = true,
  showNotesField = true,
}: Props) {
  const [showLocalPartyDetails, setShowLocalPartyDetails] = useState(false);
  const [showExportCustomerDetails, setShowExportCustomerDetails] = useState(false);
  const set = (patch: Partial<CommercialDocumentForm>) =>
    onChange({
      ...form,
      ...patch,
      ...(lockPurchaseType ? { purchaseType: lockPurchaseType } : {}),
    });
  const purchaseType = lockPurchaseType ?? form.purchaseType;
  const isLocal = purchaseType === "local";
  const isLocalPo = showPoFields && isLocal;
  const isForeignPo = showPoFields && !isLocal;
  const tradeScope: ProcurementTradeScope = isExportPfi
    ? "export"
    : isLocalPo || (isLocal && !showPfiFields)
      ? "local"
      : "import";
  const paymentTermOptions = paymentTermsForScope(tradeScope);
  const incoTermOptions = incoTermsForScope(tradeScope);
  const lineSubtotal = useMemo(() => computeLineSubtotal(form.lines), [form.lines]);
  const computedTaxAmount = useMemo(
    () => computeTaxAmountFromSaleTax(lineSubtotal, form.saleTax),
    [lineSubtotal, form.saleTax]
  );
  const saleTaxOptions = useMemo(
    () => optionsWithCurrent([...LOCAL_SALES_TAX_RATES], form.saleTax),
    [form.saleTax]
  );
  const switchToForeign = () =>
    onChange({
      ...form,
      purchaseType: "foreign",
      currency: form.currency === "PKR" ? "USD" : form.currency,
      prNumber: "",
      taxAmount: "0",
      saleTax: "",
      loadingPort: "",
      orderedBy: "",
      bookedBy: "",
      notes: "",
      billTo: emptyPartyBlock(),
      shipTo: emptyPartyBlock(),
    });

  const switchToLocal = () =>
    onChange({
      ...form,
      purchaseType: "local",
      currency: "PKR",
      exchangeRate: "1",
      incoTerm: "",
      loadingPort: "",
      portOfLoading: "",
      shipment: "",
      orderedBy: "",
      bookedBy: "",
      notes: "",
      placeOfDelivery: form.placeOfDelivery || "Karachi, Pakistan",
      billTo: form.billTo?.name ? form.billTo : { ...RESSICHEM_BUYER_DEFAULT },
      shipTo: form.shipTo?.name ? form.shipTo : { ...RESSICHEM_BUYER_DEFAULT },
    });

  return (
    <section className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {showPoFields && !lockPurchaseType ? (
        <section className="flex flex-wrap gap-3 items-center">
          <span className={`${procurementHintClass} font-medium`}>Order type</span>
          <label className={`${procurementCompactLabelClass} flex items-center gap-1 font-normal`}>
            <input type="radio" name="purchaseType" checked={isLocal} onChange={switchToLocal} />
            Local (Pakistan)
          </label>
          <label className={`${procurementCompactLabelClass} flex items-center gap-1 font-normal`}>
            <input type="radio" name="purchaseType" checked={!isLocal} onChange={switchToForeign} />
            Foreign (import)
          </label>
        </section>
      ) : null}
      {showPoFields && lockPurchaseType ? (
        <p className={`${procurementHintClass} font-medium`}>
          {lockPurchaseType === "local" ? "Local purchase order (Pakistan)" : "Import purchase order (foreign)"}
        </p>
      ) : null}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className={procurementCompactLabelClass}>
          Document date
          <input
            type="date"
            className={procurementCompactFieldClass}
            value={form.documentDate}
            onChange={(e) => set({ documentDate: e.target.value })}
          />
        </label>
        {showPfiFields ? (
          <>
            <label className={procurementCompactLabelClass}>
              {isExportPfi ? "Invoice No." : "Quote #"}
              <input
                className={procurementCompactFieldClass}
                value={form.quoteNumber}
                onChange={(e) => set({ quoteNumber: e.target.value })}
                placeholder={isExportPfi ? "e.g. RPL/036" : ""}
              />
            </label>
            {!isExportPfi ? (
              <>
                <label className={procurementCompactLabelClass}>
                  Customer #
                  <input
                    className={procurementCompactFieldClass}
                    value={form.customerNumber}
                    onChange={(e) => set({ customerNumber: e.target.value })}
                  />
                </label>
                <label className={procurementCompactLabelClass}>
                  Valid from
                  <input
                    type="date"
                    className={procurementCompactFieldClass}
                    value={form.validFrom}
                    onChange={(e) => set({ validFrom: e.target.value })}
                  />
                </label>
                <label className={procurementCompactLabelClass}>
                  Valid until
                  <input
                    type="date"
                    className={procurementCompactFieldClass}
                    value={form.validUntil}
                    onChange={(e) => set({ validUntil: e.target.value })}
                  />
                </label>
              </>
            ) : (
              <label className={procurementCompactLabelClass}>
                Customer #
                <input
                  className={procurementCompactFieldClass}
                  value={form.customerNumber}
                  onChange={(e) => set({ customerNumber: e.target.value })}
                />
              </label>
            )}
          </>
        ) : null}
        {isLocalPo ? (
          <label className={procurementCompactLabelClass}>
            P.R #
            <input
              className={procurementCompactFieldClass}
              value={form.prNumber}
              onChange={(e) => set({ prNumber: e.target.value })}
            />
          </label>
        ) : null}
      </section>

      {isLocalPo ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label className={procurementCompactLabelClass}>
            Currency
            <input
              readOnly
              className={`${procurementCompactFieldClass} bg-blue-50`}
              value="PKR"
            />
          </label>
          <label className={`${procurementCompactLabelClass} sm:col-span-2`}>
            Payment terms
            <div className="mt-0.5">
              <TermSelect
                value={form.paymentTerms}
                onChange={(paymentTerms) => set({ paymentTerms })}
                options={paymentTermOptions}
                placeholder="Select payment terms"
                scopedOnly={isLocalPo}
                allowAdd={!isLocalPo}
                addLabel="+ Add payment term…"
              />
            </div>
          </label>
          <label className={`${procurementCompactLabelClass} sm:col-span-2`}>
            Place of delivery
            <input
              className={procurementCompactFieldClass}
              value={form.placeOfDelivery}
              onChange={(e) => set({ placeOfDelivery: e.target.value })}
              placeholder="Karachi, Pakistan"
            />
          </label>
          <label className={procurementCompactLabelClass}>
            Sales tax (%)
            <div className="mt-0.5">
              <AddableSelect
                value={form.saleTax}
                onChange={(saleTax) => {
                  const taxAmount = computeTaxAmountFromSaleTax(lineSubtotal, saleTax);
                  set({ saleTax, taxAmount: String(taxAmount) });
                }}
                options={saleTaxOptions.map((rate) => ({ value: rate, label: rate }))}
                placeholder="Select sales tax rate"
              />
            </div>
          </label>
          <label className={procurementCompactLabelClass}>
            Tax amount (PKR)
            <input
              readOnly
              className={`${procurementCompactFieldClass} bg-blue-50`}
              value={computedTaxAmount.toFixed(2)}
            />
            <span className={`mt-0.5 block ${procurementHintClass}`}>
              Calculated from line total × sales tax %
            </span>
          </label>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <CurrencyExchangeFields
              currency={form.currency}
              exchangeRate={form.exchangeRate}
              onCurrencyChange={(currency) => set({ currency })}
              onExchangeRateChange={(exchangeRate) => set({ exchangeRate })}
            />
            <label className={procurementCompactLabelClass}>
              Payment terms
              <div className="mt-0.5">
                <TermSelect
                  required={isForeignPo}
                  value={form.paymentTerms}
                  onChange={(paymentTerms) => set({ paymentTerms })}
                  options={paymentTermOptions}
                  placeholder="Select payment terms"
                  scopedOnly
                  allowAdd={tradeScope === "import"}
                  addLabel="+ Add payment term…"
                />
              </div>
            </label>
            {!isLocal || showPfiFields ? (
              <label className={procurementCompactLabelClass}>
                Incoterm
                <div className="mt-0.5">
                  <TermSelect
                    required={isForeignPo}
                    value={form.incoTerm}
                    onChange={(incoTerm) => set({ incoTerm })}
                    options={incoTermOptions}
                    placeholder={tradeScope === "local" ? "Select delivery term" : "Select incoterm"}
                    scopedOnly
                    allowAdd={tradeScope === "import"}
                    addLabel="+ Add incoterm…"
                  />
                </div>
              </label>
            ) : null}
            {!isForeignPo ? (
              <label className={procurementCompactLabelClass}>
                Tax amount
                <input
                  type="number"
                  className={procurementCompactFieldClass}
                  value={form.taxAmount}
                  onChange={(e) => set({ taxAmount: e.target.value })}
                />
              </label>
            ) : null}
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {!isExportPfi && (!isLocal || showPfiFields) ? (
              <label className={procurementCompactLabelClass}>
                Port of loading
                <input
                  className={procurementCompactFieldClass}
                  value={form.portOfLoading}
                  onChange={(e) => set({ portOfLoading: e.target.value })}
                  placeholder="e.g. Shanghai, China"
                />
              </label>
            ) : null}
            <label className={procurementCompactLabelClass}>
              {isExportPfi ? "Delivery location" : "Place of delivery"}
              <input
                className={procurementCompactFieldClass}
                value={form.placeOfDelivery}
                onChange={(e) => set({ placeOfDelivery: e.target.value })}
                placeholder={isExportPfi ? "e.g. Karachi, Pakistan" : "e.g. Karachi, Pakistan"}
              />
            </label>
            {!isLocal || showPfiFields ? (
              <label className={procurementCompactLabelClass}>
                {isExportPfi ? "Packing (document)" : "Shipment"}
                <input
                  className={procurementCompactFieldClass}
                  value={form.shipment}
                  onChange={(e) => set({ shipment: e.target.value })}
                  placeholder={isExportPfi ? "e.g. 20 Pallets" : "Vessel / mode / timeline"}
                />
              </label>
            ) : null}
            {showPfiFields && !isExportPfi ? (
              <>
                <label className={procurementCompactLabelClass}>
                  Loading port
                  <input
                    className={procurementCompactFieldClass}
                    value={form.loadingPort}
                    onChange={(e) => set({ loadingPort: e.target.value })}
                  />
                </label>
                <label className={procurementCompactLabelClass}>
                  Ordered by
                  <input
                    className={procurementCompactFieldClass}
                    value={form.orderedBy}
                    onChange={(e) => set({ orderedBy: e.target.value })}
                  />
                </label>
                <label className={procurementCompactLabelClass}>
                  Booked by
                  <input
                    className={procurementCompactFieldClass}
                    value={form.bookedBy}
                    onChange={(e) => set({ bookedBy: e.target.value })}
                  />
                </label>
              </>
            ) : showPfiFields && !isExportPfi ? (
              <>
                <label className={procurementCompactLabelClass}>
                  Ordered by
                  <input
                    className={procurementCompactFieldClass}
                    value={form.orderedBy}
                    onChange={(e) => set({ orderedBy: e.target.value })}
                  />
                </label>
                <label className={procurementCompactLabelClass}>
                  Booked by
                  <input
                    className={procurementCompactFieldClass}
                    value={form.bookedBy}
                    onChange={(e) => set({ bookedBy: e.target.value })}
                  />
                </label>
              </>
            ) : null}
          </section>
        </>
      )}

      {isForeignPo ? (
        <section className="space-y-3">
          <p className={procurementHintClass}>
            Enter bill to and ship to addresses for the printed import PO.
          </p>
          <PartyFields title="Bill to" party={form.billTo} onChange={(billTo) => set({ billTo })} />
          <PartyFields title="Ship to" party={form.shipTo} onChange={(shipTo) => set({ shipTo })} />
        </section>
      ) : isLocalPo ? (
        <fieldset className={procurementFieldsetClass}>
          <legend className={procurementLegendClass}>Bill to &amp; ship to (Ressichem)</legend>
          <p className={procurementHintClass}>Used on the printed local PO.</p>
          <p className={`${procurementHintClass} mt-1`}>
            <strong className="text-blue-800">Bill to:</strong> {partySummary(form.billTo)}
          </p>
          <p className={`${procurementHintClass} mt-0.5`}>
            <strong className="text-blue-800">Ship to:</strong> {partySummary(form.shipTo)}
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-blue-600 hover:underline"
            onClick={() => setShowLocalPartyDetails((v) => !v)}
          >
            {showLocalPartyDetails ? "Hide address details" : "Edit addresses"}
          </button>
          {showLocalPartyDetails ? (
            <section className="mt-3 space-y-3">
              <PartyFields title="Bill to" party={form.billTo} onChange={(billTo) => set({ billTo })} />
              <PartyFields title="Ship to" party={form.shipTo} onChange={(shipTo) => set({ shipTo })} />
            </section>
          ) : null}
        </fieldset>
      ) : isExportPfi ? (
        <fieldset className={procurementFieldsetClass}>
          <legend className={procurementLegendClass}>Consignee &amp; notify address</legend>
          <p className={procurementHintClass}>
            Ressichem is shipper/exporter on the printed PFI. Consignee and notify address appear in the sample invoice layout.
          </p>
          <p className={`${procurementHintClass} mt-1`}>
            <strong className="text-blue-800">Consignee:</strong> {partySummary(form.billTo)}
          </p>
          <p className={`${procurementHintClass} mt-0.5`}>
            <strong className="text-blue-800">Notify address:</strong> {partySummary(form.shipTo)}
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-blue-600 hover:underline"
            onClick={() => setShowExportCustomerDetails((v) => !v)}
          >
            {showExportCustomerDetails ? "Hide address details" : "Edit consignee / notify address"}
          </button>
          {showExportCustomerDetails ? (
            <section className="mt-3 space-y-3">
              <PartyFields title="Consignee" party={form.billTo} onChange={(billTo) => set({ billTo })} />
              <PartyFields title="Notify address" party={form.shipTo} onChange={(shipTo) => set({ shipTo })} />
            </section>
          ) : null}
        </fieldset>
      ) : (
        <>
          <PartyFields title="Bill to (Ressichem)" party={form.billTo} onChange={(billTo) => set({ billTo })} />
          <PartyFields title="Ship to" party={form.shipTo} onChange={(shipTo) => set({ shipTo })} />
        </>
      )}

      {(showPoFields || showPfiFields) && !isExportPfi ? (
          <fieldset className={procurementFieldsetClass}>
            <legend className={procurementLegendClass}>Supplier banking</legend>
            <p className={`${procurementHintClass} mb-2`}>
              Auto-filled from the supplier master when you select a supplier (saved from previous POs). Edit if
              needed.
            </p>
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(["bankName", "accountNo", "swift", "branch"] as const).map((k) => (
                <label key={k} className={`${procurementCompactLabelClass} capitalize`}>
                  {k.replace(/([A-Z])/g, " $1")}
                  <input
                    className={procurementCompactFieldClass}
                    value={form.supplierBanking[k] || ""}
                    onChange={(e) => set({ supplierBanking: { ...form.supplierBanking, [k]: e.target.value } })}
                  />
                </label>
              ))}
              <label className={`${procurementCompactLabelClass} sm:col-span-2`}>
                Bank address
                <input
                  className={procurementCompactFieldClass}
                  value={form.supplierBanking.address || ""}
                  onChange={(e) => set({ supplierBanking: { ...form.supplierBanking, address: e.target.value } })}
                />
              </label>
            </section>
          </fieldset>
      ) : null}

      {showTermsField ? (
        <TermsConditionsField
          value={form.termsAndConditions}
          onChange={(termsAndConditions) => set({ termsAndConditions })}
        />
      ) : null}
      {showPfiFields && showNotesField ? (
        <label className={`${procurementCompactLabelClass} block`}>
          Notes
          <textarea
            className={procurementCompactFieldClass}
            rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </label>
      ) : null}
    </section>
  );
}
