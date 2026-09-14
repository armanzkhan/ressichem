"use client";

import React from "react";

export type ShipmentTrackingFormValues = {
  customer: string;
  lcNumber: string;
  lcIssueDate: string;
  lcExpiryDate: string;
  lcAmendment1: string;
  lcAmendment2: string;
  lcAmendment3: string;
  vesselName: string;
  ets: string;
  eta: string;
  docsDispatchDate: string;
  docsReceiveDate: string;
  dhlNumber: string;
};

export function emptyShipmentTrackingForm(): ShipmentTrackingFormValues {
  return {
    customer: "",
    lcNumber: "",
    lcIssueDate: "",
    lcExpiryDate: "",
    lcAmendment1: "",
    lcAmendment2: "",
    lcAmendment3: "",
    vesselName: "",
    ets: "",
    eta: "",
    docsDispatchDate: "",
    docsReceiveDate: "",
    dhlNumber: "",
  };
}

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function shipmentRecordToForm(
  record: {
    customer?: { _id?: string } | string;
    lcNumber?: string;
    lcIssueDate?: string;
    lcExpiryDate?: string;
    lcAmendment1?: string;
    lcAmendment2?: string;
    lcAmendment3?: string;
    vesselName?: string;
    ets?: string;
    eta?: string;
    docsDispatchDate?: string;
    docsReceiveDate?: string;
    dhlNumber?: string;
  },
  customerId: string
): ShipmentTrackingFormValues {
  return {
    customer: customerId,
    lcNumber: record.lcNumber || "",
    lcIssueDate: toDateInput(record.lcIssueDate),
    lcExpiryDate: toDateInput(record.lcExpiryDate),
    lcAmendment1: record.lcAmendment1 || "",
    lcAmendment2: record.lcAmendment2 || "",
    lcAmendment3: record.lcAmendment3 || "",
    vesselName: record.vesselName || "",
    ets: toDateInput(record.ets),
    eta: toDateInput(record.eta),
    docsDispatchDate: toDateInput(record.docsDispatchDate),
    docsReceiveDate: toDateInput(record.docsReceiveDate),
    dhlNumber: record.dhlNumber || "",
  };
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex justify-center py-3">
      <span className="inline-block rounded-full border-2 border-blue-600 px-6 py-1 text-sm font-bold tracking-wide uppercase text-blue-700 dark:border-blue-400 dark:text-blue-200">
        {title}
      </span>
    </div>
  );
}

function PaperField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const isDate = type === "date";
  const inputClassName = isDate
    ? "w-full min-w-0 bg-white border-0 border-b-2 border-blue-400 px-1 py-1.5 text-sm text-center text-blue-900 focus:outline-none focus:border-blue-600 accent-blue-600 dark:bg-slate-950 dark:border-blue-500 dark:text-blue-50 dark:focus:border-blue-400 dark:accent-blue-400 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:[filter:invert(31%)_sepia(98%)_saturate(2476%)_hue-rotate(203deg)_brightness(93%)_contrast(95%)] dark:[&::-webkit-calendar-picker-indicator]:invert"
    : "w-full min-w-0 bg-white border-0 border-b-2 border-blue-400 px-1 py-1.5 text-sm text-center text-blue-900 focus:outline-none focus:border-blue-600 dark:bg-slate-950 dark:border-blue-500 dark:text-blue-50 dark:focus:border-blue-400";

  return (
    <td className="w-1/3 align-top px-3 py-4 border-r border-blue-200 last:border-r-0 dark:border-slate-600">
      <label className="block text-center">
        <span className="block text-sm font-semibold mb-3 whitespace-nowrap text-blue-700 dark:text-blue-200">{label}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClassName} />
      </label>
    </td>
  );
}

function FormTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full table-fixed border-collapse">
      <tbody>{children}</tbody>
    </table>
  );
}

function FormRow({ children, withTopBorder }: { children: React.ReactNode; withTopBorder?: boolean }) {
  return (
    <tr className={withTopBorder ? "border-t border-blue-200 dark:border-slate-600" : undefined}>{children}</tr>
  );
}

type Props = {
  form: ShipmentTrackingFormValues;
  onChange: (form: ShipmentTrackingFormValues) => void;
  customerField: React.ReactNode;
};

export function ShipmentTrackingPaperForm({ form, onChange, customerField }: Props) {
  const set = (key: keyof ShipmentTrackingFormValues, value: string) => onChange({ ...form, [key]: value });

  return (
    <article className="rounded-xl border-2 border-blue-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-600 dark:bg-slate-900/80">
      <div className="mb-6 text-blue-800 dark:text-blue-100 [&_label]:text-blue-800 [&_label]:font-semibold dark:[&_label]:text-blue-200 [&_input]:text-blue-900 [&_input]:border-blue-300 dark:[&_input]:text-blue-50 dark:[&_input]:border-slate-600 [&_button]:text-blue-700 dark:[&_button]:text-blue-200">
        {customerField}
      </div>

      <SectionHeader title="Shipment" />
      <FormTable>
        <FormRow>
          <PaperField label="Vessel Name" value={form.vesselName} onChange={(v) => set("vesselName", v)} />
          <PaperField label="ETS" type="date" value={form.ets} onChange={(v) => set("ets", v)} />
          <PaperField label="ETA" type="date" value={form.eta} onChange={(v) => set("eta", v)} />
        </FormRow>
      </FormTable>

      <div className="border-b border-blue-200 my-2 dark:border-slate-600" />

      <SectionHeader title="Documents" />
      <FormTable>
        <FormRow>
          <PaperField label="Dispatch Date" type="date" value={form.docsDispatchDate} onChange={(v) => set("docsDispatchDate", v)} />
          <PaperField label="Receive Date" type="date" value={form.docsReceiveDate} onChange={(v) => set("docsReceiveDate", v)} />
          <PaperField label="D.H.L. No." value={form.dhlNumber} onChange={(v) => set("dhlNumber", v)} />
        </FormRow>
      </FormTable>
    </article>
  );
}
