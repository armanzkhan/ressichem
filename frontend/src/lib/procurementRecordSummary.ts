/** "1 supplier" / "65 suppliers" with optional filtered hint */
export function recordTotalLabel(count: number, singular: string, plural?: string, filtered = false): string {
  const word = count === 1 ? singular : plural || `${singular}s`;
  const base = `${count.toLocaleString()} ${word}`;
  return filtered ? `${base} (filtered)` : base;
}

/** Append unique-name count when it differs from row count (duplicate names in list). */
export function recordTotalWithUniqueNames(
  rows: { name?: string }[],
  singular: string,
  plural?: string,
  filtered = false
): string {
  const total = rows.length;
  const unique = new Set(rows.map((r) => (r.name || "").trim().toUpperCase()).filter(Boolean)).size;
  const base = recordTotalLabel(total, singular, plural, filtered);
  if (unique > 0 && unique !== total) {
    return `${base} · ${unique.toLocaleString()} unique ${unique === 1 ? "name" : "names"}`;
  }
  return base;
}
