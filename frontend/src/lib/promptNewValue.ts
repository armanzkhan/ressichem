/** Prompt user to enter a new dropdown value (payment term, unit, etc.) */
export function promptNewValue(label: string): string | null {
  const raw = window.prompt(`Enter new ${label}:`);
  const trimmed = raw?.trim();
  return trimmed || null;
}
