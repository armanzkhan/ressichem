import countryNameToCode from "./countryNameToCode.json";

/** ISO 3166-1 alpha-2 code for a country name from countries.json */
export function getCountryCode(countryName: string): string {
  const trimmed = countryName?.trim();
  if (!trimmed) return "";
  const map = countryNameToCode as Record<string, string>;
  if (map[trimmed]) return map[trimmed];
  const lower = trimmed.toLowerCase();
  const match = Object.keys(map).find((name) => name.toLowerCase() === lower);
  return match ? map[match] : "";
}
