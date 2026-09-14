import isoToDialCode from "./isoToDialCode.json";
import { getCountryCode } from "./countryCodes";

const dialMap = isoToDialCode as Record<string, string>;

/** E.164 country calling code for a country name (e.g. Pakistan → +92). */
export function getCountryDialCode(countryName: string): string {
  const iso = getCountryCode(countryName);
  if (!iso) return "";
  const digits = dialMap[iso];
  return digits ? `+${digits}` : "";
}
