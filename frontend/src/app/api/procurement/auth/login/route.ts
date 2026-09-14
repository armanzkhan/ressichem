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

    const response = await fetch(`${apiBase}/api/procurement/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-company-id": companyId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend API - /api/procurement/auth/login error:", error);
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot reach the backend server. Start the backend on port 5000 (npm run dev in the backend folder).",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: false, message: "Procurement login failed" }, { status: 500 });
  }
}
