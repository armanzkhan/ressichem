import { NextRequest, NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/serverBackendUrl";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiBase = getServerBackendUrl(request);
    const companyId = body.company_id || "RESSICHEM";
    const payload = {
      ...body,
      email: String(body.email || "").trim().toLowerCase(),
      company_id: companyId,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(`${apiBase}/api/production/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": companyId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend API - /api/production/auth/signup error:", error);
    if ((error as { name?: string })?.name === "AbortError") {
      return NextResponse.json(
        { success: false, message: "Signup timed out. The backend or database is not responding." },
        { status: 504 }
      );
    }
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        { success: false, message: "Cannot reach the backend server. Start the backend, then try again." },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: false, message: "Production signup failed" }, { status: 500 });
  }
}
