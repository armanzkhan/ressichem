import type { MouseEvent } from "react";

const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, label, [data-no-row-click]";

/** Returns true when the click target is a button, link, form control, etc. */
export function isInteractiveRowClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

/** Run row action unless the user clicked an interactive child element. */
export function onQcDataRowClick(event: MouseEvent, handler: () => void): void {
  if (isInteractiveRowClick(event.target)) return;
  handler();
}

/** Shared list-row styling for clickable QC Site data rows. */
export function qcDataRowClassName(selected = false, extra = ""): string {
  const base =
    "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-500";
  const selectedCls = selected
    ? " bg-sky-50/90 dark:bg-sky-950/35 ring-1 ring-inset ring-sky-200 dark:ring-sky-800"
    : "";
  return [base, selectedCls, extra].filter(Boolean).join(" ");
}
