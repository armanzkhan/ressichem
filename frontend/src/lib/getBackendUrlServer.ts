/**
 * Server-side function to get the backend URL.
 * This is used in Next.js API routes (server-side only).
 * Prefer getServerBackendUrl(request) when a request is available.
 */
export function getBackendUrlServer(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/^(https?:\/\/)localhost(?=:|\/|$)/i, "$1127.0.0.1");
  }

  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/^(https?:\/\/)localhost(?=:|\/|$)/i, "$1127.0.0.1");
  }

  if ((process.env.VERCEL || process.env.VERCEL_URL) && !process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_API_URL) {
    console.warn("Using hardcoded backend URL. Please set NEXT_PUBLIC_BACKEND_URL in Vercel environment variables.");
    return "https://mern-stack-dtgy.vercel.app";
  }

  return "http://127.0.0.1:5000";
}
