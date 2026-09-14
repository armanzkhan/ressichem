import countryNames from "./countries.json";

/** ISO country names (English), sorted A–Z */
export const COUNTRIES: string[] = countryNames;

export function filterCountries(query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES.slice(0, limit);
  return COUNTRIES.filter((c) => c.toLowerCase().includes(q)).slice(0, limit);
}
