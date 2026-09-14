/**
 * Dynamically determines the backend URL based on the current hostname.
 * This allows the app to work when accessed from different machines on the network.
 * For Vercel deployment, uses the deployed backend URL.
 */

const DEFAULT_BACKEND_PORT = "5000";

function parseUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

function isPrivateLanHost(host: string): boolean {
  return (
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

/** Prefer backend on the same machine the browser used to open the app (avoids stale .env LAN IPs). */
function backendUrlForBrowserPage(): string | null {
  if (typeof window === "undefined") return null;

  const pageHost = window.location.hostname;
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";

  if (isLoopbackHost(pageHost)) {
    return `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
  }

  if (isPrivateLanHost(pageHost)) {
    return `${protocol}//${pageHost}:${DEFAULT_BACKEND_PORT}`;
  }

  return null;
}

function envBackendUrl(): string | null {
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || null;
}

function shouldIgnoreEnvForBrowser(envUrl: string): boolean {
  if (typeof window === "undefined") return false;

  const pageHost = window.location.hostname;
  const envHost = parseUrlHostname(envUrl);
  if (!envHost) return false;

  // Opening the app on localhost should not call a remote LAN IP from .env.local.
  if (isLoopbackHost(pageHost) && !isLoopbackHost(envHost)) {
    console.warn(
      `[getBackendUrl] Ignoring env API URL (${envUrl}) while frontend runs on ${pageHost}; using local backend.`
    );
    return true;
  }

  // On a LAN IP, ignore a different stale LAN IP in env (e.g. 192.168.13.154 vs .166).
  if (isPrivateLanHost(pageHost) && isPrivateLanHost(envHost) && envHost !== pageHost) {
    console.warn(
      `[getBackendUrl] Ignoring stale env API host ${envHost}; using ${pageHost}:${DEFAULT_BACKEND_PORT}.`
    );
    return true;
  }

  // Network access must not use localhost from env.
  if (!isLoopbackHost(pageHost) && isLoopbackHost(envHost)) {
    console.warn("[getBackendUrl] Ignoring localhost API URL for network access.");
    return true;
  }

  return false;
}

export function getBackendUrl(): string {
  const envUrl = envBackendUrl();
  if (envUrl) {
    if (typeof window !== "undefined") {
      if (!shouldIgnoreEnvForBrowser(envUrl)) {
        console.log("[getBackendUrl] Using env API URL:", envUrl);
        return envUrl;
      }
    } else {
      console.log("[getBackendUrl] Using env API URL:", envUrl);
      return envUrl;
    }
  }

  const browserUrl = backendUrlForBrowserPage();
  if (browserUrl) {
    console.log("[getBackendUrl] Using browser-derived URL:", browserUrl);
    return browserUrl;
  }

  const isVercelDeployment =
    typeof window !== "undefined"
      ? window.location.hostname.includes("vercel.app") || window.location.hostname.includes("vercel.com")
      : process.env.VERCEL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;

  if (isVercelDeployment && !envUrl) {
    console.warn(
      "[getBackendUrl] Using hardcoded backend URL. Set NEXT_PUBLIC_BACKEND_URL in Vercel environment variables."
    );
    const url = "https://mern-stack-dtgy.vercel.app";
    console.log("[getBackendUrl] Vercel deployment detected, using backend URL:", url);
    return url;
  }

  console.log("[getBackendUrl] Server-side fallback to 127.0.0.1:5000");
  return `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
}

/** Resolve backend URL for Next.js API routes (uses request Host when env points at localhost). */
export function getBackendUrlFromRequestHost(hostHeader?: string | null): string {
  const envUrl = envBackendUrl();
  const hostname = hostHeader?.split(":")[0];
  if (hostname && !isLoopbackHost(hostname)) {
    if (!envUrl || isLoopbackHost(parseUrlHostname(envUrl) || "")) {
      return `http://${hostname}:${DEFAULT_BACKEND_PORT}`;
    }
    const envHost = parseUrlHostname(envUrl);
    if (envHost && isPrivateLanHost(hostname) && isPrivateLanHost(envHost) && envHost !== hostname) {
      return `http://${hostname}:${DEFAULT_BACKEND_PORT}`;
    }
  }
  return envUrl || `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
}
