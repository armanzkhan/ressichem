"use client";

import { procurementPanelClass } from "@/components/procurement/procurementTheme";

const sections = [
  {
    title: "Departments and factories",
    body: "Epoxy production is ZRS. Drymix, Formulation (LMS), and Packing (BFS) each have their own log. Every record is for Hub, SITE, or Lahore. ZRS, LMS, and Drymix share one production structure. BFS is the packing log. Grades for ZRS are the approved resin and hardener list. LMS, Drymix, and BFS grades come from the product range, and a user may type a grade or reactor that is not on the list.",
  },
  {
    title: "What is entered on this screen",
    body: "Date, factory, grade, batch, reactor (ZRS), planned and actual kilograms, shift, start and end time, operator, supervisor, machine, temperature, mixing time, recipe revision, wastage, rejected quantity, rework, downtime and the reason, deviation, and opening and closing work-in-progress. Packing also takes resin batch, hardener batch, kit size, and kit quantity. Output kilograms for packing are calculated as kit size times kit quantity and are not typed.",
  },
  {
    title: "What will come from Laboratory",
    body: "Batch test result, specification check, laboratory report reference, and QC approval or rejection. Until the laboratory system is connected, those fields are recorded on the batch and marked as laboratory data. The daily report counts batches still pending laboratory approval.",
  },
  {
    title: "What will come from SAP",
    body: "Material code, warehouse issue quantity, supplier, and finished-goods inventory movement. Until SAP is connected, material name, code, lot, quantity issued and consumed, supplier, and incoming QC are entered on the batch. Consumption on the daily report is the sum of those lines.",
  },
  {
    title: "Daily production report",
    body: "The report groups the saved logs by date, factory, department, grade, shift, and machine. It shows opening and closing WIP, planned quantity, production quantity, packing quantity, raw-material consumption, rejected quantity, wastage, rework, downtime, pending laboratory approvals, yield against plan, and the operators on that group.",
  },
  {
    title: "Traceability",
    body: "A finished-batch search returns the production record, the material lots consumed, process notes, laboratory status, and any packing rows that used that resin or hardener batch. A raw-material lot search returns every production batch and packed kit that recorded that lot.",
  },
];

export default function ProductionRequirementsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">Production requirements</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          How this module records a daily production report across ZRS, Drymix, LMS, and Packing at Hub, SITE, and Lahore.
        </p>
      </div>
      {sections.map((section) => (
        <article key={section.title} className={`${procurementPanelClass} p-4`}>
          <h3 className="font-semibold text-blue-950 dark:text-blue-50">{section.title}</h3>
          <p className="mt-2 text-sm leading-6 text-blue-900 dark:text-blue-100">{section.body}</p>
        </article>
      ))}
    </div>
  );
}
