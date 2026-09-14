import { NextRequest, NextResponse } from "next/server";
import { getBackendUrlFromRequestHost } from "@/lib/getBackendUrl";

export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = getBackendUrlFromRequestHost(request.headers.get("host"));
    const body = await request.json();

    const companyId = body.company_id || "RESSICHEM";
    const payload = {
      ...body,
      email: String(body.email || "").trim().toLowerCase(),
      company_id: companyId,
    };

    const response = await fetch(`${API_BASE_URL}/api/qc/auth/site-login`, {
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
    console.error("Frontend API - /api/qc/auth/site-login error:", error);
    return NextResponse.json({ success: false, message: "QC Site login failed" }, { status: 500 });
  }
}


