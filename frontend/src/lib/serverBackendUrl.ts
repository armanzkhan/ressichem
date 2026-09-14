import type { NextRequest } from "next/server";

function preferIpv4Loopback(url: string): string {
  // On Windows, "localhost" often resolves to ::1. Another process can bind IPv6 :5000
  // while the real Express API listens on 0.0.0.0:5000 only — causing false 404s.
  return url.replace(/^(https?:\/\/)localhost(?=:|\/|$)/i, "$1127.0.0.1");
}

/** Backend URL for Next.js API route proxies (server-side fetch). */
export function getServerBackendUrl(request?: NextRequest): string {
  const envUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

  if (request) {
    const host = request.headers.get("host")?.split(":")[0];
    const isLanHost = host && host !== "localhost" && host !== "127.0.0.1";
    const envIsLocal = !envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1");
    if (isLanHost && envIsLocal) {
      return `http://${host}:5000`;
    }
  }

  return preferIpv4Loopback(envUrl || "http://127.0.0.1:5000");
}
