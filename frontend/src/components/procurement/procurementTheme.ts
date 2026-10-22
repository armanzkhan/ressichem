/** Shared light + dark Tailwind classes for the procurement module */

export const procurementPanelClass =
  "bg-white/95 border border-blue-100/80 text-blue-800 shadow-sm shadow-blue-900/5 dark:bg-slate-900/95 dark:border-slate-700 dark:text-blue-100 dark:shadow-none";

export const procurementControlClass =
  "w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm text-blue-900 placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-blue-50 disabled:text-blue-600 dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50 dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/40 dark:disabled:bg-slate-800 dark:disabled:text-slate-400";

export const procurementFieldClass = `mt-1 ${procurementControlClass}`;

export const procurementCompactControlClass =
  "w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm text-blue-900 placeholder:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-blue-50 disabled:text-blue-600 dark:border-slate-600 dark:bg-slate-950 dark:text-blue-50 dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/40 dark:disabled:bg-slate-800 dark:disabled:text-slate-400";

export const procurementCompactFieldClass = `mt-0.5 ${procurementCompactControlClass}`;

export const procurementCompactLabelClass =
  "text-xs block text-blue-800 font-medium dark:text-blue-200";

export const procurementFieldsetClass =
  "border border-blue-200 rounded-lg p-3 bg-white dark:border-slate-600 dark:bg-slate-900/80";

export const procurementLegendClass =
  "text-sm font-medium px-1 text-blue-700 dark:text-blue-300";

export const procurementHintClass = "text-xs text-blue-600 dark:text-blue-300";

export const procurementLabelClass =
  "text-sm block text-blue-800 font-medium dark:text-blue-200";

export const procurementReadonlyClass = "bg-blue-50 dark:bg-slate-800 dark:text-blue-100";

export const procurementSecondaryButtonClass =
  "inline-flex items-center justify-center min-h-11 px-4 py-2.5 rounded-lg border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-slate-600 dark:text-blue-200 dark:hover:bg-slate-800";
