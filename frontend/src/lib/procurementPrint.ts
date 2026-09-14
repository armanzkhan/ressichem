import { getBackendUrl } from "./getBackendUrl";

export async function openProcurementPrint(apiPath: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "RESSICHEM" : "RESSICHEM";
  const headers: HeadersInit = { "x-company-id": companyId };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getBackendUrl()}${apiPath}`, { headers });
  if (!res.ok) throw new Error("Could not load printable document");
  const html = await res.text();
  const w = window.open("", "_blank");
  if (!w) throw new Error("Allow pop-ups to print");
  w.document.write(html);
  w.document.close();
}
