import { getBackendUrl } from "./getBackendUrl";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const companyId =
    typeof window !== "undefined" ? localStorage.getItem("company_id") || "RESSICHEM" : "RESSICHEM";
  const headers: HeadersInit = { "x-company-id": companyId };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim());
    } catch {
      /* ignore */
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() || fallback;
}

/** Authenticated file download (xlsx/csv/etc). */
export async function downloadProcurementFile(apiPath: string, fallbackName: string) {
  const res = await fetch(`${getBackendUrl()}${apiPath}`, { headers: authHeaders() });
  if (!res.ok) {
    let message = "Download failed";
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
