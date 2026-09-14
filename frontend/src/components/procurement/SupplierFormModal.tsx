"use client";

import React, { useCallback, useMemo, useState } from "react";
import { procurementApi, type ProcurementSupplier } from "@/lib/procurementApi";
import {
  incoTermsForScope,
  LOCAL_SRB_RATES,
  optionsWithCurrent,
  paymentTermsForScope,
  type ProcurementTradeScope,
} from "@/lib/procurementOptions";
import { CurrencySelect } from "@/components/procurement/CurrencySelect";
import { TermSelect } from "@/components/procurement/TermSelect";
import { AddableSelect } from "@/components/procurement/AddableSelect";
import { getCountryCode } from "@/lib/countryCodes";
import { getCountryDialCode } from "@/lib/countryDialCodes";
import { CountryCombobox } from "@/components/procurement/CountryCombobox";
import { Field, FormLabel, Modal, procurementControlClass, procurementLabelClass } from "@/components/procurement/procurement-ui";

export type SupplierFormState = {
  name: string;
  companyName: string;
  contactName: string;
  email: string;
  mobile: string;
  phone: string;
  address: string;
  country: string;
  countryCode: string;
  phoneDialCode: string;
  defaultCurrency: string;
  paymentTerms: string;
  leadTimeDays: string;
  incoTerm: string;
  hsCode: string;
  taxId: string;
  strn: string;
  incomeTaxExemption: string;
  srb: string;
  banking: {
    bankName: string;
    accountNo: string;
    swift: string;
    branch: string;
    address: string;
  };
};

export function emptySupplierForm(section?: "local" | "import"): SupplierFormState {
  const base: SupplierFormState = {
    name: "",
    companyName: "",
    contactName: "",
    email: "",
    mobile: "",
    phone: "",
    address: "",
    country: "",
    countryCode: "",
    phoneDialCode: "",
    defaultCurrency: "USD",
    paymentTerms: "",
    leadTimeDays: "0",
    incoTerm: "",
    hsCode: "",
    taxId: "",
    strn: "",
    incomeTaxExemption: "",
    srb: "",
    banking: {
      bankName: "",
      accountNo: "",
      swift: "",
      branch: "",
      address: "",
    },
  };
  if (section === "local") {
    base.country = "Pakistan";
    base.countryCode = "PK";
    base.phoneDialCode = "+92";
    base.defaultCurrency = "PKR";
  }
  return base;
}

export function supplierRecordToForm(
  r: ProcurementSupplier,
  section?: "local" | "import"
): SupplierFormState {
  const scope: ProcurementTradeScope = section === "local" ? "local" : "import";
  const paymentOptions = paymentTermsForScope(scope);
  const incoOptions = incoTermsForScope(scope);
  const paymentTerms = r.paymentTerms || "";
  const incoTerm = r.incoTerm || "";
  return {
    ...emptySupplierForm(section),
    name: r.name || "",
    companyName: r.companyName || "",
    contactName: r.contactName || "",
    email: r.email || "",
    mobile: r.mobile || (r.phone && !r.mobile ? r.phone : ""),
    phone: r.mobile ? r.phone || "" : "",
    address: r.address || r.street || "",
    country: r.country || "",
    countryCode: r.countryCode || getCountryCode(r.country || ""),
    phoneDialCode: r.phoneDialCode || getCountryDialCode(r.country || ""),
    defaultCurrency: r.defaultCurrency || "USD",
    paymentTerms: paymentOptions.includes(paymentTerms as (typeof paymentOptions)[number])
      ? paymentTerms
      : "",
    leadTimeDays: String(r.leadTimeDays ?? 0),
    incoTerm: incoOptions.includes(incoTerm as (typeof incoOptions)[number]) ? incoTerm : "",
    hsCode: r.hsCode || "",
    taxId: r.taxId || "",
    strn: r.strn || "",
    incomeTaxExemption: r.incomeTaxExemption || "",
    srb: r.srb || "",
    banking: {
      bankName: r.banking?.bankName || "",
      accountNo: r.banking?.accountNo || "",
      swift: r.banking?.swift || "",
      branch: r.banking?.branch || "",
      address: r.banking?.address || "",
    },
  };
}

type Props = {
  section: "local" | "import";
  onClose: () => void;
  onSaved: (supplier: ProcurementSupplier) => void;
  editingId?: string | null;
  editingCode?: string;
  initialForm?: SupplierFormState;
  wide?: boolean;
  stacked?: boolean;
  title?: string;
};

export function SupplierFormModal({
  section,
  onClose,
  onSaved,
  editingId = null,
  editingCode = "",
  initialForm,
  wide = true,
  stacked = false,
  title,
}: Props) {
  const tradeScope: ProcurementTradeScope = section === "local" ? "local" : "import";
  const paymentTermOptions = paymentTermsForScope(tradeScope);
  const incoTermOptions = incoTermsForScope(tradeScope);
  const isLocal = section === "local";
  const [form, setForm] = useState<SupplierFormState>(initialForm || emptySupplierForm(section));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resolvedCountryCode = getCountryCode(form.country);
  const resolvedPhoneDialCode = getCountryDialCode(form.country);
  const srbRateOptions = useMemo(
    () => optionsWithCurrent([...LOCAL_SRB_RATES], form.srb),
    [form.srb]
  );

  const updateForm = useCallback((patch: Partial<SupplierFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        companyName: isLocal ? "" : form.companyName,
        hsCode: form.hsCode || "",
        countryCode: resolvedCountryCode,
        phoneDialCode: resolvedPhoneDialCode,
        leadTimeDays: Number(form.leadTimeDays) || 0,
        street: form.address,
      };
      const res = editingId
        ? await procurementApi.updateSupplier(editingId, payload)
        : await procurementApi.createSupplier(payload);
      const supplier = (res as { data?: ProcurementSupplier }).data;
      if (!supplier?._id) {
        setError("Supplier was not saved. Please try again.");
        return;
      }
      onSaved(supplier);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      wide={wide}
      stacked={stacked}
      title={title ?? (editingId ? "Edit supplier" : "Add supplier")}
      onClose={onClose}
    >
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
        {editingId ? (
          <FormLabel className="sm:col-span-2">
            Supplier code
            <input
              readOnly
              value={editingCode}
              className={`${procurementControlClass} mt-1 bg-blue-50`}
            />
          </FormLabel>
        ) : (
          <p className="text-sm text-blue-600 sm:col-span-2">
            Supplier code will be assigned automatically (e.g. SUP-2026-00001).
          </p>
        )}
        <Field label="Supplier name" value={form.name} onChange={(v) => updateForm({ name: v })} required />
        {!isLocal ? (
          <Field
            label="Company"
            value={form.companyName}
            onChange={(v) => updateForm({ companyName: v })}
            placeholder="Registered company name"
          />
        ) : null}
        <Field label="Contact person" value={form.contactName} onChange={(v) => updateForm({ contactName: v })} />
        <Field label="Email" value={form.email} onChange={(v) => updateForm({ email: v })} />
        <Field label="Mobile no." value={form.mobile} onChange={(v) => updateForm({ mobile: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => updateForm({ phone: v })} />
        <Field
          label="Address"
          value={form.address}
          onChange={(v) => updateForm({ address: v })}
          multiline
          rows={2}
          placeholder="Street, city, postal code"
        />
        <CountryCombobox
          value={form.country}
          onChange={(country) =>
            updateForm({
              country,
              countryCode: getCountryCode(country),
              phoneDialCode: getCountryDialCode(country),
            })
          }
        />
        <Field
          label="Phone dial code"
          value={resolvedPhoneDialCode}
          onChange={() => {}}
          disabled
          placeholder="Auto from country (e.g. +92, +971, +1)"
        />
        <FormLabel>
          Default currency
          <CurrencySelect value={form.defaultCurrency} onChange={(defaultCurrency) => updateForm({ defaultCurrency })} />
        </FormLabel>
        <FormLabel>
          Payment terms
          <div className="mt-1">
            <TermSelect
              value={form.paymentTerms}
              onChange={(paymentTerms) => updateForm({ paymentTerms })}
              options={paymentTermOptions}
              placeholder="Select payment terms"
              scopedOnly
              allowAdd={!isLocal}
              addLabel="+ Add payment term…"
            />
          </div>
        </FormLabel>
        <Field label="Lead time (days)" value={form.leadTimeDays} onChange={(v) => updateForm({ leadTimeDays: v })} type="number" />
        <FormLabel>
          {isLocal ? "Delivery term" : "Incoterm"}
          <div className="mt-1">
            <TermSelect
              value={form.incoTerm}
              onChange={(incoTerm) => updateForm({ incoTerm })}
              options={incoTermOptions}
              placeholder={isLocal ? "Select delivery term" : "Select incoterm"}
              scopedOnly
              allowAdd={!isLocal}
              addLabel="+ Add incoterm…"
            />
          </div>
        </FormLabel>
        {isLocal ? (
          <>
            <p className={`${procurementLabelClass} sm:col-span-2`}>Tax &amp; registration (Pakistan)</p>
            <Field label="NTN" value={form.taxId} onChange={(v) => updateForm({ taxId: v })} placeholder="e.g. 1234567-8" />
            <Field label="STRN" value={form.strn} onChange={(v) => updateForm({ strn: v })} placeholder="e.g. 17-00-1234-567-89" />
            <Field
              label="Income tax exemption"
              value={form.incomeTaxExemption}
              onChange={(v) => updateForm({ incomeTaxExemption: v })}
              placeholder="Certificate no. or exemption status"
            />
            <FormLabel>
              SRB
              <div className="mt-1">
                <AddableSelect
                  value={form.srb}
                  onChange={(srb) => updateForm({ srb })}
                  options={srbRateOptions.map((rate) => ({ value: rate, label: rate }))}
                  placeholder="Select SRB rate"
                />
              </div>
            </FormLabel>
          </>
        ) : null}
        <p className={`${procurementLabelClass} sm:col-span-2`}>Banking (for PFI / PO)</p>
        <Field
          label="Bank name"
          value={form.banking.bankName}
          onChange={(v) => setForm((prev) => ({ ...prev, banking: { ...prev.banking, bankName: v } }))}
        />
        <Field
          label="Account no."
          value={form.banking.accountNo}
          onChange={(v) => setForm((prev) => ({ ...prev, banking: { ...prev.banking, accountNo: v } }))}
        />
        <Field
          label="SWIFT"
          value={form.banking.swift}
          onChange={(v) => setForm((prev) => ({ ...prev, banking: { ...prev.banking, swift: v } }))}
        />
        <Field
          label="Branch"
          value={form.banking.branch}
          onChange={(v) => setForm((prev) => ({ ...prev, banking: { ...prev.banking, branch: v } }))}
        />
        <Field
          label="Bank address"
          value={form.banking.address}
          onChange={(v) => setForm((prev) => ({ ...prev, banking: { ...prev.banking, address: v } }))}
        />
        <footer className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
            {saving ? "Saving..." : editingId ? "Save" : "Add supplier"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
